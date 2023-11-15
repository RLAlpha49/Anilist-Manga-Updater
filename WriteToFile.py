import os
import datetime

# Function to write multiple IDs to a file
def Write_Multiple_IDs(multiple_id_manga_names):
    # Open the file in write mode
    with open('multiple_manga_ids.txt', 'w', encoding='utf-8') as multiple_file:
        # Initialize the list of lines to be written to the file
        lines = ["Duplicate Manga Names and IDs:\n"]
        # Loop through the dictionary of manga names and IDs
        for manga_name, ids in multiple_id_manga_names.items():
            # Extract the actual IDs from the tuples
            actual_ids = [id_tuple[0] for id_tuple in ids]
            # Add a line for each manga name and its IDs
            lines.append(f"{manga_name} ID's: {', '.join(map(str, actual_ids))}\n")
            # Add a line for each AniList URL
            lines.extend([f"Anilist URL: https://anilist.co/manga/{manga_id}\n" for manga_id in actual_ids])
        # Write the lines to the file
        multiple_file.writelines(lines)

# Function to write not found manga names to a file
def Write_Not_Found(not_found_manga_names):
    # Open the file in write mode
    with open('not_found_manga_names.txt', 'w', encoding='utf-8') as not_found_file:
        # Write the not found manga names to the file
        not_found_file.write("Manga Names with No IDs Found:\n" + "\n".join(not_found_manga_names))

# Function to write the number of chapters updated to a file
def Write_Chapters_Updated(chapters_updated):
    # Define the directory path
    dir_path = 'Chapters-Updated'
    # If the directory does not exist, create it
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

    # Get the current timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Define the file path
    file_path = f'{dir_path}/chapters_updated.txt'
    # Open the file in append mode
    with open(file_path, 'a+', encoding='utf-8') as chapters_updated_file:
        # Write the timestamp and the number of chapters updated to the file
        chapters_updated_file.write(f"\n{timestamp} | Chapters Updated: {chapters_updated}" if os.path.exists(file_path) else f"{timestamp} | Chapters Updated: {chapters_updated}")