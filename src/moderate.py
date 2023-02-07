

def main():
    from database import CommentDatabase
    from tqdm import tqdm

    from shared import handle_input, PROMPT_OPTIONS, CommentLabel

    database = CommentDatabase()

    fetch_size = 1000
    min_score = 0.95

    comments = database.get_comments_sql("""
    SELECT * FROM comments
    WHERE moderated=FALSE and score >= ?
    """, parameters=(min_score, ), fetch_size=fetch_size)

    author_comments = {}
    for c in comments:
        if c.author_channel_id not in author_comments:
            author_comments[c.author_channel_id] = []
        author_comments[c.author_channel_id].append(c)

    author_comments = dict(
        sorted(author_comments.items(), key=lambda item: len(item[1]), reverse=True))

    for author, comments in tqdm(author_comments.items()):

        comments = sorted(comments, key=lambda x: x.text)

        print(f'Found {len(comments)} flagged comments from {author}')

        for comment in comments[:3]:
            print(' ', comment)
        print('  ...')
        for comment in comments[-3:]:
            print(' ', comment)

        prediction = comments[0].label
        response = handle_input(
            f'Assign label to comments from this user:\n  (0) {prediction}\n' +
            PROMPT_OPTIONS +
            f'\nEnter choice (0-{len(CommentLabel)}), or leave empty to ignore: ',
            custom_options=['0']
        )

        if not response:
            continue

        if response == '0':
            response = prediction
        else:
            response = response.name

        comments_to_update = []
        for comment in comments:
            comment.label = response
            comment.moderated = True

            comments_to_update.append(comment)

        database.update(comments_to_update, force_save=True)
        print('Updated comments')


if __name__ == '__main__':
    main()
