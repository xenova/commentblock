

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


const COMMENT_TAG = 'YTD-COMMENT-RENDERER';
const COMMENT_THREAD_TAG = 'YTD-COMMENT-THREAD-RENDERER';
const COMMENT_TEXT = 'yt-formatted-string#content-text.ytd-comment-renderer';

(() => {

    // TODO allow user to select what to remove

    // observe changes on the page, comments are loaded separately so we need this to wait for them
    let observer = new MutationObserver((mutations) => {
        mutations.forEach(async (mutation) => {
            // A child node has been added.
            if (mutation.addedNodes.length === 0) return;

            // For optimisation purposes, YouTube doesn't remove-then-insert new comments.
            // Instead, they replace content of existing elmenets on the page.
            // For this reason, we have to listen for changes to the actual text content
            // of the comment, then crawl back up to the actual comment element.
            // This is especially needed when sorting by recent

            if (!mutation.target.matches(COMMENT_TEXT)) return;

            let comment = mutation.target.closest(COMMENT_TAG);
            if (comment === null) return;
            processComment(comment);

        })
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
})();

let PREDICTION_CACHE = {};

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
            let overlay = document.createElement('div');
            overlay.className = 'blurred-comment-overlay';

            comment.append(overlay);

        } else {
            console.log(`Unknown action: ${action}`)
        }
    } else {
        // Reset
        if (comment.parentElement.tagName === COMMENT_THREAD_TAG) {
            show(comment.parentElement);
        } else {
            show(comment);
        }

        // Remove blurred overlay if present
        let overlay = comment.querySelector('div.blurred-comment-overlay');
        if (overlay) overlay.remove();


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
    let useML = await getSetting('use-ml');
    if (useML) {
        // Do another check to determine whether the rules missed it
        let model = await ModelFactory.getInstance();
        prediction = await model.predict(comment.data.author_name, comment.data.text);
    }

    return prediction;

}
