from dataclasses import dataclass, field
from collections import Counter

import torch
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim
from transformers import HfArgumentParser
from tqdm import trange, tqdm
from morepython.iter_utils import chunk


from shared import handle_input, PROMPT_OPTIONS
from database import CommentDatabase
from labels import CommentLabel
from preprocess import normalise


def community_detection(
    embeddings,
    threshold=0.75,
    min_community_size=10,
    batch_size=1024,
    return_scores=False
):
    """
    Function for Fast Community Detection
    Finds in the embeddings all communities, i.e. embeddings that are close (closer than threshold).
    Returns only communities that are larger than min_community_size. The communities are returned
    in decreasing order. The first element in each list is the central point in the community.
    """

    threshold = torch.tensor(threshold, device=embeddings.device)

    extracted_communities = []

    # Maximum size for community
    min_community_size = min(min_community_size, len(embeddings))
    sort_max_size = min(max(2 * min_community_size, 50), len(embeddings))

    for start_idx in trange(0, len(embeddings), batch_size):
        # Compute cosine similarity scores
        cos_scores = cos_sim(
            embeddings[start_idx:start_idx + batch_size], embeddings)

        # Minimum size for a community
        top_k_values, _ = cos_scores.topk(k=min_community_size, largest=True)

        # Filter for rows >= min_threshold
        for i in range(len(top_k_values)):
            if top_k_values[i][-1] >= threshold:
                new_cluster = []

                # Only check top k most similar entries
                top_val_large, top_idx_large = cos_scores[i].topk(
                    k=sort_max_size, largest=True)

                # Check if we need to increase sort_max_size
                while top_val_large[-1] > threshold:
                    sort_max_size = min(2 * sort_max_size, len(embeddings))
                    top_val_large, top_idx_large = cos_scores[i].topk(
                        k=sort_max_size, largest=True)

                for idx, val in zip(top_idx_large.tolist(), top_val_large):
                    if val < threshold:
                        break

                    new_cluster.append(idx)

                extracted_communities.append(new_cluster)

        del cos_scores

    # Largest cluster first
    extracted_communities = sorted(
        extracted_communities, key=len, reverse=True)

    # Step 2) Remove overlapping communities
    unique_communities = []
    extracted_ids = set()

    for cluster_id, community in enumerate(extracted_communities):
        community = sorted(community)
        non_overlapped_community = [
            idx for idx in community if idx not in extracted_ids
        ]

        if len(non_overlapped_community) >= min_community_size:
            unique_communities.append(non_overlapped_community)
            extracted_ids.update(non_overlapped_community)

    unique_communities = sorted(
        unique_communities, key=len, reverse=True)

    if not return_scores:
        return unique_communities

    scored_unique_communities = []
    for community in unique_communities:
        # Use mean as baseline for comparison
        community_embeddings = torch.stack([
            embeddings[idx]
            for idx in community
        ])
        query = torch.mean(community_embeddings, dim=0)

        scores = cos_sim(query, community_embeddings)[
            0].round(decimals=5).tolist()
        current_community = list(zip(community, scores))

        # Sort so that most similar to mean are first
        scored_unique_communities.append(
            sorted(current_community, key=lambda x: x[1], reverse=True))

    return scored_unique_communities


def run_automatic(clusters, comments, database: CommentDatabase):
    # TODO make parameter
    # If number of moderated comments % exceeds this value, mark all as most common label
    consensus_threshold = 0.5

    for i, cluster in enumerate(clusters):
        # 1. Determine consensus of cluster

        moderated_comments_labels = []
        unmoderated_comments = []

        for idx, score in cluster:
            if comments[idx].moderated:
                moderated_comments_labels.append(comments[idx].label)
            else:
                unmoderated_comments.append((idx, score))

        if not unmoderated_comments:
            continue

        moderated_ratio = len(moderated_comments_labels) / len(cluster)
        if moderated_ratio >= consensus_threshold:
            most_common_label = Counter(
                moderated_comments_labels).most_common(1)[0][0]

            print(f'Cluster {i+1}/{len(clusters)}, #{len(cluster)} Elements')
            print(f'Consensus reached ({moderated_ratio} >= {consensus_threshold}), assigning label',
                  most_common_label, 'to', len(unmoderated_comments), 'unmoderated comments.')
            comments_to_update = []
            for idx, score in unmoderated_comments:
                comments[idx].score = score
                comments[idx].label = most_common_label
                comments_to_update.append(comments[idx])
                print('Updated', comments[idx])
            database.update(comments_to_update, force_save=True)
            print()


