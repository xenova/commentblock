
let ModelFactory = (function () {
    // https://stackoverflow.com/a/4842961

    async function createModelPromise() {
        console.log('Start loading model');
        // Load the tokenizer and model.
        const tokenizerURL = chrome.runtime.getURL("model/tokenizer.json");
        const modelURL = chrome.runtime.getURL("model/model.onnx");
        
        let model = new Model(tokenizerURL, modelURL);
        await model.load() // Wait for model to load fully
        console.log('Model finished loading');
        return model
    }

    let instance;
    return {
        getInstance: async function () {
            if (instance == null) {
                instance = createModelPromise();
            }
            return await instance;
        }
    };
})();


class Model {
    constructor(tokenizerURL, modelURL) {
        this.tokenizerURL = tokenizerURL;
        this.modelURL = modelURL;
        this.labels = Object.values(COMMENT_LABEL)
    }
    async load() {
        // Load tokenizer
        let tokenizer = new WordPieceTokenizer()
        await tokenizer.load(this.tokenizerURL)

        this.tokenizer = tokenizer;

        // Load model
        let response = await fetch(this.modelURL, {
            cache: 'force-cache'
        });
        let modelBuffer = await response.arrayBuffer();
        this.session = await ort.InferenceSession.create(modelBuffer, {
            executionProviders: ["wasm"]
        });
    }

    create_model_input(encoded) {
        // TODO optimise this
        // Adapted from https://github.com/jobergum/browser-ml-inference/blob/main/src/inference.js
        // (https://www.youtube.com/watch?v=W_lUGPMW_Eg)

        var input_ids = new Array(encoded.length + 2);
        var attention_mask = new Array(encoded.length + 2);
        input_ids[0] = BigInt(101); // [CLS]
        attention_mask[0] = BigInt(1);
        var i = 0;
        for (; i < encoded.length; i++) {
            input_ids[i + 1] = BigInt(encoded[i]);
            attention_mask[i + 1] = BigInt(1);
        }
        input_ids[i + 1] = BigInt(102); // [SEP]
        attention_mask[i + 1] = BigInt(1);
        const sequence_length = input_ids.length;
        input_ids = new ort.Tensor('int64', BigInt64Array.from(input_ids), [1, sequence_length]);
        attention_mask = new ort.Tensor('int64', BigInt64Array.from(attention_mask), [1, sequence_length]);
        return {
            input_ids: input_ids,
            attention_mask: attention_mask
        }
    }
    preprocess(authorName, commentText) {
        // Normalise author name and comment text
        authorName = this.tokenizer.normalize(authorName);
        commentText = this.tokenizer.normalize(commentText);

        return `${authorName} commented ${commentText}`;

    }
    async predict(authorName, commentText) {
        let text = this.preprocess(authorName, commentText);
        // console.log('text', text)

        let encoded = this.tokenizer.call(text);

        let model_input = this.create_model_input(encoded);
        // console.log('model_input', model_input)
        let output = await this.session.run(model_input);

        // console.log('output.logits', output.logits.data)
        let maxIndex = indexOfMax(output.logits.data);
        // console.log('maxIndex', maxIndex)

        let prediction = this.labels[maxIndex]
        // console.log('prediction', prediction)
        return prediction;

    }
}

function indexOfMax(arr) {
    // https://stackoverflow.com/a/11301464

    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}
