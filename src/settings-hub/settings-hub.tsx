import "./settings-hub.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";

import { CommonServiceIds, getClient, IProjectPageService } from "azure-devops-extension-api";
import { CoreRestClient } from "azure-devops-extension-api/Core";
import { GetFieldsExpand, WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";

import { Card } from "azure-devops-ui/Card";
import { Checkbox } from "azure-devops-ui/Checkbox";
import { ObservableArray } from "azure-devops-ui/Core/Observable";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { FormItem } from "azure-devops-ui/FormItem";
import { CustomHeader, HeaderTitle, HeaderTitleArea, HeaderTitleRow, TitleSize } from "azure-devops-ui/Header";
import { HeaderCommandBar, IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { Page } from "azure-devops-ui/Page";
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";

import { BranchNameTemplateValidator } from "../branchNameTemplateValidator";
import SettingsDocument from "../settingsDocument";
import { StorageService } from "../storage-service";
import { Constants } from "../constants";

interface ISettingsHubState {
    initialSettingsDocument: SettingsDocument | undefined;
    updatedSettingsDocument: SettingsDocument;
    isReady: boolean;
    isTemplateInvalid: boolean;
    defaultBranchNameTemplateErrorMessages: string[];
    errorMessages: Record<string, string[]>;
    workItemTypes: string[];
    workItemFieldNames: string[];
}


class SettingsHub extends React.Component<{}, ISettingsHubState> {
    private branchNameTemplateValidator = new BranchNameTemplateValidator();
    private nonAlphanumericCharactersReplacementSelectionOptions = new ObservableArray<IListBoxItem<string>>();
    private nonAlphanumericCharactersReplacementSelection = new DropdownSelection();

    constructor(props: {}) {
        super(props);
        this.state = {
            initialSettingsDocument: undefined,
            updatedSettingsDocument: {
                id: "",
                defaultBranchNameTemplate: "",
                branchNameTemplates: {},
                lowercaseBranchName: false,
                nonAlphanumericCharactersReplacement: ""
            },
            isReady: false,
            isTemplateInvalid: false,
            defaultBranchNameTemplateErrorMessages: [],
            errorMessages: {},
            workItemTypes: [],
            workItemFieldNames: []
        };
    }

    public componentDidMount() {
        SDK.init();
        SDK.ready().then(async () => {
            const storageService = new StorageService();
            const settingsDocument = await storageService.getSettings();
            const workItemTypes = await this.getWorkItemTypes();
            const workItemFieldNames = await this.getWorkItemFieldNames();

            workItemTypes.forEach(workItemType => {
                if (!(workItemType in settingsDocument.branchNameTemplates)) {
                    settingsDocument.branchNameTemplates[workItemType] = {
                        isActive: false,
                        value: Constants.DefaultBranchNameTemplate
                    };
                }
            });

            this.setState(prevState => ({
                ...prevState,
                initialSettingsDocument: settingsDocument,
                updatedSettingsDocument: settingsDocument,
                workItemTypes: workItemTypes,
                workItemFieldNames: workItemFieldNames,
                isReady: true
            }))

            this.loadNonAlphanumericCharactersReplacementSelectionOptions();
        });
    }

    public render(): JSX.Element {
        return (
            <Page>
                <CustomHeader className="bolt-header-with-commandbar">
                    <HeaderTitleArea>
                        <HeaderTitleRow>
                            <HeaderTitle ariaLevel={3} className="text-ellipsis" titleSize={TitleSize.Large}>
                                Easy Branch Creator
                            </HeaderTitle>
                        </HeaderTitleRow>
                    </HeaderTitleArea>
                    <HeaderCommandBar items={this.getCommandBarItems()} />
                </CustomHeader>
                <div className="page-content">
                    <Card className="flex-grow margin-bottom-16" titleProps={{ text: "Template Branch name", ariaLevel: 3 }}>
                        <form>
                            <FormItem
                                label="Template"
                                message={this.getErrorMessageElement(this.state.defaultBranchNameTemplateErrorMessages)}
                                error={this.state.isTemplateInvalid}
                                className="margin-bottom-8">
                                <TextField
                                    value={this.state.updatedSettingsDocument.defaultBranchNameTemplate}
                                    disabled={!this.state.isReady}
                                    onChange={(e, newValue) => {
                                        const validateBranchNameTemplateResult = this.branchNameTemplateValidator.validateBranchNameTemplate(newValue, this.state.workItemFieldNames);
                                        this.setState(prevState => ({
                                            ...prevState,
                                            updatedSettingsDocument: {
                                                ...prevState.updatedSettingsDocument,
                                                defaultBranchNameTemplate: newValue
                                            },
                                            defaultBranchNameTemplateErrorMessages: validateBranchNameTemplateResult.errorMessages,
                                            isTemplateInvalid: !validateBranchNameTemplateResult.isValid
                                        }))
                                    }}
                                    width={TextFieldWidth.standard}
                                />
                            </FormItem>
                            <div className="margin-left-16">
                                <div className="margin-top-16 margin-bottom-8">
                                    <span>Template Overrides</span>
                                </div>
                                {
                                    this.state.workItemTypes.map(workItemType => {
                                        return (
                                            <FormItem
                                                key={workItemType}
                                                message={this.getErrorMessageElement(this.state.errorMessages[workItemType])}
                                                error={this.state.isTemplateInvalid}
                                                className="margin-bottom-8">
                                                <Checkbox
                                                    label={workItemType}
                                                    checked={this.state.updatedSettingsDocument.branchNameTemplates[workItemType].isActive}
                                                    disabled={!this.state.isReady}
                                                    onChange={(event, checked) => {
                                                        this.setState(prevState => ({
                                                            ...prevState,
                                                            updatedSettingsDocument: {
                                                                ...prevState.updatedSettingsDocument,
                                                                branchNameTemplates: {
                                                                    ...prevState.updatedSettingsDocument.branchNameTemplates,
                                                                    [workItemType]: {
                                                                        ...prevState.updatedSettingsDocument.branchNameTemplates[workItemType],
                                                                        isActive: checked
                                                                    }
                                                                }
                                                            },
                                                        }))
                                                    }}
                                                />
                                                {this.state.updatedSettingsDocument.branchNameTemplates[workItemType].isActive ?
                                                    <TextField
                                                        value={this.state.updatedSettingsDocument.branchNameTemplates[workItemType].value}
                                                        disabled={!this.state.isReady}
                                                        onChange={(e, newValue) => {
                                                            const validateBranchNameTemplateResult = this.branchNameTemplateValidator.validateBranchNameTemplate(newValue, this.state.workItemFieldNames);
                                                            this.setState(prevState => ({
                                                                ...prevState,
                                                                updatedSettingsDocument: {
                                                                    ...prevState.updatedSettingsDocument,
                                                                    branchNameTemplates: {
                                                                        ...prevState.updatedSettingsDocument.branchNameTemplates,
                                                                        [workItemType]: {
                                                                            ...prevState.updatedSettingsDocument.branchNameTemplates[workItemType],
                                                                            value: newValue
                                                                        }
                                                                    }
                                                                },
                                                                errorMessages: {
                                                                    ...prevState.errorMessages,
                                                                    [workItemType]: validateBranchNameTemplateResult.errorMessages
                                                                },
                                                                isTemplateInvalid: !validateBranchNameTemplateResult.isValid
                                                            }))
                                                        }}
                                                        width={TextFieldWidth.standard}
                                                    />
                                                    : null}
                                            </FormItem>
                                        )
                                    })
                                }
                            </div>
                        </form>
                    </Card>
                    <Card className="flex-grow">
                        <form>
                            <FormItem label="Non-alphanumeric characters replacement">
                                <Dropdown
                                    ariaLabel="Non-alphanumeric characters replacement"
                                    placeholder="Select an Option"
                                    disabled={!this.state.isReady}
                                    items={this.nonAlphanumericCharactersReplacementSelectionOptions}
                                    selection={this.nonAlphanumericCharactersReplacementSelection}
                                    onSelect={(event: React.SyntheticEvent<HTMLElement>, item: IListBoxItem<string>) => {
                                        this.setState(prevState => ({
                                            ...prevState,
                                            updatedSettingsDocument: {
                                                ...prevState.updatedSettingsDocument,
                                                nonAlphanumericCharactersReplacement: item.id,
                                            }
                                        }))
                                    }}
                                />
                            </FormItem>
                            <FormItem className="margin-top-8">
                                <Checkbox
                                    label="Lowercase branch name"
                                    checked={this.state.updatedSettingsDocument.lowercaseBranchName}
                                    disabled={!this.state.isReady}
                                    onChange={(event, checked) => {
                                        this.setState(prevState => ({
                                            ...prevState,
                                            updatedSettingsDocument: {
                                                ...prevState.updatedSettingsDocument,
                                                lowercaseBranchName: checked,
                                            }
                                        }))
                                    }}
                                />
                            </FormItem>
                        </form>
                    </Card>
                </div>
            </Page>
        );
    }

    private getErrorMessageElement(errorMessages: string[]): React.ReactNode {
        if (errorMessages === undefined || errorMessages.length === 0) {
            return null;
        }
        return (
            <ul className="margin-bottom-16">
                {
                    errorMessages.map((x, index) => {
                        return <li key={index}>{x}</li>
                    })
                }
            </ul>
        );
    }

    private getCommandBarItems(): IHeaderCommandBarItem[] {
        return [
            {
                id: "save",
                text: "Save",
                onActivate: () => {
                    this.save()
                },
                disabled: this.isSettingsDocumentEqual(this.state.initialSettingsDocument, this.state.updatedSettingsDocument) || this.state.isTemplateInvalid,
                iconProps: {
                    iconName: 'Save'
                },
                isPrimary: true
            }
        ];
    }

    private isSettingsDocumentEqual(initialSettingsDocument: SettingsDocument | undefined, updatedSettingsDocument: SettingsDocument): boolean {
        if (initialSettingsDocument === undefined) {
            return true;
        }

        if (initialSettingsDocument.defaultBranchNameTemplate !== updatedSettingsDocument.defaultBranchNameTemplate ||
            initialSettingsDocument.lowercaseBranchName !== updatedSettingsDocument.lowercaseBranchName ||
            initialSettingsDocument.nonAlphanumericCharactersReplacement !== updatedSettingsDocument.nonAlphanumericCharactersReplacement) {
            return false;
        }

        for (const workItemType in initialSettingsDocument.branchNameTemplates) {
            if (!(workItemType in updatedSettingsDocument.branchNameTemplates) ||
                updatedSettingsDocument.branchNameTemplates[workItemType].isActive !== initialSettingsDocument.branchNameTemplates[workItemType].isActive ||
                updatedSettingsDocument.branchNameTemplates[workItemType].value !== initialSettingsDocument.branchNameTemplates[workItemType].value) {
                return false;
            }
        };

        return true;
    }

    private loadNonAlphanumericCharactersReplacementSelectionOptions() {
        this.nonAlphanumericCharactersReplacementSelectionOptions.push(...Constants.NonAlphanumericCharactersReplacementSelectionOptions.map(t => { return { id: t.id, data: t.id, text: t.text } }));

        const index = Constants.NonAlphanumericCharactersReplacementSelectionOptions.findIndex(x => x.id === this.state.updatedSettingsDocument.nonAlphanumericCharactersReplacement)
        this.nonAlphanumericCharactersReplacementSelection.select(index >= 0 ? index : 0);
    }

    private async getWorkItemTypes(): Promise<string[]> {
        const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();
        if (project) {
            const workItemTrackingRestClient = getClient(WorkItemTrackingRestClient);
            const workItemTypeCategories = await workItemTrackingRestClient.getWorkItemTypeCategories(project.name);
            const hiddenCategories = workItemTypeCategories.find(x => x.referenceName === "Microsoft.HiddenCategory");
            if (hiddenCategories) {
                return workItemTypeCategories
                    .map(x => x.workItemTypes)
                    .reduce(function (a, b) { return a.concat(b); }, [])
                    .filter(x => hiddenCategories.workItemTypes.findIndex(t => t.name === x.name) === -1)
                    .map((x) => x.name)
                    .sort();
            }
        }

        return [];
    }

    private async getWorkItemFieldNames(): Promise<string[]> {
        const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();
        const workItemTrackingRestClient = getClient(WorkItemTrackingRestClient);
        if (project) {
            const workItemFields = await workItemTrackingRestClient.getFields(project.name, GetFieldsExpand.ExtensionFields);
            return workItemFields.map((x) => x.referenceName);
        }

        return [];
    }

    private async save() {
        const storageService = new StorageService();
        let settingsDocument: SettingsDocument = await storageService.getSettings();
        const updatedSettingsDocument = await storageService.setSettings({
            ...this.state.updatedSettingsDocument,
            id: settingsDocument.id,
            __etag: settingsDocument.__etag
        });
        this.setState(prevState => ({
            ...prevState,
            initialSettingsDocument: updatedSettingsDocument,
            isDirty: false
        }))
    }
}

ReactDOM.render(<SettingsHub />, document.getElementById("root"));
