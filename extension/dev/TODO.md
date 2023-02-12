## TODO (Upcoming features):

### 1. Add to manifest.json:
```
"web_accessible_resources": [{
    "resources": [
    "model/*",
    "ort-wasm-simd.wasm"
    ],
    "matches": [
    "*://*.youtube.com/*"
    ]
}],
...
"content_scripts": [{
    "js": [
        "scripts/defaults.js",
        "scripts/utils.js",
        "scripts/storage.js",
        "scripts/ort.js",
        "scripts/labels.js",
        "scripts/preprocess.js",
        "scripts/tokenizer.js",
        "scripts/model.js",
        "scripts/emojis.js",
        "scripts/detection.js",
        "scripts/content.js"
    ],
}],
```