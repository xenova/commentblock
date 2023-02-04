
from enum import Enum, auto

class CommentLabel(Enum):
    # VALID
    # (any normal comment)
    VALID = auto()

    # SCAM
    # - crypto/vbucks/robux scams
    SCAM = auto()

    # SELF_PROMO
    # - follow me at ...
    # - check my profile out
    SELF_PROMO = auto()

    # OTHER_PROMO
    # - go follow x at ...
    OTHER_PROMO = auto()

    # SPONSOR
    # - sponsored comment
    SPONSOR = auto()

    # EXPLICIT
    # - sex bots
    EXPLICIT = auto()

    # LINK_ONLY
    # - comments which contain a single URL
    LINK_ONLY = auto()

    # LINK_SPAM
    # - comments which contain URLs to other content
    LINK_SPAM = auto()

    # MALICIOUS_LINKS
    # - comment contains malicious URL(s)
    MALICIOUS_LINKS = auto()

    # OTHER_SPAM
    # - nonsense
    OTHER_SPAM = auto()

    # REPLY_TO_SCAM
    # - comments that are in response to a scam comment
    REPLY_TO_SCAM = auto()


    @classmethod
    def names(cls):
        return [x.name for x in cls]
