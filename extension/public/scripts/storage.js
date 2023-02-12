async function getSetting(name) {
    let result = await chrome.storage.local.get({
        [name]: DEFAULT_OPTIONS[name]
    })
    return result[name]
}
