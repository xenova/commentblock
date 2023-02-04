
from tqdm import tqdm
import json
import os
import time

from youtube import pagination_helper, YOUTUBE_API, make_api_request


def get_comments_info(video_id, max_requests=None):
    api_kwargs = dict(
        part='snippet,replies',
        videoId=video_id,
        maxResults=100,
    )

    return pagination_helper(
        function=YOUTUBE_API.commentThreads().list,
        api_kwargs=api_kwargs,
        max_requests=max_requests
    )


def get_video_info(video_id):
    # Get video info
    return make_api_request(
        function=YOUTUBE_API.videos().list,
        part='snippet,contentDetails,statistics',
        id=video_id
    )


def get_video_and_comments(video_id, max_comments_requests=10):
    video_info = get_video_info(video_id)

    comments_info = []
    if video_info['items']:
        # Only get comments if the video exists
        comments_info = list(get_comments_info(
            video_id, max_comments_requests))

    return dict(
        video_id=video_id,
        retrieval_time=time.time(),
        video_info=video_info,
        comments_info=comments_info,
    )


def main():

    with open('./data/videos_to_download.json', encoding='utf-8') as fp:
        video_ids = json.load(fp)

    for video_id in tqdm(video_ids):
        path = os.path.join('./data/comments', f'{video_id}.json')

        if os.path.exists(path):
            continue

        data = get_video_and_comments(video_id, max_comments_requests=10)

        with open(path, 'w') as fp:
            json.dump(data, fp)


if __name__ == '__main__':
    main()
