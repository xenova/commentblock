let labelsToRemove = [
    COMMENT_LABEL.SCAM,
    COMMENT_LABEL.EXPLICIT,
    COMMENT_LABEL.LINK_SPAM
];
let commentPredictions = {};

(() => {
    // YTD-COMMENTS
    // YTD-COMMENTS-HEADER-RENDERER
    // YTD-COMMENT-SIMPLEBOX-RENDERER
    // YTD-COMMENT-THREAD-RENDERER
    // YTD-COMMENT-REPLIES-RENDERER
    // YTD-COMMENT-RENDERER
    const commentTag = 'YTD-COMMENT-RENDERER';

    // TODO allow user to select what to remove

    // observe changes on the page, comments are loaded separately so we need this to wait for them
    let observer = new MutationObserver((mutations) => {
        mutations.forEach(async (mutation) => {
            // A child node has been added or removed.
            if (!mutation.addedNodes) return;

            if (mutation.target.tagName === commentTag) {
                // When clicking show replies
                processComment(mutation.target);
            } else {
                // When loading for the first time, scrolling, or browsing
                // NOTE: (mutation.target.tagName === threadTag) is not enough
                // since when browsing on YouTube, this doesn't get added again.
                // Instead, we look for all comment renderers in the mutated object.

                for (let comment of mutation.target.getElementsByTagName('YTD-COMMENT-RENDERER')) {
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

    let commentURL = new URL(comment.querySelector('.published-time-text > a').href)
    let commentID = commentURL.searchParams.get('lc')

    if (commentPredictions[commentID]) {
        if (commentPredictions[commentID] !== 'PROCESSING') {
            action(comment, commentPredictions[commentID]); // Re-run action
        } else {
            // Prediction is still running elsewhere, and will be updated there, so we ignore here.
        }
        return; // Either way, do not run prediction again
    }
    commentPredictions[commentID] = 'PROCESSING';

    let authorData = comment.querySelector('#author-text');
    let authorName = authorData.innerText;
    let commentText = comment.querySelector('#comment-content').innerText;
    let authorChannelId = authorData.href.replace('https://www.youtube.com/channel/', '');

    let prediction = await makePrediction(authorName, commentText)
    commentPredictions[commentID] = prediction;

    action(comment, prediction);
}

async function action(comment, prediction) {
    if (comment.hasAttribute('processed')) {
        return;
    }
    comment.setAttribute('processed', '')
    if (labelsToRemove.includes(prediction)) {
        comment.style.backgroundColor = 'red';
    }

    // TODO actually remove later, for debugging, make red
    // mutation.target.remove(); 
}

async function makePrediction(authorName, commentText) {
    // TODO access ban lists or hand-crafted rules first

    // Otherwise, we use the model
    let model = await modelPromise;
    return await model.predict(authorName, commentText)
}

console.log('LOAD content.js');