

def main():
    import json
    from labels import CommentLabel
    from database import CommentDatabase
    from tqdm import tqdm
    import random
    from morepython.iter_utils import split_list

    max_per_label = 25000
    remove_duplicates = True

    # Load database
    database = CommentDatabase()

    moderated_comments = list(database.get_comments_sql("""
    SELECT * FROM comments
    WHERE (label != 'VALID' AND moderated=TRUE) OR (label = 'VALID')
    """))
    random.shuffle(moderated_comments)

    rows = []

    label_counts = {
        i.name: 0
        for i in CommentLabel
    }

    author_text_pairs = set()
    for comment in tqdm(moderated_comments):
        if remove_duplicates:
            if (comment.author_name, comment.text) in author_text_pairs:
                continue
            else:
                author_text_pairs.add((comment.author_name, comment.text))

        if label_counts[comment.label] >= max_per_label:
            continue  # Already have enough of this label
        rows.append(dict(
            comment_id=comment.comment_id,
            video_id=comment.video_id,
            author_channel_id=comment.author_channel_id,
            author_name=comment.author_name,
            text=comment.text,
            label=comment.label,
        ))

        label_counts[comment.label] += 1

    print(f'{label_counts=}')
    random.shuffle(rows)

    datasets = dict(zip(('train', 'valid', 'test'),
                        split_list(rows, [0.8, 0.1, 0.1])))

    for key, data in datasets.items():
        with open(f'datasets/{key}.json', 'w') as fp:
            json.dump(data, fp)


if __name__ == '__main__':
    main()
