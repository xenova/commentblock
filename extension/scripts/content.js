

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

(() => {
    // YTD-COMMENTS
    // YTD-COMMENTS-HEADER-RENDERER
    // YTD-COMMENT-SIMPLEBOX-RENDERER
    // 
    // YTD-COMMENT-REPLIES-RENDERER
    // YTD-COMMENT-RENDERER


    // TODO allow user to select what to remove

    // observe changes on the page, comments are loaded separately so we need this to wait for them
    let observer = new MutationObserver((mutations) => {
        mutations.forEach(async (mutation) => {
            // A child node has been added or removed.
            if (!mutation.addedNodes) return;

            if (mutation.target.tagName === COMMENT_TAG) {
                // When clicking show replies
                processComment(mutation.target);
            } else {
                // When loading for the first time, scrolling, or browsing
                // NOTE: (mutation.target.tagName === threadTag) is not enough
                // since when browsing on YouTube, this doesn't get added again.
                // Instead, we look for all comment renderers in the mutated object.

                for (let comment of mutation.target.getElementsByTagName(COMMENT_TAG)) {
                    processComment(comment);
                }
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

async function processComment(comment) {
    if (comment.hasAttribute('processed')) return;
    comment.setAttribute('processed', '')

    let commentURL = new URL(comment.querySelector('.published-time-text > a').href)
    let commentID = commentURL.searchParams.get('lc')
    // if (commentID !== '') return;

    // // TODO add option to not use cache
    // if (commentPredictions[commentID]) {
    //     if (commentPredictions[commentID] !== 'PROCESSING') {
    //         action(comment, commentPredictions[commentID]); // Re-run action
    //     } else {
    //         // Prediction is still running elsewhere, and will be updated there, so we ignore here.
    //     }
    //     return; // Either way, do not run prediction again
    // }

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

async function action(comment, prediction) {

    // Check if the predicted category is enabled
    let rules = LABEL_RULES_MAPPING[prediction];
    let categoryEnabled;
    if (Array.isArray(rules)) {
        categoryEnabled = (await Promise.all(rules.map(rule => getSetting(rule)))).some(x => x)
    } else {
        categoryEnabled = await getSetting(rules);
    }

    if (!categoryEnabled) return; // Do nothing

    // Now, decide what action to perform
    let action = await getSetting('action');
    if (action === 'remove') {
        if (comment.parentElement.tagName === COMMENT_THREAD_TAG) {
            // Is a top-level comment, so we delete the whole thread
            // TODO add option for this
            comment.parentElement.remove();

            // TODO make sure to remove continuation spinner
            // since it sometimes remains on the page
        } else {
            // Is a reply, so we just delete the reply
            comment.remove();

            // TODO if it is the only reply, remove the "1 reply" text
        }

    } else if (action === 'blur') {
        // TODO improve blurring
        let overlay = document.createElement('div');
        overlay.className = 'blurred-comment-overlay';

        comment.append(overlay);
        // comment.style.backgroundColor = 'red';

    } else {
        console.log(`Unknown action: ${action}`)
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
