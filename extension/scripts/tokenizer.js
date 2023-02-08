"use strict";

class WordPieceTokenizer {
    constructor() {
        this.separator = '[SEP]';
        this.unknown_token = '[UNK]';
    }
    async load(vocabUrl) {

        let v = await this.loadVocab(vocabUrl);

        this.vocabMapping = v.model.vocab;

        let tempVocab = {};
        // Reverse vocab
        for (const [key, value] of Object.entries(this.vocabMapping)) {
            tempVocab[parseInt(value)] = key;
        }

        this.vocab = Object.values(tempVocab)
    }
    async loadVocab(url) {
        const response = await fetch(url);
        return await response.json();
    }

    normalize(string) {
        return normalize(string)
    }

    pretokenize(text) {
        return text.trim().match(/\b\w+\b|[^\s\w]/g) || [];
    }
    tokenize(text) {
        var outputTokens = [];

        // whitespace_tokenize
        let tokens = this.pretokenize(text);

        for (let token of tokens) {
            let chars = [...token];
            // if len(chars) > self.max_input_chars_per_word:
            //     output_tokens.append(self.unk_token)
            //     continue

            let isUnknown = false;
            let start = 0;
            let subTokens = [];

            while (start < chars.length) {
                var end = chars.length;
                var currentSubstring = null;
                while (start < end) {
                    var substr = chars.slice(start, end).join('');

                    if (start > 0) {
                        substr = '##' + substr
                    }
                    if (this.vocab.includes(substr)) {
                        currentSubstring = substr;
                        break;
                    }

                    --end;
                }
                if (currentSubstring == null) {
                    isUnknown = true;
                    break;
                }
                subTokens.push(currentSubstring);
                start = end;
            }
            if (isUnknown) {
                outputTokens.push(this.unknown_token);
            } else {
                outputTokens = outputTokens.concat(subTokens);
            }
        }

        return outputTokens;
    }
    convert_tokens_to_ids(outputTokens) {
        // get ids
        let ids = [];
        for (let t of outputTokens) {
            ids.push(this.vocabMapping[t]);
        }
        return ids;
    }

    call(text) {
        return this.convert_tokens_to_ids(this.tokenize(text));
    }
}