def run_user_moderation(clusters, comments, database: CommentDatabase):
    # Print for all clusters the top 3 and bottom 3 elements
    for i, cluster in enumerate(clusters):

        moderated_comment_types = []
        unmoderated_comment_ids = []
        for comment_id, score in cluster:
            if comments[comment_id].moderated:
                moderated_comment_types.append(comments[comment_id].label)
            else:
                unmoderated_comment_ids.append(comment_id)

        print(f'Cluster {i+1}/{len(clusters)}, #{len(cluster)} Elements')

        num_moderated_comments = len(moderated_comment_types)
        if num_moderated_comments > 0:
            moderated_comment_counts = Counter(moderated_comment_types)
            print('Hiding', num_moderated_comments,
                  'moderated comments:', moderated_comment_counts)

        if unmoderated_comment_ids:  # Something to moderate
            # Print out first and last 3 comments for user to make decisions
            for comment_id in unmoderated_comment_ids[:3]:
                print(' ', comments[comment_id])
            print('  ...')
            for comment_id in unmoderated_comment_ids[-3:]:
                print(' ', comments[comment_id])

            # Ask user to moderate
            new_label = handle_input(
                'Assign label to group:\n'
                + PROMPT_OPTIONS
                + f'\n  (x) Reset batch'
                + f'\n  Enter choice (1-{len(CommentLabel)}), or leave empty to ignore: ',
                custom_options=['X']
            )

            comments_to_update = []

            if new_label == 'X':
                print('Resetting', len(cluster), 'comments')

                # Reset whole batch/cluster, including previously
                # moderated comments
                for comment_id, score in cluster:
                    comments[comment_id].score = None
                    comments[comment_id].label = None
                    comments[comment_id].moderated = False
                    comments_to_update.append(comments[comment_id])

            elif new_label is not None:
                print('Moderated', len(unmoderated_comment_ids),
                      'comments with label:', new_label.name)

                for comment_id in unmoderated_comment_ids:
                    # TODO add score
                    comments[comment_id].label = new_label.name
                    comments[comment_id].moderated = True
                    comments_to_update.append(comments[comment_id])

            else:
                print('Ignored', len(cluster), 'comments')

            if comments_to_update:
                database.update(comments_to_update, force_save=True)

        print()


@dataclass
class ClusterArguments:
    min_community_size: int = field(
        default=25,
        metadata={
            "help": "Minimum community size for clustering"
        },
    )
    chunk_size: int = field(
        default=500000,
        metadata={
            "help": "Cluster chunk size"
        },
    )
    threshold: float = field(
        default=0.95,
        metadata={
            "help": "Similarity threshold for clustering"
        },
    )
    only_unmoderated: bool = field(
        default=False,
        metadata={
            "help": "Only get unmoderated comments"
        },
    )

    fetch_size: int = field(
        default=1000,
        metadata={
            "help": "SQL fetch size"
        },
    )

    shuffle: bool = field(
        default=True,
        metadata={
            "help": "Whether to shuffle comments before clustering"
        },
    )
    user_moderation_mode: bool = field(
        default=True,
        metadata={
            "help": "Run in user moderation mode"
        },
    )


def main():

    parser = HfArgumentParser(ClusterArguments)
    cluster_args, = parser.parse_args_into_dataclasses()

    print(f'{cluster_args=}')

    # Model for computing sentence embeddings
    # https://www.sbert.net/docs/pretrained_models.html
    model = SentenceTransformer('all-MiniLM-L12-v2')

    # Load database
    database = CommentDatabase()

    print('Getting comments')
    if cluster_args.only_unmoderated:
        all_comments = database.get_unmoderated_comments(
            fetch_size=cluster_args.fetch_size,
            shuffle=cluster_args.shuffle
        )
    else:
        # In this case (default), we also include moderated comments, since we might find
        # unmoderated comments that are already part of an existing "cluster",
        # but are too few to include in their own cluster
        all_comments = database.get_all_comments(
            fetch_size=cluster_args.fetch_size,
            shuffle=cluster_args.shuffle
        )

    # Processing the whole database at the same time is not possible
    # so, we divide into chunks
    print('Start processing')
    for comments in chunk(all_comments, cluster_args.chunk_size):
        comment_data = list(
            (normalise(c.author_name), normalise(c.text))
            for c in tqdm(comments)
        )

        print('Encoding this part of the corpus. This might take a while')
        corpus_embeddings = model.encode(
            comment_data,
            batch_size=64,
            show_progress_bar=True,
            convert_to_tensor=True
        )

        # Two parameters to tune:
        # min_cluster_size: Only consider cluster that have at least 25 elements
        # threshold: Consider sentence pairs with a cosine-similarity larger than threshold as similar
        clusters = community_detection(
            corpus_embeddings,
            min_community_size=cluster_args.min_community_size,
            threshold=cluster_args.threshold,
            return_scores=True
        )

        if cluster_args.user_moderation_mode:
            run_user_moderation(clusters, comments, database)
        else:
            run_automatic(clusters, comments, database)


if __name__ == '__main__':
    main()
