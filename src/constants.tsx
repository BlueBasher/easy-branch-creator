import SettingsDocument from "./settingsDocument";

export class Constants {
    public static DefaultSettingsDocument: SettingsDocument = {
        branchNameTemplate: "feature/${System.Id}-${System.Title}",
        nonAlphanumericCharactersReplacement: "_",
        lowercaseBranchName: false,
        id: ""
    };

    public static NonAlphanumericCharactersReplacementSelectionOptions = [
        { id: "_", text: "_" },
        { id: "-", text: "-" }
    ];

}