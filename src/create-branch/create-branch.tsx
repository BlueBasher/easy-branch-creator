import * as SDK from "azure-devops-extension-sdk";
import { getClient, ILocationService, CommonServiceIds, IProjectPageService, IProjectInfo, IHostPageLayoutService } from "azure-devops-extension-api";
import { CoreRestClient } from "azure-devops-extension-api/Core";
import { GitRestClient } from "azure-devops-extension-api/Git";

import { BranchCreator } from "../branch-creator";
import { ISelectRepositoryResult } from "../select-repository/select-repository";

function createBranchFromWorkItem() {
    "use strict";
    return {
        execute: async function (actionContext: any) {
            const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
            const project: IProjectInfo | undefined = await projectService.getProject();
            if (project === undefined) {
                console.warn("Project is unkown");
                return;
            }

            const service = await SDK.getService<ILocationService>(CommonServiceIds.LocationService);
            const hostBaseUrl = new URL(await service.getResourceAreaLocation(CoreRestClient.RESOURCE_AREA_ID));

            const branchCreator = new BranchCreator();
            const gitRestClient = getClient(GitRestClient);
            const repositories = await gitRestClient.getRepositories(project.name);
            if (repositories.length === 1) {
                getWorkItemIds(actionContext).forEach((id: number) => {
                    branchCreator.createBranch(id, repositories[0].id, repositories[0].name, project.name, hostBaseUrl);
                });
            }
            else {
                const dialogService = await SDK.getService<IHostPageLayoutService>(CommonServiceIds.HostPageLayoutService);
                dialogService.openCustomDialog<ISelectRepositoryResult | undefined>(SDK.getExtensionContext().id + ".select-repository", {
                    title: "Select Repository",
                    lightDismiss: false,
                    configuration: {
                        projectName: project.name
                    },
                    onClose: (result: ISelectRepositoryResult | undefined) => {
                        if (result !== undefined && result.repositoryId !== undefined && result.repositoryName !== undefined) {
                            getWorkItemIds(actionContext).forEach((id: number) => {
                                branchCreator.createBranch(id, result.repositoryId!, result.repositoryName!, project.name, hostBaseUrl);
                            });
                        }
                    }
                });
            }
        }
    }
};

function getWorkItemIds(actionContext: any): number[] {
    let workItemIds: number[] = [];

    workItemIds.push(actionContext.id);
    workItemIds.push(actionContext.workItemId);
    workItemIds = workItemIds.concat(actionContext.ids);
    workItemIds = workItemIds.concat(actionContext.workItemIds);

    return workItemIds.filter((x): x is number => x !== null && x !== undefined);
}

SDK.init();
SDK.ready().then(() => {
    let contribution = SDK.getContributionId();
    SDK.register(contribution, createBranchFromWorkItem);
});
