(function () {
    var acc = document.getElementsByClassName("top");
    var i;

    for (i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') {
                // Using checkbox
                return;
            }
            this.classList.toggle("active");
            var panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }
}());

function resetSettings() {
    // https://developer.chrome.com/extensions/storage#method-StorageArea-clear
    chrome.storage.local.set(DEFAULT_OPTIONS)
    updateUIFromStorage();

}

function updateUIFromStorage() {
    document.querySelectorAll('input[setting]').forEach(async function (i) {
        let setting = await getSetting(i.id)

        if (i.type === 'checkbox') {
            i.checked = setting;
        } else {
            alert(`Undefined input type: ${i.type}`)
        }
    });

    document.querySelectorAll('select').forEach(async function (i) {
        let setting = await getSetting(i.id)
        i.value = setting;
    });
}
document.addEventListener('DOMContentLoaded', function () {
    updateUIFromStorage();

    document.getElementById('reset').addEventListener('click', resetSettings)

    document.querySelectorAll('input[setting]').forEach(async function (i) {
        i.addEventListener('input', function (e) {
            chrome.storage.local.set({ [i.id]: i.checked });
        });
    })
    document.querySelectorAll('select').forEach(async function (i) {
        i.addEventListener('change', function (e) {
            chrome.storage.local.set({ [i.id]: i.value });
        });
    })

}, false);



// chrome.storage.onChanged.addListener(function (changes, namespace) {
//     for (var key in changes) {
//         var storageChange = changes[key];
//         console.log('Storage key "%s" in namespace "%s" changed. ' + 'Old value was "%s", new value is "%s".', key, namespace, storageChange.oldValue, storageChange.newValue);
//     }
// });
