
import sqlite3
import json
from tqdm import tqdm
from dataclasses import dataclass
from typing import Optional, Union, List, Tuple

from morepython.os_utils import listdir


@dataclass
class Comment:
    comment_id: str
    video_id: str
    text: str

    likes: int

    publish_date: str
    update_date: str

    # Author data
    author_name: str
    author_profile_url: str
    author_channel_id: str

    # Additional (optional) parameters used for moderation and training
    label: Optional[str] = None
    score: Optional[float] = None
    moderated: bool = False

    @property
    def url(self):
        return f'https://www.youtube.com/watch?v={self.video_id}&lc={self.comment_id}'

    def __str__(self) -> str:
        return f'[{self.author_name}] {self.text}'


def get_comments(path):

    with open(path) as fp:
        video_data = json.load(fp)

    comments_info = video_data['comments_info']

    for comments_chunk in comments_info:

        for c in comments_chunk['items']:
            comment = c['snippet']

            if 'replies' in c:
                replies = c['replies']['comments']
            else:
                replies = []

            # Main comment
            yield parse_comment(comment['topLevelComment'])

            # Replies
            yield from map(parse_comment, replies)


def parse_comment(comment_data):
    comment_data_snippet = comment_data['snippet']

    if 'authorChannelId' in comment_data_snippet:
        author_channel_id = comment_data_snippet['authorChannelId']['value']
    else:
        author_channel_id = None

    return Comment(
        comment_id=comment_data['id'],
        video_id=comment_data_snippet['videoId'],
        text=comment_data_snippet['textOriginal'],
        likes=comment_data_snippet['likeCount'],
        publish_date=comment_data_snippet['publishedAt'],
        update_date=comment_data_snippet['updatedAt'],

        # Author data
        author_name=comment_data_snippet['authorDisplayName'],
        author_profile_url=comment_data_snippet['authorProfileImageUrl'],
        author_channel_id=author_channel_id,
    )


class CommentDatabase:
    def __init__(self, name='./data/database/comments.db') -> None:
        self.connection = sqlite3.connect(name)

        # Create table if it does not exist
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS comments(
                comment_id TEXT NOT NULL PRIMARY KEY,
                video_id TEXT NOT NULL,
                text TEXT NOT NULL,
                likes INTEGER NOT NULL,
                publish_date TEXT NOT NULL,
                update_date TEXT NOT NULL,
                author_name TEXT NOT NULL,
                author_profile_url TEXT NOT NULL,
                author_channel_id TEXT NOT NULL,
                label TEXT,
                score REAL,
                moderated INTEGER NOT NULL DEFAULT FALSE
            );
        """)

    def record_to_object(self, record: Tuple, columns):
        assert len(record) == len(columns)
        kwargs = dict(zip(columns, record))
        return Comment(**kwargs)

    def get_comments_sql(self, sql_statement, parameters=None, fetch_size=None, shuffle=False):
        # NOTE: Using batch_size (of 1000 for example) is far more memory efficient

        if shuffle:
            if 'ORDER BY' in sql_statement or 'LIMIT' in sql_statement:
                raise ValueError(
                    'Unable to apply random ordering when `ORDER BY` or `LIMIT` used in sql_statement')

            sql_statement += ' ORDER BY RANDOM()'

        if parameters is None:
            res = self.connection.execute(sql_statement)
        else:
            res = self.connection.execute(sql_statement, parameters)

        columns = [x[0] for x in res.description]

        if fetch_size is None:
            yield from map(lambda x: self.record_to_object(x, columns), res.fetchall())
        else:
            while True:
                results = res.fetchmany(fetch_size)
                if not results:
                    break
                yield from map(lambda x: self.record_to_object(x, columns), results)

    def get_all_comments(self, **kwargs):
        return self.get_comments_sql('SELECT * FROM comments', **kwargs)

    def get_unmoderated_comments(self, **kwargs):
        return self.get_comments_sql('SELECT * FROM comments WHERE moderated = FALSE', **kwargs)

    def get_moderated_comments(self, **kwargs):
        return self.get_comments_sql('SELECT * FROM comments WHERE moderated = TRUE', **kwargs)

    def get_comment_ids(self):
        res = self.connection.execute('SELECT comment_id FROM comments')

        # Conver to set now so that future lookups are faster (vs. list)
        return set(x[0] for x in res.fetchall())

    def get_comment(self, comment_id):
        res = self.connection.execute("""
            SELECT * FROM comments
            WHERE comment_id = ?
        """, (comment_id, ))
        columns = [x[0] for x in res.description]
        return self.record_to_object(res.fetchone(), columns)

    def save(self):
        self.connection.commit()

    def update(self, comments: Union[Comment, List[Comment]], force_save=False):
        if not comments:
            return

        if not isinstance(comments, list):
            comments = [comments]

        values = [
            (
                c.video_id,
                c.text,
                c.likes,
                c.publish_date,
                c.update_date,
                c.author_name,
                c.author_profile_url,
                c.author_channel_id,
                c.label,
                c.score,
                c.moderated,
                c.comment_id,
            )
            for c in comments
        ]

        self.connection.executemany(
            """
            UPDATE comments
            SET video_id=?, text=?, likes=?, publish_date=?,
            update_date=?, author_name=?, author_profile_url=?,
            author_channel_id=?,label=?,score=?,moderated=?
            WHERE comment_id = ?
            """,
            values
        )

        if force_save:
            self.save()

    def insert(self, comments: Union[Comment, List[Comment]], force_save=False):
        if not comments:
            return

        if not isinstance(comments, list):
            comments = [comments]

        values = [
            (
                c.comment_id,
                c.video_id,
                c.text,
                c.likes,
                c.publish_date,
                c.update_date,
                c.author_name,
                c.author_profile_url,
                c.author_channel_id,
                c.label,
                c.score,
                c.moderated
            )
            for c in comments
        ]

        self.connection.executemany(
            """
            INSERT OR IGNORE INTO comments
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            values
        )

        if force_save:
            self.save()


def main():
    print('Connect to database')
    database = CommentDatabase()

    existing_ids = database.get_comment_ids()

    videos_dir = './data/comments'
    videos = list(listdir(videos_dir, extensions='.json'))

    with tqdm(videos) as progress:
        for video in progress:
            new_comments = [
                c for c in get_comments(video)
                if c.comment_id not in existing_ids
            ]
            if new_comments:
                progress.set_description(f'Inserted {len(new_comments)} new commments from "{video}"')
                database.insert(new_comments)

    database.save()


if __name__ == '__main__':
    main()
