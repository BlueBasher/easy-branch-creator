export class Tokenizer {
    public isValid(branchNameTemplate: string) {
        const regex = /(\${([\w.]+)})/g;
        const result = regex.test(branchNameTemplate);
        return result;
    }

    public getTokens(branchNameTemplate: string): string[] {
        let tokens: string[] = [];
        const regex = /(\${([\w.]+)})/g;
        let m;
        while ((m = regex.exec(branchNameTemplate)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            m.forEach((match, groupIndex) => {
                if (groupIndex === 0) {
                    tokens.push(match);
                }
            });
        }

        return tokens;
    }

}