import unicodedata
import itertools
import emoji
import re

BUFFER_CHARS = r"*_~|`[]()'-.•,"


# Categories of unicode characters to strip during normalization
UNICODE_CATEGORIES_STRIP = ['Mn', 'Cc', 'Cf', 'Cs', 'Co', 'Cn', 'Sk']

SKIN_TONE_REGEX = re.compile(r'\ud83c[\udffb-\udfff]')

def remove_unicode_categories(string):
    return ''.join(char for char in string if unicodedata.category(char) not in UNICODE_CATEGORIES_STRIP)


def replace_whitespace_with_spaces(string):
    return ' '.join(string.strip().split())

def remove_emoji_skin_tones(string):
    return re.sub(SKIN_TONE_REGEX, '', string)

def normalise(string):
    # 0. Make sure it is a string
    string = str(string)

    # 1. Deconstruct emojies into text
    # Needed since we want to extract the semantic meaning from the emojis,
    # as opposed to <UNK>, which many tokenizers will assign to it
    string = remove_emoji_skin_tones(string)
    string = emoji.demojize(string)

    # 2. Replace strange unicode characters with most similar ASCII character
    string = unicodedata.normalize('NFKD', string)

    # 3. Remove certain types of unicode categories, like accents
    string = remove_unicode_categories(string)

    # 4. Replace all whitespace with a single space
    string = replace_whitespace_with_spaces(string)

    # 5. Remove specific duplicated characters (https://stackoverflow.com/a/49695605)
    string = ''.join(k if k in BUFFER_CHARS else ''.join(v)
                     for k, v in itertools.groupby(string, lambda c: c))

    # 6. Lowercase the string
    string = string.lower()

    return string


def preprocess_single(author_name, comment_text):
    author_name = normalise(author_name)
    comment_text = normalise(comment_text)

    # TODO add custom token?
    return f'{author_name} commented {comment_text}'


def preprocess_batch(author_names, comment_texts):

    to_return = []
    for author_name, comment_text in zip(author_names, comment_texts):
        to_return.append(preprocess_single(author_name, comment_text))

    return to_return
