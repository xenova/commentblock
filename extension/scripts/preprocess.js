function replaceWhitespaceWithSpaces(string) {
    return string.trim().replace(/\s\s+/g, ' ');;
}

function normalize(string) {

    // 1. Deconstruct emojies into text (and remove skin tones)
    string = demojize(string, true)

    // 2. Replace strange unicode characters with most similar ASCII character
    // https://stackoverflow.com/a/37511463
    //    'CLAIM 𝟏𝟎𝐊 𝐕𝐁𝐔𝐂𝐊𝐒 𝐂𝐇𝐄𝐂𝐊 𝐌𝐘 CHANNEL'
    // -> 'CLAIM 10K VBUCKS CHECK MY CHANNEL'
    string = string.normalize('NFKD')

    // 3. Remove accents
    string = string.replace(/\p{Diacritic}/gu, '');

    // 4. Replace all whitespace with a single space
    string = replaceWhitespaceWithSpaces(string);

    // 5. TODO remove specific duplicated characters

    // 6. Convert to lowercase
    string = string.toLowerCase();

    return string;
}