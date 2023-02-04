
import torch
import torch.nn.functional as F
from transformers import HfArgumentParser
import numpy as np
from morepython.iter_utils import chunk

from labels import CommentLabel
from train import ModelArguments
from model import load_model_tokenizer
from database import CommentDatabase
from preprocess import preprocess_batch
from shared import handle_input, PROMPT_OPTIONS


def main():

    parser = HfArgumentParser(
        (ModelArguments, )
    )
    model_args, = parser.parse_args_into_dataclasses()

    # TODO move to prediction_args
    batch_size = 2  # 16
    max_seq_length = 128
    min_probability = 0.9

    model, tokenizer = load_model_tokenizer(model_args)

    db = CommentDatabase()
    print('Get unmoderated comments')
    unmoderated_comments = db.get_unmoderated_comments(shuffle=True)

    print('Predicting')
    for batch in chunk(unmoderated_comments, batch_size):

        # Tokenize the texts
        input_data = preprocess_batch(
            [c.author_name for c in batch],
            [c.text for c in batch],
        )

        tokenized_input = tokenizer(
            input_data,
            padding='max_length',
            max_length=max_seq_length,
            truncation=True,
            return_tensors='pt'
        )

        with torch.no_grad():
            output = model(**tokenized_input)

        label_indices = np.argmax(output.logits.numpy(), axis=1)
        batched_probabilities = F.softmax(output.logits, dim=1).numpy()

        for comment, label_index, probabilities in zip(batch, label_indices, batched_probabilities):
            prediction = model.config.id2label[label_index]
            probability = probabilities[label_index]

            if prediction == CommentLabel.VALID.name:
                continue

            if probability < min_probability:
                continue

            print(f'[{comment.author_name}] {comment.text} ({probability:.3f})')
            print(comment.url)

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

            comment.label = response
            comment.moderated = True
            db.update(comment, force_save=True)
            print('Updated comment')


if __name__ == '__main__':
    main()
