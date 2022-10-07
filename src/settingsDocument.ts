export default interface SettingsDocument {
    __etag?: string;
    id: string;
    branchNameTemplate: string;
    nonAlphanumericCharactersReplacement: string;
    lowercaseBranchName: boolean;
}