import { Tokenizer } from "./tokenizer";

interface IValidateBranchNameTemplateResult {
    isValid: boolean;
    errorMessages: string[];
}

export class BranchNameTemplateValidator {
    public validateBranchNameTemplate(branchNameTemplate: string, workItemFieldNames: string[]): IValidateBranchNameTemplateResult {
        const tokenizer = new Tokenizer();

        if (!tokenizer.isValid(branchNameTemplate)) {
            return {
                isValid: false,
                errorMessages: ["The template is invalid."]
            };
        }

        const tokens = tokenizer.getTokens(branchNameTemplate);
        const numberOfStartTokens = (branchNameTemplate.match(/\${/g) || []).length;
        const numberOfEndTokens = (branchNameTemplate.match(/\}/g) || []).length;
        if (tokens.length !== numberOfStartTokens || numberOfStartTokens !== numberOfEndTokens) {
            return {
                isValid: false,
                errorMessages: ["The number of opening '${' and closing '}' tokens should be equal."]
            };
        }

        const unknownFields = this.getUnknownFields(tokens, workItemFieldNames);
        if (unknownFields.length > 0) {
            return {
                isValid: false,
                errorMessages: unknownFields.map(x => `WorkItem field '${x}' does not exists.`)
            };
        }

        return { isValid: true, errorMessages: [] };
    }

    private getUnknownFields(tokens: string[], workItemFieldNames: string[]): string[] {
        const allFieldNames = Object.assign([], workItemFieldNames)
        allFieldNames.push("SourceBranchName")
        allFieldNames.push("SourceBranchNameWithReplacement")
        allFieldNames.push("SourceBranchNameTail")
        const fieldNames = tokens.map(token => token.replace('${', '').replace('}', ''));
        return fieldNames.filter(x => allFieldNames.indexOf(x) === -1);
    }
}