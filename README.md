# CommentBlock

CommentBlock is an open-source browser extension that automatically blocks spam/scam YouTube comments. Download for [Chrome/Chromium](https://chrome.google.com/webstore/detail/pnhkbjdbaioddkchelkolhbhcmlibjfb) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/ytcommentblock/).

![CommentBlock](./extension/store/teaser.png)

## Examples
Want to see the extension in action? Here are some videos to test it on:

1. [The Flash - No Way Home For The DCU?](https://www.youtube.com/watch?v=JG0QV40FMdQ) | The Critical Drinker &mdash; If you sort comments by new, you will see a ton of scam comments (mostly as replies). The extension does a very good job at detecting these.


2. [Inside the Largest Bitcoin Mine in The U.S.](https://www.youtube.com/watch?v=x9J0NdV0u9k)  | WIRED &mdash; Almost every single comment on this video is a scam comment from a bot. This is of course due to the subject matter: *Crypto*. Although the extension does a good job blocking the obvious scams, botters have gotten a lot smarter recently. In particular, they start long comment threads (pretending to be real conversations between real people) and eventually prompt readers to contact someone off of YouTube. Detection for these comment threads will be much better with neural networks (see [below](#development-plans))!


## Development Plans

Neural-network based detection is also in development to catch more advanced spam comments and comment threads. In particular, we aim to use unsupervised clustering techniques to group similar comments together, assign labels to comments in these groups, and then train classification models using the labelled data.

## Contributions

At the moment, the extension uses rules to determine the type of a comment (e.g., spam, scam, explicit, or links). So, there may be cases where the extension misses a bad comment, or blocks a valid comment. In either case, feel free to open an [issue](https://github.com/xenova/commentblock/issues/new/choose) (including a link to the comment, which can be retrieved by right-clicking the time posted and copying the link), and we will update the ruleset to account for this.

## Credit
Inspired by [ThioJoe's Spammer Purge](https://github.com/ThioJoe/YT-Spammer-Purge) tool.
