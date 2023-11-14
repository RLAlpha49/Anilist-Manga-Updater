import os
import datetime

def Write_Multiple_IDs(multiple_id_manga_names):
    # Open a file to write duplicate manga names and IDs
    with open('multiple_manga_ids.txt', 'w', encoding='utf-8') as multiple_file:
        # Write a header line
        multiple_file.write("Duplicate Manga Names and IDs:\n")
        # Iterate over the dictionary of manga names and IDs
        for manga_name, ids in multiple_id_manga_names.items():
            # Write the manga name and its corresponding IDs
            multiple_file.write(f"{manga_name}: {', '.join(map(str, ids))}\n")
            # For each ID, write the corresponding Anilist URL
            for manga_id in ids:
                multiple_file.write(f"Anilist URL: https://anilist.co/manga/{manga_id}\n")

def Write_Not_Found(not_found_manga_names):
    # Open a file to write manga names that were not found
    with open('not_found_manga_names.txt', 'w', encoding='utf-8') as not_found_file:
        # Write a header line
        not_found_file.write("Manga Names with No IDs Found:\n")
        # Iterate over the list of manga names
        for manga_name in not_found_manga_names:
            # Write the manga name
            not_found_file.write(f"{manga_name}\n")

def Write_Chapters_Updated(chapters_updated):
    # Define the directory path
    dir_path = 'Chapters-Updated'

    # Check if the directory exists, if not, create it
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

    # Get current date and time
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Open a file to append the timestamp and the number of chapters updated
    with open(f'{dir_path}/chapters_updated.txt', 'a', encoding='utf-8') as chapters_updated_file:
        # Check if the file is empty
        if chapters_updated_file.tell() != 0:
            # If not, add a newline character before the new entry
            chapters_updated_file.write(f"\n{timestamp} | Chapters Updated: {chapters_updated}")
        else:
            # If the file is empty, just write the new entry
            chapters_updated_file.write(f"{timestamp} | Chapters Updated: {chapters_updated}")