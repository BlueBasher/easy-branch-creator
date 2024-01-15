import * as React from "react";
import { getClient } from "azure-devops-extension-api";
import { GitRestClient } from "azure-devops-extension-api/Git";

import { EditableDropdown } from "azure-devops-ui/EditableDropdown";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { ObservableArray } from "azure-devops-ui/Core/Observable";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { ITableColumn, SimpleTableCell } from "azure-devops-ui/Table";
import { Icon } from "azure-devops-ui/Icon";

export interface IRepositorySelectProps {
    projectName?: string;
    onRepositoryChange: (newRepositoryId?: string) => void;
}

interface IRepositorySelectState {
    ready: boolean;
}

export class RepositorySelect extends React.Component<IRepositorySelectProps, IRepositorySelectState> {
    private repositories = new ObservableArray<IListBoxItem<string>>();
    private repositorySelection = new DropdownSelection();

    constructor(props: { onRepositoryChange: (newRepositoryId?: string) => void }) {
        super(props);
        this.state = { ready: false };
    }

    public async componentDidMount() {
        await this.loadRepositories();

        this.setState(prevState => ({
            ...prevState,
            ready: true
        }));
    }

    public async componentDidUpdate(prevProps: IRepositorySelectProps) {
        if (prevProps.projectName !== this.props.projectName) {
            await this.loadRepositories();
        }
    }

    public render(): JSX.Element {
        return (
            <div className="flex-column">
                <label className="bolt-formitem-label body-m">Repository</label>
                <EditableDropdown<string>
                    disabled={!this.state.ready}
                    items={this.repositories}
                    selection={this.repositorySelection}
                    onValueChange={(item?: IListBoxItem<string>) => {
                        this.setSelectedRepositoryId(item?.data);
                    }}
                    renderItem={(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<IListBoxItem<string>>, tableItem: IListBoxItem<string>) => {
                        return (
                            <SimpleTableCell
                                columnIndex={columnIndex}
                                key={tableItem.id}
                                tableColumn={tableColumn}
                            >
                                <div className="bolt-list-box-cell-container"
                                >
                                    <span className="bolt-list-cell-text">
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
            </div>
        );
    }

    private async loadRepositories() {
        if (!!!this.props.projectName) {
            return;
        }

        const gitRestClient = getClient(GitRestClient);
        const repositories = await gitRestClient.getRepositories(this.props.projectName);
        this.repositories.push(...repositories.map(t => { return { id: t.id, data: t.id, text: t.name } }));

        if (this.repositories.length > 0) {
            this.setSelectedRepositoryId(repositories[0].id);
            this.repositorySelection.select(0);
        }
    }

    private setSelectedRepositoryId(repositoryId?: string) {
        this.props.onRepositoryChange(repositoryId);
    }
}