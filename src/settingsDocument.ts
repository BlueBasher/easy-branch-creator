export interface BranchNameTemplate {
    isActive: boolean;
    value: string;
}

export interface WorkItemStateSetting{
    isActive: boolean;
    value: string;
}

export default interface SettingsDocument {
    __etag?: string;
    id: string;
    defaultBranchNameTemplate: string;
    branchNameTemplates: Record<string, BranchNameTemplate>;
    nonAlphanumericCharactersReplacement: string;
    lowercaseBranchName: boolean;
    updateWorkItemState: boolean;
    workItemState: Record<string, WorkItemStateSetting>;
}