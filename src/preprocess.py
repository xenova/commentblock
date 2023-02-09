import unicodedata
import itertools
import emoji
import re

BUFFER_CHARS = r"*_~|`[]()'-.•,"


# Categories of unicode characters to strip during normalization
UNICODE_CATEGORIES_STRIP = ['Mn', 'Cc', 'Cf', 'Cs', 'Co', 'Cn', 'Sk']

SKIN_TONE_REGEX = re.compile(r'\ud83c[\udffb-\udfff]')

# Map of "Phonetic Extensions" and "Phonetic Extensions Supplement" (\u1d00 to \u1dbf)
# characters that do not map to ascii characters after normalisation, to similar-looking
# ascii characters. These are typically used by scammers.
PHONETIC_CHARS = {
    'ᴀ': 'A', 'ᴁ': 'AE', 'ᴂ': 'ae',
    'ᴃ': 'B', 'ᴄ': 'C', 'ᴅ': 'D',
    'ᴆ': 'D', 'ᴇ': 'E', 'ᴈ': '3',
    'ᴉ': 'i', 'ᴊ': 'J', 'ᴋ': 'K',
    'ᴌ': 'L', 'ᴍ': 'M', 'ᴎ': 'N',
    'ᴏ': 'o', 'ᴐ': 'c', 'ᴑ': 'o',
    'ᴒ': 'n', 'ᴓ': 'o', 'ᴔ': 'oe',
    'ᴕ': 'ou', 'ᴖ': 'n', 'ᴗ': 'u',
    'ᴘ': 'P', 'ᴙ': 'R', 'ᴚ': 'R',
    'ᴛ': 'T', 'ᴜ': 'U', 'ᴝ': 'u',
    'ᴞ': 'u', 'ᴟ': 'm', 'ᴠ': 'V',
    'ᴡ': 'W', 'ᴢ': 'Z', 'ᴣ': '3',
    'ᴤ': '2', 'ᴥ': 'ain', 'ᴦ': 'L',
    'ᴧ': 'A', 'ᴨ': 'N', 'ᴩ': 'P',
    'ᴪ': 'W', 'ᴫ': 'N', 'ᴯ': 'B',
    'Ǝ': '3', 'ᴻ': 'N', 'Ȣ': 'Ou',
    'ɐ': 'a', 'ɑ': 'a', 'ə': 'e',
    'ɛ': 'e', 'ɜ': '3', 'ᵎ': 'i',
    'ŋ': 'n', 'ɔ': 'c', 'ɯ': 'w',
    'β': 'B', 'γ': 'Y', 'δ': 'd',
    'φ': 'o', 'χ': 'X', 'ρ': 'p',
    'ᵫ': 'eu', 'ᵬ': 'b', 'ᵭ': 'd',
    'ᵮ': 'f', 'ᵯ': 'm', 'ᵰ': 'n',
    'ᵱ': 'p', 'ᵲ': 'r', 'ᵳ': 'r',
    'ᵴ': 's', 'ᵵ': 't', 'ᵶ': 'z',
    'ᵷ': 'g', 'н': 'H', 'ᵹ': 'g',
    'ᵺ': 'th', 'ᵻ': 'i', 'ᵼ': 'i',
    'ᵽ': 'p', 'ᵾ': 'u', 'ᵿ': 'u',
    'ᶀ': 'b', 'ᶁ': 'd', 'ᶂ': 'f',
    'ᶃ': 'g', 'ᶄ': 'k', 'ᶅ': 'l',
    'ᶆ': 'm', 'ᶇ': 'n', 'ᶈ': 'p',
    'ᶉ': 'r', 'ᶊ': 's', 'ᶋ': 'l',
    'ᶌ': 'v', 'ᶍ': 'x', 'ᶎ': 'z',
    'ᶏ': 'a', 'ᶐ': 'a', 'ᶑ': 'd',
    'ᶒ': 'e', 'ᶓ': 'e', 'ᶔ': '3',
    'ᶕ': 'e', 'ᶖ': 'i', 'ᶗ': 'p',
    'ᶘ': 'l', 'ᶙ': 'u', 'ᶚ': '3',
    'ɒ': 'a', 'ɕ': 'c', 'ɟ': 'j',
    'ɡ': 'g', 'ɥ': 'u', 'ɨ': 'i',
    'ɩ': 'i', 'ɪ': 'I', 'ʝ': 'j',
    'ɭ': 'l', 'ʟ': 'L', 'ɱ': 'm',
    'ɰ': 'w', 'ɲ': 'n', 'ɳ': 'n',
    'ɴ': 'N', 'ɵ': 'o', 'ɸ': 'o',
    'ʂ': 's', 'ʃ': 'l', 'ƫ': 't',
    'ʉ': 'u', 'ʊ': 'u', 'ʋ': 'u',
    'ʌ': 'n', 'ʐ': 'z', 'ʑ': 'z',
    'ʒ': '3', 'θ': 'O'
}


def replace_similar_chars(text):
    return ''.join(PHONETIC_CHARS.get(x, x) for x in text)


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
    string = emoji.demojize(string, language='alias')

    # 2. Replace strange unicode characters with most similar ASCII character
    string = unicodedata.normalize('NFKD', string)
    string = replace_similar_chars(string)

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
