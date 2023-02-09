const PHONETIC_CHARS = {
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

function replaceWhitespaceWithSpaces(string) {
    return string.trim().replace(/\s\s+/g, ' ');;
}

function replaceSimilarChars(text) {
    return Array.from(text).map(x => PHONETIC_CHARS[x] || x).join('');
}

function normalize(string) {

    // 1. Deconstruct emojies into text (and remove skin tones)
    string = demojize(string, true)

    // 2. Replace strange unicode characters with most similar ASCII character
    // https://stackoverflow.com/a/37511463
    //    'CLAIM 𝟏𝟎𝐊 𝐕𝐁𝐔𝐂𝐊𝐒 𝐂𝐇𝐄𝐂𝐊 𝐌𝐘 CHANNEL'
    // -> 'CLAIM 10K VBUCKS CHECK MY CHANNEL'
    string = string.normalize('NFKD')
    string = replaceSimilarChars(string)

    // 3. Remove accents
    string = string.replace(/\p{Diacritic}/gu, '');

    // 4. Replace all whitespace with a single space
    string = replaceWhitespaceWithSpaces(string);

    // 5. TODO remove specific duplicated characters

    // 6. Convert to lowercase
    string = string.toLowerCase();

    return string;
}