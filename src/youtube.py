from typing import List
import socket
import os
from googleapiclient.discovery import build, Resource
from googleapiclient.errors import HttpError

from dotenv import load_dotenv
load_dotenv()


API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'
YT_API_KEY = os.environ['YT_API_KEY']

NUM_RETRIES = 3


class YouTubeError(Exception):
    reason = ''

    def __init__(self, error: HttpError) -> None:
        self.error = error


class VideoNotFound(YouTubeError):
    reason = 'videoNotFound'


class QuotaExceeded(YouTubeError):
    reason = 'quotaExceeded'


class CommentsDisabled(YouTubeError):
    reason = 'commentsDisabled'


errors: List[YouTubeError] = [VideoNotFound, QuotaExceeded, CommentsDisabled]


def make_api_request(function: Resource, **kwargs):
    request = function(**kwargs)
    try:
        return request.execute()
    except socket.timeout:
        # TODO catch exceptions, even after retrying (built in)
        raise
    except HttpError as e:
        for error_class in errors:
            if e.reason == error_class.reason:
                raise error_class(e)
        raise YouTubeError(e)


YOUTUBE_API = build(
    API_SERVICE_NAME,
    API_VERSION,
    developerKey=YT_API_KEY,
    num_retries=NUM_RETRIES
)


def pagination_helper(function, api_kwargs, max_requests=None):
    request_kwargs = {}
    request_count = 0
    while True:
        if max_requests is not None and request_count > max_requests:
            break
        try:
            response = make_api_request(
                function=function,
                **api_kwargs,
                **request_kwargs
            )
            request_count += 1
        except QuotaExceeded:
            raise
        except YouTubeError as e:
            print(e)
            return

        yield response

        next_token = response.get('nextPageToken')
        if not next_token:
            break

        request_kwargs['pageToken'] = next_token
