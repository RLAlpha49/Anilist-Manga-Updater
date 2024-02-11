import os
import json
import datetime
import glob

directory = "Manga_Data"


def Save_Alt_Titles_To_File(alternative_titles_dict):
    # Check if directory exists, if not, create it
    if not os.path.exists(directory):
        os.makedirs(directory)
    # Open a file to write, this will overwrite the file if it already exists
    with open(
        f"{directory}/alternative_titles.json", "w", encoding="utf-8"
    ) as alt_titles_file:
        json.dump(alternative_titles_dict, alt_titles_file)


def Get_Alt_Titles_From_File(alternative_titles_dict):
    # Check if the file exists
    if os.path.exists(f"{directory}/alternative_titles.json"):
        # Open the file to read
        with open(
            f"{directory}/alternative_titles.json", "r", encoding="utf-8"
        ) as alt_titles_file:
            # Load the dictionary from the file
            alternative_titles_dict = json.load(alt_titles_file)
            return alternative_titles_dict
    # If the file does not exist, return an empty dictionary
    else:
        Save_Alt_Titles_To_File(alternative_titles_dict)
        # Open the file to read
        with open(
            f"{directory}/alternative_titles.json", "r", encoding="utf-8"
        ) as alt_titles_file:
            # Load the dictionary from the file
            alternative_titles_dict = json.load(alt_titles_file)
            return alternative_titles_dict


# Function to manage files
def manage_files(directory, file_type):
    # Get a list of all files of the specified type in the directory sorted by modification time
    files = sorted(glob.glob(f"{directory}/{file_type}_*"), key=os.path.getmtime)
    # If there are more than 5 files, delete the oldest file
    if len(files) > 5:
        os.remove(files[0])


# Function to write not found manga names to a file
def Write_Not_Found(not_found_manga_names):
    # Check if directory exists, if not, create it
    if not os.path.exists(directory):
        os.makedirs(directory)
    # Get current timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    # Open a file to write
    with open(
        f"{directory}/not_found_{timestamp}.txt", "w", encoding="utf-8"
    ) as not_found_file:
        # If no not found manga names, write message to file
        if not not_found_manga_names:
            not_found_file.write("Manga Names with No IDs Found:\nNo Manga Not Found")
        else:
            # Write header to file
            not_found_file.write("Manga Names with No IDs Found:\n")
            # Loop through each not found manga name
            for name, last_chapter_read in not_found_manga_names:
                # Create search link for the manga name
                search_link = (
                    f"https://anilist.co/search/manga?search={name.replace(' ', '%20')}"
                )
                # Write manga name, last chapter read, and search link to file
                not_found_file.write(
                    f"{name} - Last Chapter Read: {last_chapter_read}, Search Link: {search_link}\n"
                )
    # Manage files in the directory
    manage_files(directory, "not_found")


# Function to write multiple IDs to a file
def Write_Multiple_IDs(multiple_id_manga_names):
    # Check if directory exists, if not, create it
    if not os.path.exists(directory):
        os.makedirs(directory)
    # Get current timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    # Open a file to write
    with open(
        f"{directory}/multiple_ids_{timestamp}.txt", "w", encoding="utf-8"
    ) as multiple_file:
        # Initialize lines list with header
        lines = ["Duplicate Manga Names and IDs:\n"]
        # If no multiple ID manga names, append message to lines
        if not multiple_id_manga_names:
            lines.append("No Manga Names with Multiple IDs Found\n")
        else:
            # Loop through each manga name and its IDs
            for manga_name, ids in multiple_id_manga_names.items():
                # Get actual IDs from the tuples
                actual_ids = [id_tuple[0] for id_tuple in ids]
                # Get last chapter read if available, else set to "Unknown"
                last_chapter_read = ids[0][1] if len(ids[0]) > 1 else "Unknown"
                # Append manga name, IDs, and last chapter read to lines
                lines.append(
                    f"{manga_name} ID's: {', '.join(map(str, actual_ids))}, Last Chapter Read: {last_chapter_read}\n"
                )
                # Append Anilist URLs for each ID to lines
                lines.extend(
                    [
                        f"Anilist URL: https://anilist.co/manga/{manga_id}\n"
                        for manga_id in actual_ids
                    ]
                )
                # Append a newline to separate each manga
                lines.append("\n")
        # Write all lines to the file
        multiple_file.writelines(lines)
    # Manage files in the directory
    manage_files(directory, "multiple_ids")


# Function to write the number of chapters updated to a file
def Write_Chapters_Updated(chapters_updated):
    # Define the directory path
    dir_path = "Chapters-Updated"
    # If the directory does not exist, create it
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

    # Get the current timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Define the file path
    file_path = f"{dir_path}/chapters_updated.txt"
    # Open the file in append mode
    with open(file_path, "a+", encoding="utf-8") as chapters_updated_file:
        # Write the timestamp and the number of chapters updated to the file
        chapters_updated_file.write(
            f"\n{timestamp} | Chapters Updated: {chapters_updated}"
            if os.path.exists(file_path)
            else f"{timestamp} | Chapters Updated: {chapters_updated}"
        )
