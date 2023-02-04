from labels import CommentLabel

PROMPT_OPTIONS = '\n'.join((
    f'  ({label.value}) {label.name}'
    for label in CommentLabel
))

def handle_input(prompt, custom_options=None):
    if custom_options is None:
        custom_options = []
    
    while True:
        new_label = input(prompt)
        if not new_label:
            return None

        for option in custom_options:
            if new_label.upper() == option.upper():
                return option

        try:
            return CommentLabel(int(new_label))
        except ValueError:
            print('ERROR: Invalid input')
