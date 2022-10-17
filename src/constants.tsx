import SettingsDocument from "./settingsDocument";

export class Constants {
    public static DefaultBranchNameTemplate: string = "feature/${System.Id}-${System.Title}";

    public static DefaultSettingsDocument: SettingsDocument = {
        defaultBranchNameTemplate: Constants.DefaultBranchNameTemplate,
        branchNameTemplates: {},
        nonAlphanumericCharactersReplacement: "_",
        lowercaseBranchName: false,
        id: ""
    };

    public static NonAlphanumericCharactersReplacementSelectionOptions = [
        { id: "_", text: "_" },
        { id: "-", text: "-" }
    ];

}