import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, getClient, IGlobalMessagesService, IHostNavigationService } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient, WorkItemExpand } from "azure-devops-extension-api/WorkItemTracking";
import { GitRestClient } from "azure-devops-extension-api/Git";
import { StorageService } from "./storage-service";
import { Tokenizer } from "./tokenizer";

export class BranchCreator {

    public async createBranch(workItemId: number, repositoryId: string, repositoryName: string, project: string, hostBaseUrl: URL): Promise<void> {
        const host = SDK.getHost();
        const navigationService = await SDK.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
        const globalMessagesSvc = await SDK.getService<IGlobalMessagesService>(CommonServiceIds.GlobalMessagesService);
        const gitRestClient = getClient(GitRestClient);

        const branchName = await this.getBranchName(workItemId, project);
        const branchUrl = (hostBaseUrl.host.toLowerCase().indexOf(project.toLowerCase()) == -1 ? `/${host.name}` : "") + `/${project}/_git/${repositoryName}?version=GB${encodeURI(branchName)}`;

        if (await this.branchExists(gitRestClient, repositoryId, project, branchName)) {
            console.info(`Branch ${branchName} aready exists in repository ${repositoryName}`);

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

        const defaultBranch = (await gitRestClient.getBranches(repositoryId, project)).find((x) => x.isBaseVersion);
        if (!defaultBranch) {
            console.warn(`Default branch ${branchName} not found`);
            return;
        }

        await this.createRef(gitRestClient, repositoryId, defaultBranch.commit.commitId, branchName);
        console.log(`Branch ${branchName} created in repository ${repositoryName}`);

        globalMessagesSvc.addToast({
            duration: 3000,
            message: `Branch ${branchName} created`
        });

        navigationService.openNewWindow(branchUrl, "");
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

    private async branchExists(gitRestClient: GitRestClient, repositoryId: string, project: string, branchName: string): Promise<boolean> {
        const branches = await gitRestClient.getRefs(repositoryId, project, `heads/${branchName}`);
        return branches.find((x) => x.name == `refs/heads/${branchName}`) !== undefined;
    }

    private async getBranchName(workItemId: number, project: string): Promise<string> {
        const workItemTrackingRestClient = getClient(WorkItemTrackingRestClient);
        const workItem = await workItemTrackingRestClient.getWorkItem(workItemId, project, undefined, undefined, WorkItemExpand.Fields);

        const storageService = new StorageService();
        const settingsDocument = await storageService.getSettings();
        
        const tokenizer = new Tokenizer();
        const tokens = tokenizer.getTokens(settingsDocument.branchNameTemplate);

        let branchName = settingsDocument.branchNameTemplate;
        tokens.forEach((token) => {
            let workItemFieldValue = workItem.fields[token.replace('${', '').replace('}', '')];
            if (workItemFieldValue) {
                if (typeof workItemFieldValue.replace === 'function') {
                    workItemFieldValue = workItemFieldValue.replace(/[^a-zA-Z0-9]/g, settingsDocument.nonAlphanumericCharactersReplacement);
                }
            }
            branchName = branchName.replace(token, workItemFieldValue);
        });

        if (settingsDocument.lowercaseBranchName){
            branchName = branchName.toLowerCase();
        }

        return branchName;
    }
}