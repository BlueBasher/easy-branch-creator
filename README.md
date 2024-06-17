# easy-branch-creator
Use Easy Branch Creator in Azure DevOps to create branches directly from within workitems using fields from the workitem for the branch name.

## Overview
When you want to create a new branch, it is often good to have a branch naming convention in place. With the convention in place, branches are more structure and it's easier to find the correct branch. You can group branches also in subfolders based on a category like *feature* or *bugfix*.
In Azure DevOps you often create a branch on the basis of a workitem and then use some information from the workitem for the name of the branch. To be able to do so, you often need to copy several fields of the workitem to construct the actual branch name.

### Create branch
The `easy-branch-creator` is an extension for Azure DevOps that eases this process. `easy-branch-creator` adds a menu action on a workitem to automatically create a branch using fields from the given workitem.
When clicking the actions, `easy-branch-creator` will create a new branch, using the configured naming convention, based on the default branch.

![Create Branch Screen Shot][create-branch-action]

### Settings
`easy-branch-creator` can be configured in several ways. The settings can be found in `Project Settings` under the `Extensions` section.
- Template Branch Name
  - This is the template being used to create the branch name. The template can use **any** field from a workitem plus the following ones:
    - `SourceBranchName`: The name of the selected source branch.
    - `SourceBranchNameWithReplacement`: The name of the selected source branch with all non alpha numerical characters are replaced.
    - `SourceBranchNameTail`: The part after the last `/` of source branch name. If source branch doesn't contain a `/` the full name is used.
  - Validation is in place to ensure a valid template is entered.
- Non-alphanumeric characters replacement
  - Any non-alphanumeric character in a workitem field will be replaced by this character.
- Lowercase branch name
  - When checked, the entire branch name will be lowercased.
- Update workitem state
  - If enabled for a workitem type, when creating a new branch, the workitem is also updated to the selected state.

![Settings][settings]

[create-branch-action]: marketplace/create-branch-action.png
[settings]: marketplace/settings.png
