// Hard-coded rules for detection

// LINK SPAM:
const LINK_SPAM_PHRASES = [
    'finally it’s here',
    "finally it's here",
    'finally its here',
    'its finally here',
    'lets be honest we all enjoyed this video by having this',
    'i think youre looking for this',
    'here finally',
    'here is what happened',
    'last fight',
    'full clip',
    'here is the full video',
    'link to the clip thats going viral',
    'link to the clip explains the solution to bots',
    'link to the clip part 2',
    'here is the recommended clip',
    'full recommended clip'
]
const LINK_SPAM_DOMAINS = ['youtu.be', 'youtube.com']

function containsLinkSpam(text) {
    return containsAny(text, LINK_SPAM_PHRASES) && containsAny(text, LINK_SPAM_DOMAINS)
}

function containsAny(item, listOfPhrases) {
    for (let phrase of listOfPhrases) {
        if (item.includes(phrase)) return true;
    }

    return false;

}


function rule_detect(authorName, commentText) {

    let normalisedUsername = normalise(authorName);
    let normalisedText = normalise(commentText);


    let lowerText = normalisedText.toLowerCase();

    if (containsLinkSpam(lowerText))
        return COMMENT_LABEL.LINK_SPAM;


    return COMMENT_LABEL.VALID
}

function ml_detect(authorName, commentText) {
    let normalisedUsername = normalise(authorName);
    let normalisedText = normalise(commentText);


}
