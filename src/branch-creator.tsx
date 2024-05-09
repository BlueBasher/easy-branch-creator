import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, getClient, IGlobalMessagesService, IHostNavigationService, IProjectInfo } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient, WorkItemExpand, WorkItemRelation } from "azure-devops-extension-api/WorkItemTracking";
import { GitRestClient } from "azure-devops-extension-api/Git";
import { StorageService } from "./storage-service";
import { Tokenizer } from "./tokenizer";
import { JsonPatchOperation, Operation } from "azure-devops-extension-api/WebApi";
import SettingsDocument from "./settingsDocument";

export class BranchCreator {

    public async createBranch(workItemId: number, repositoryId: string, sourceBranchName: string, project: IProjectInfo, gitBaseUrl: string): Promise<void> {
        const navigationService = await SDK.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
        const globalMessagesSvc = await SDK.getService<IGlobalMessagesService>(CommonServiceIds.GlobalMessagesService);
        const gitRestClient = getClient(GitRestClient);
        const workItemTrackingRestClient = getClient(WorkItemTrackingRestClient);
        const storageService = new StorageService();
        const settingsDocument = await storageService.getSettings();

        const repository = await gitRestClient.getRepository(repositoryId, project.name);

        const branchName = await this.getBranchName(workItemTrackingRestClient, settingsDocument, workItemId, project.name, sourceBranchName);
        const branchUrl = `${gitBaseUrl}/${repository.name}?version=GB${encodeURI(branchName)}`;

        if (await this.branchExists(gitRestClient, repositoryId, project.name, branchName)) {
            console.info(`Branch ${branchName} aready exists in repository ${repository.name}`);

            globalMessagesSvc.addToast({
                duration: 3000,
                message: `Branch ${branchName} aready exists`,
                callToAction: "Open branch",
                onCallToActionClick: async () => {
                    navigationService.openNewWindow(branchUrl, "");
                }
            });
            return;
        }

        const branch = (await gitRestClient.getBranches(repositoryId, project.name)).find((x) => x.name === sourceBranchName);
        if (!branch) {
            console.warn(`Branch ${sourceBranchName} not found`);
            return;
        }

        await this.createRef(gitRestClient, repositoryId, branch.commit.commitId, branchName);
        await this.linkBranchToWorkItem(workItemTrackingRestClient, project.id, repositoryId, workItemId, branchName);
        await this.updateWorkItemState(workItemTrackingRestClient, settingsDocument, project.id, workItemId);
        console.log(`Branch ${branchName} created in repository ${repository.name}`);

        globalMessagesSvc.addToast({
            duration: 3000,
            message: `Branch ${branchName} created`
        });

        navigationService.openNewWindow(branchUrl, "");
    }

    public async getBranchName(workItemTrackingRestClient: WorkItemTrackingRestClient, settingsDocument: SettingsDocument, workItemId: number, project: string, sourceBranchName: string): Promise<string> {
        const workItem = await workItemTrackingRestClient.getWorkItem(workItemId, project, undefined, undefined, WorkItemExpand.Fields);
        const workItemType = workItem.fields["System.WorkItemType"];

        let branchNameTemplate = settingsDocument.defaultBranchNameTemplate;
        if (workItemType in settingsDocument.branchNameTemplates && settingsDocument.branchNameTemplates[workItemType].isActive) {
            branchNameTemplate = settingsDocument.branchNameTemplates[workItemType].value;
        }

        const tokenizer = new Tokenizer();
        const tokens = tokenizer.getTokens(branchNameTemplate);

        let branchName = branchNameTemplate;
        tokens.forEach((token) => {
            let workItemFieldName = token.replace('${', '').replace('}', '');
            let workItemFieldValue = ""
            if (workItemFieldName == "SourceBranchName") {
                workItemFieldValue = sourceBranchName
            }
            else if (workItemFieldName == "SourceBranchNameTail") {
                workItemFieldValue = sourceBranchName.replace(/.+\//, "")
            }
            else {
                workItemFieldValue = workItem.fields[workItemFieldName];
            }

            if (workItemFieldValue) {
                if (typeof workItemFieldValue.replace === 'function') {
                    workItemFieldValue = workItemFieldValue.replace(/[^a-zA-Z0-9]/g, settingsDocument.nonAlphanumericCharactersReplacement);
                }
            }
            branchName = branchName.replace(token, workItemFieldValue);
        });

        if (settingsDocument.lowercaseBranchName) {
            branchName = branchName.toLowerCase();
        }

        return branchName;
    }

    private async createRef(gitRestClient: GitRestClient, repositoryId: string, commitId: string, branchName: string): Promise<void> {
        const gitRefUpdate = {
            name: `refs/heads/${branchName}`,
            repositoryId: repositoryId,
            newObjectId: commitId,
            oldObjectId: "0000000000000000000000000000000000000000",
            isLocked: false
        };
        await gitRestClient.updateRefs([gitRefUpdate], repositoryId);
    }

    private async linkBranchToWorkItem(workItemTrackingRestClient: WorkItemTrackingRestClient, projectId: string, repositoryId: string, workItemId: number, branchName: string) {
        const branchRef = `${projectId}/${repositoryId}/GB${branchName}`;
        const relation: WorkItemRelation = {
            rel: "ArtifactLink",
            url: `vstfs:///Git/Ref/${encodeURIComponent(branchRef)}`,
            "attributes": {
                name: "Branch"
            }
        };
        const document: JsonPatchOperation[] = [
            {
                from: "",
                op: Operation.Add,
                path: "/relations/-",
                value: relation
            }
        ];
        await workItemTrackingRestClient.updateWorkItem(document, workItemId);
    }

    private async branchExists(gitRestClient: GitRestClient, repositoryId: string, project: string, branchName: string): Promise<boolean> {
        const branches = await gitRestClient.getRefs(repositoryId, project, `heads/${branchName}`);
        return branches.find((x) => x.name == `refs/heads/${branchName}`) !== undefined;
    }

    private async updateWorkItemState(workItemTrackingRestClient: WorkItemTrackingRestClient, settingsDocument: SettingsDocument, projectId: string, workItemId: number) {
        try {
            if (settingsDocument.updateWorkItemState) {
                const workItem = await workItemTrackingRestClient.getWorkItem(workItemId, projectId);
                const workItemType = workItem.fields["System.WorkItemType"];
                if (workItemType in settingsDocument.workItemState && settingsDocument.workItemState[workItemType].isActive) {
                    const newState = settingsDocument.workItemState[workItemType].value;
                    const document: JsonPatchOperation[] = [
                        {
                            from: "",
                            op: Operation.Add,
                            path: "/fields/System.State",
                            value: newState
                        }
                    ];
                    await workItemTrackingRestClient.updateWorkItem(document, workItemId);
                }
            }
        } catch (error) {
            console.warn("Update WorkItem State failed", error);
        }
    }
}