import "./select-repository.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";
import { getClient } from "azure-devops-extension-api";
import { GitRestClient } from "azure-devops-extension-api/Git";

import { Button } from "azure-devops-ui/Button";
import { ButtonGroup } from "azure-devops-ui/ButtonGroup";
import { EditableDropdown } from "azure-devops-ui/EditableDropdown";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { ObservableArray } from "azure-devops-ui/Core/Observable";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { ITableColumn, SimpleTableCell } from "azure-devops-ui/Table";
import { Icon } from "azure-devops-ui/Icon";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";
import { BranchCreator } from "../branch-creator";

export interface ISelectRepositoryResult {
    repositoryName?: string;
    repositoryId?: string;
}

interface ISelectRepositoryState {
    projectName?: string;
    workItems: number[];
    selectedValue?: string;
    ready: boolean;
    branchNames: string[];
}

class SelectRepositoryForm extends React.Component<{}, ISelectRepositoryState> {
    private repositories = new ObservableArray<IListBoxItem<string>>();
    private selection = new DropdownSelection();

    constructor(props: {}) {
        super(props);
        this.state = { workItems: [], branchNames: [], ready: false };
    }

    public componentDidMount() {
        SDK.init();

        SDK.ready().then(async () => {
            const config = SDK.getConfiguration();
            this.setState({ projectName: config.projectName, workItems: config.workItems, selectedValue: config.initialValue, ready: false, branchNames: [] });

            if (config.dialog) {
                SDK.resize();
            }

            await this.loadRepositories();
            await this.setBranchNames();
        });
    }

    public render(): JSX.Element {
        return (
            <div className="select-repository flex-column flex-grow">
                <EditableDropdown<string>
                    disabled={!this.state.ready}
                    items={this.repositories}
                    selection={this.selection}
                    onValueChange={(item?: IListBoxItem<string>) => {
                        this.setSelectedValue(item?.data);
                    }}
                    renderItem={(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<IListBoxItem<string>>, tableItem: IListBoxItem<string>) => {
                        return (
                            <SimpleTableCell
                                columnIndex={columnIndex}
                                key={tableItem.id}
                                tableColumn={tableColumn}
                            >
                                <div
                                    className="bolt-list-box-cell-container"
                                >
                                    <span className={"bolt-list-cell-text"}>
                                        <span className="text-ellipsis body-m">
                                            <Icon iconName="GitLogo" />
                                            {tableItem.text}
                                        </span>
                                    </span>
                                </div>
                            </SimpleTableCell>
                        );
                    }}
                />
                <div className="branchNames">
                    <p>Branch Name:</p>
                    <div>
                        <ul>
                            {this.state.branchNames.map(b => <li key={b}>{b}</li>)}
                        </ul>
                    </div>
                </div>
                <ButtonGroup className="select-repository-button-bar">
                    <Button
                        disabled={!this.state.selectedValue}
                        primary={true}
                        text="Create Branch"
                        onClick={() => this.close(this.state.selectedValue)}
                    />
                    <Button
                        text="Cancel"
                        onClick={() => this.close(undefined)}
                    />
                </ButtonGroup>
            </div>
        );
    }

    private close(repositoryId: string | undefined) {
        const result: ISelectRepositoryResult = {
            repositoryId: repositoryId,
            repositoryName: repositoryId ? this.repositories.value.find((x) => x.id === repositoryId)?.text : undefined
        };

        const config = SDK.getConfiguration();
        if (config.dialog) {
            config.dialog.close(result);
        }
    }

    private async loadRepositories() {
        const gitRestClient = getClient(GitRestClient);
        const repositories = await gitRestClient.getRepositories(this.state.projectName);
        this.repositories.push(...repositories.map(t => { return { id: t.id, data: t.id, text: t.name } }));

        if (!!!this.state.selectedValue && this.repositories.length > 0) {
            this.setSelectedValue(repositories[0].id);
            this.selection.select(0);
        }

        this.setState(prevState => ({
            ...prevState,
            ready: true
        }))
    }

    private setSelectedValue(repositoryId?: string) {
        this.setState(prevState => ({
            ...prevState,
            selectedValue: repositoryId
        }));
    }

    private async setBranchNames() {
        if (this.state.projectName) {
            const workItemTrackingRestClient = getClient(WorkItemTrackingRestClient);        
            const branchCreator = new BranchCreator();
            let branchNames: string[] = [];
            for await (const workItemId of this.state.workItems) {
                const branchName = await branchCreator.getBranchName(workItemTrackingRestClient, workItemId, this.state.projectName!);
                branchNames.push(branchName);
            }
            
            this.setState(prevState => ({
                ...prevState,
                branchNames: branchNames
            }));
        }
    }
}

ReactDOM.render(<SelectRepositoryForm />, document.getElementById("root"));