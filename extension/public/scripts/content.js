

const LABEL_RULES_MAPPING = {
    // prediction: rule | [rules]
    // if any of the rules is enabled, 
    [COMMENT_LABEL.SCAM]: "rules-enabled-scam",
    [COMMENT_LABEL.EXPLICIT]: "rules-enabled-explicit",
    [COMMENT_LABEL.LINK_SPAM]: ["rules-links-spam", "rules-links-contains"],
    [COMMENT_LABEL.LINK_ONLY]: ["rules-links-only", "rules-links-contains"],
    [COMMENT_LABEL.LINK_CONTAINS]: "rules-links-contains",
    [COMMENT_LABEL.SELF_PROMO]: "rules-enabled-selfpromo",
    [COMMENT_LABEL.OTHER_PROMO]: "rules-enabled-otherpromo",
    [COMMENT_LABEL.SPONSOR]: "rules-enabled-sponsor",
    [COMMENT_LABEL.OTHER_SPAM]: "rules-enabled-spam",
}

const BLURRED_COMMENT_OVERLAY_CLASS = 'blurred-comment-overlay'

const LISTBOX_SELECTOR = 'tp-yt-paper-listbox#items.ytd-menu-popup-renderer';
const LISTBOX_TEXT_SELECTOR = 'yt-formatted-string.ytd-menu-service-item-renderer';

const COMMENT_TAG = 'YTD-COMMENT-RENDERER';
const COMMENT_THREAD_TAG = 'YTD-COMMENT-THREAD-RENDERER';
const COMMENT_TEXT = 'yt-formatted-string#content-text.ytd-comment-renderer';

const MENU_ITEM = htmlToElement(
    `<ytd-menu-service-item-renderer class="style-scope ytd-menu-popup-renderer" use-icons="" system-icons="" role="menuitem" tabindex="-1" aria-selected="false">
        <tp-yt-paper-item class="style-scope ytd-menu-service-item-renderer" style-target="host" role="option" tabindex="0" aria-disabled="false">
            <yt-icon class="style-scope ytd-menu-service-item-renderer"></yt-icon>
            <yt-formatted-string class="style-scope ytd-menu-service-item-renderer"></yt-formatted-string>
            <ytd-badge-supported-renderer class="style-scope ytd-menu-service-item-renderer" disable-upgrade="" hidden=""></ytd-badge-supported-renderer>
        </tp-yt-paper-item>
    </ytd-menu-service-item-renderer>`
);


let PREDICTION_CACHE = {};
let focusedComment = null;

