import unicodedata
import itertools
import emoji

from detection_rules import BUFFER_CHARS, remove_unicode_categories


def normalise(string):

    # 0. Deconstruct emojies into text
    # Needed since we want to extract the semantic meaning from the emojis,
    # as opposed to <UNK>, which many tokenizers will assign to it
    string = emoji.demojize(string)

    # 1. Replace strange unicode characters with most similar ASCII character
    string = unicodedata.normalize('NFKD', str(string))

    # 2. Replace all whitespace with a single space
    string = ' '.join(string.split())

    # 3. Remove specific duplicated characters (https://stackoverflow.com/a/49695605)
    string = ''.join(k if k in BUFFER_CHARS else ''.join(v)
                     for k, v in itertools.groupby(string, lambda c: c))

    # 4. Remove certain types of unicode categories, like colours
    string = remove_unicode_categories(string)

    return string


def preprocess_single(author_name, comment_text):
    author_name = normalise(author_name)
    comment_text = normalise(comment_text)

    return f'{author_name}\n{comment_text}'


def preprocess_batch(author_names, comment_texts):

    to_return = []
    for author_name, comment_text in zip(author_names, comment_texts):
        to_return.append(preprocess_single(author_name, comment_text))

    return to_return
