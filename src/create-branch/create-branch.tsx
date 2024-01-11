import * as SDK from "azure-devops-extension-sdk";
import { ILocationService, CommonServiceIds, IProjectPageService, IProjectInfo, IHostPageLayoutService } from "azure-devops-extension-api";
import { CoreRestClient } from "azure-devops-extension-api/Core";

import { BranchCreator } from "../branch-creator";
import { ISelectBranchDetailsResult } from "../select-branch-details/select-branch-details";

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
            const hostBaseUrl = await service.getResourceAreaLocation(CoreRestClient.RESOURCE_AREA_ID);
            const host = SDK.getHost();
            const gitBaseUrl = `${hostBaseUrl}${(hostBaseUrl.toLowerCase().indexOf(host.name.toLowerCase()) == -1 ? `${host.name}/` : "")}${project.name}/_git`;

            const branchCreator = new BranchCreator();
            const dialogService = await SDK.getService<IHostPageLayoutService>(CommonServiceIds.HostPageLayoutService);
            const workItems = getWorkItemIds(actionContext);
            dialogService.openCustomDialog<ISelectBranchDetailsResult | undefined>(SDK.getExtensionContext().id + ".select-branch-details", {
                title: "Select Branch Details",
                lightDismiss: false,
                configuration: {
                    projectName: project.name,
                    workItems: workItems
                },
                onClose: (result: ISelectBranchDetailsResult | undefined) => {
                    if (result !== undefined && result.repositoryId !== undefined && result.repositoryName !== undefined) {
                        workItems.forEach((id: number) => {
                            branchCreator.createBranch(id, result.repositoryId!, result.repositoryName!, project, gitBaseUrl);
                        });
                    }
                }
            });
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