(() => {

    // TODO allow user to select what to remove

    // observe changes on the page, comments are loaded separately so we need this to wait for them
    let observer = new MutationObserver((mutations) => {
        mutations.forEach(async (mutation) => {
            if (mutation.removedNodes.length > 0) {
                let listbox;
                if (mutation.target.matches(LISTBOX_SELECTOR)) {
                    listbox = mutation.target;
                } else if (mutation.target.matches(LISTBOX_TEXT_SELECTOR)) {
                    listbox = mutation.target.closest(LISTBOX_SELECTOR);
                }

                if (listbox && listbox.childNodes.length == 3) {
                    addHideOption(listbox);
                }

            } else if (mutation.addedNodes.length > 0 && mutation.target.matches(COMMENT_TEXT)) { // is a comment
                // For optimisation purposes, YouTube doesn't remove-then-insert new comments.
                // Instead, they replace content of existing elmenets on the page.
                // For this reason, we have to listen for changes to the actual text content
                // of the comment, then crawl back up to the actual comment element.
                // This is especially needed when sorting by recent
                let comment = mutation.target.closest(COMMENT_TAG);
                if (comment === null) return;
                processComment(comment);
            }
        })
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
})();

function addBlur(commentElement) {
    if (isBlurred(commentElement)) return; // Do nothing if already blurred

    let overlay = document.createElement('div');
    overlay.className = BLURRED_COMMENT_OVERLAY_CLASS;
    commentElement.querySelector('#body').append(overlay);
}

function getBlur(commentElement) {
    return commentElement.querySelector(`div.${BLURRED_COMMENT_OVERLAY_CLASS}`);
}

function isBlurred(commentElement) {
    return getBlur(commentElement) !== null;
}

function removeBlur(commentElement) {
    let overlay = getBlur(commentElement);
    if (overlay) overlay.remove();
}

function addHideOption(listbox) {
    // TODO: Add option to hide comments?
    // let commentIsBlurred = isBlurred(focusedComment);

    let elem = MENU_ITEM.cloneNode();
    listbox.appendChild(elem)

    elem.addEventListener('click', (e) => {
        removeBlur(focusedComment);

        // Simulate click elsewhere to unfocus
        document.body.click();
    })

    // Must do it this way for some reason?
    // YouTube seems to override yt-icon when appending?
    elem.querySelector('yt-icon').innerHTML =
        `<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon" style="pointer-events: none; display: block; width: 100%; height: 100%;">
            <g class="style-scope yt-icon">
            <path d="M12 15.15q1.525 0 2.588-1.063 1.062-1.062 1.062-2.587 0-1.525-1.062-2.588Q13.525 7.85 12 7.85q-1.525 0-2.587 1.062Q8.35 9.975 8.35 11.5q0 1.525 1.063 2.587Q10.475 15.15 12 15.15Zm0-.95q-1.125 0-1.912-.788Q9.3 12.625 9.3 11.5t.788-1.913Q10.875 8.8 12 8.8t1.913.787q.787.788.787 1.913t-.787 1.912q-.788.788-1.913.788Zm0 3.8q-3.25 0-5.925-1.762-2.675-1.763-4-4.738 1.325-2.975 4-4.738Q8.75 5 12 5t5.925 1.762q2.675 1.763 4 4.738-1.325 2.975-4 4.738Q15.25 18 12 18Zm0-6.5Zm0 5.5q2.825 0 5.188-1.488Q19.55 14.025 20.8 11.5q-1.25-2.525-3.612-4.013Q14.825 6 12 6 9.175 6 6.812 7.487 4.45 8.975 3.2 11.5q1.25 2.525 3.612 4.012Q9.175 17 12 17Z" class="style-scope yt-icon"></path>
            </g>
        </svg>`;

    // visibility off
    // https://fonts.google.com/icons?icon.query=show

    // Add text
    let t = elem.querySelector('yt-formatted-string');
    t.removeAttribute('is-empty');
    t.textContent = 'Show';
}

async function processComment(comment) {

    let commentURL = new URL(comment.querySelector('.published-time-text > a').href)
    let commentID = commentURL.searchParams.get('lc')

    // if (commentID !== '') return;

    if (PREDICTION_CACHE[commentID]) {
        if (PREDICTION_CACHE[commentID] !== 'PROCESSING') {
            action(comment, PREDICTION_CACHE[commentID]); // Re-run action
        } else {
            // Prediction is still running elsewhere, and will be updated there, so we ignore here.
        }
        return; // Either way, do not run prediction again
    }
    PREDICTION_CACHE[commentID] = 'PROCESSING';

    let authorData = comment.querySelector('#author-text');
    let authorName = authorData.innerText;
    let commentText = extractTextFromElement(comment.querySelector('#comment-content #content-text'));
    let authorChannelId = authorData.href.replace('https://www.youtube.com/channel/', '');


    // Add event listener to options
    let actionButton = comment.querySelector('#action-menu.ytd-comment-renderer button')
    if(actionButton !== null){
        actionButton.addEventListener('click', () => {
            focusedComment = comment;
        })
    }

    // Set data attributes
    comment.data = {
        author_name: authorName,
        author_channel_id: authorChannelId,
        text: commentText,
    }

    let prediction = await makePrediction(comment)
    PREDICTION_CACHE[commentID] = prediction;

    action(comment, prediction);
}

function extractTextFromElement(element) {
    let text = '';

    for (const child of element.childNodes) {
        if (child.nodeValue !== null) {
            text += child.nodeValue;
        } else {
            if (child.tagName === 'IMG') {
                text += child.alt;
            }
            text += extractTextFromElement(child);
        }
    }
    return text;
}

function show(element) {
    element.style.display = 'block';
}

function hide(element) {
    element.style.display = 'none';
}

async function action(comment, prediction) {

    // Check if the predicted category is enabled
    let rules = LABEL_RULES_MAPPING[prediction];
    let categoryEnabled;
    if (Array.isArray(rules)) {
        categoryEnabled = (await Promise.all(rules.map(rule => getSetting(rule)))).some(x => x)
    } else {
        categoryEnabled = await getSetting(rules);
    }

    if (categoryEnabled) {


        // Now, decide what action to perform
        let action = await getSetting('action');
        if (action === 'remove') {
            if (comment.parentElement.tagName === COMMENT_THREAD_TAG) {
                // Is a top-level comment, so we delete the whole thread
                // TODO add option for this
                hide(comment.parentElement);
            } else {
                // Is a reply, so we just delete the reply
                hide(comment);

                // TODO if it is the only reply, remove the "1 reply" text
            }

        } else if (action === 'blur') {
            // TODO improve blurring
            addBlur(comment);

        } else {
            console.error(`Unknown action: ${action}`)
        }
    } else {
        // Reset
        if (comment.parentElement.tagName === COMMENT_THREAD_TAG) {
            show(comment.parentElement);
        } else {
            show(comment);
        }

        // Remove blurred overlay if present
        removeBlur(comment);


    }

}


async function makePrediction(comment) {

    // TODO 1. access ban lists

    // 2. use rules

    let prediction = 'VALID'; // Assume comment is valid

    let useRules = await getSetting('use-rules');
    if (useRules) {

        // TODO perform rule-based detection here
        prediction = rule_detect(comment)
        if (prediction !== 'VALID') {
            // If rules detected something, no need to use ML
            // TODO sometimes rules are wrong, so, we should divide into
            // "maybe" and "definite" based on rules
            return prediction;
        }
    }

    // COMING SOON:
    // let useML = await getSetting('use-ml');
    // if (useML) {
    //     // Do another check to determine whether the rules missed it
    //     let model = await ModelFactory.getInstance();
    //     prediction = await model.predict(comment.data.author_name, comment.data.text);
    // }

    return prediction;

}
