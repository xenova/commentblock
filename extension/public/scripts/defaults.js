// Script that is run first
// Sets DEFAULT storage values if not set

const DEFAULT_OPTIONS = {

    // CATEGORIES:
    // 1. SCAM
    "rules-enabled-scam": true,
    "rules-scam-names": true,
    "rules-scam-text": true,

    // 2. EXPLICIT
    "rules-enabled-explicit": true,

    // 3. LINKS
    "rules-enabled-links": true,
    "rules-links-spam": true,
    "rules-links-only": false,
    "rules-links-contains": false,

    // 4. SELF_PROMO
    "rules-enabled-selfpromo": false,

    // 5. OTHER_PROMO
    "rules-enabled-otherpromo": false,

    // 6. SPONSOR
    "rules-enabled-sponsor": false,

    // 7. OTHER_SPAM
    "rules-enabled-spam": true,
    "rules-spam-wafflehouse": true,

    // Actions
    "action": 'blur',


    // OTHER SETTINGS:
    "use-rules": true,
    "use-ml": false,
}
