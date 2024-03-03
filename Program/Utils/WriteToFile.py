"""
This module contains functions to manage and write data to files. 

It includes functions to save and retrieve alternative titles of manga, 
manage files in a directory, write names of not found manga and manga with 
multiple IDs to files, and write the number of chapters updated to a file.
"""

# pylint: disable=C0103
import os
import json
import datetime
import glob

directory = "Manga_Data"


def Save_Alt_Titles_To_File(alternative_titles_dict):
    """
    Saves alternative titles to a file.

    Parameters:
    alternative_titles_dict (dict): A dictionary of alternative titles.

    Returns:
    None
    """
    # Check if directory exists, if not, create it
    if not os.path.exists(directory):
        os.makedirs(directory)
    # Open a file to write, this will overwrite the file if it already exists
    with open(
        f"{directory}/alternative_titles.json", "w", encoding="utf-8"
    ) as alt_titles_file:
        json.dump(alternative_titles_dict, alt_titles_file)


def Get_Alt_Titles_From_File(alternative_titles_dict):
    """
    Retrieves alternative titles from a file.

    This function checks if the file 'alternative_titles.json' exists in the
    specified directory. If it does, it opens the file and loads the dictionary
    from it. If the file does not exist, it saves the alternative titles to the
    file and then opens it to load the dictionary.

    Parameters:
    alternative_titles_dict (dict): A dictionary of alternative titles.

    Returns:
    dict: The dictionary of alternative titles loaded from the file.
    """
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
def manage_files(dir_path, file_type):
    """
    Manages files in a directory by deleting the oldest file if there are more than 5.

    This function gets a list of all files of the specified type in the directory,
    sorted by modification time. If there are more than 5 files, it deletes the oldest file.

    Parameters:
    dir_path (str): The directory where the files are located.
    file_type (str): The type of the files to manage.

    Returns:
    None
    """
    # Get a list of all files of the specified type in the directory sorted by modification time
    files = sorted(glob.glob(f"{dir_path}/{file_type}_*"), key=os.path.getmtime)
    # If there are more than 5 files, delete the oldest file
    if len(files) > 5:
        os.remove(files[0])


# Function to write not found manga names to a file
def Write_Not_Found(not_found_manga_names):
    """
    Writes the names of not found manga to a file.

    This function checks if the directory exists, if not, it creates it. Then it
    opens a file to write the names of not found manga. If there are no not found
    manga names, it writes a message to the file. Otherwise, it writes the manga
    name, last chapter read, and a search link for each not found manga. After
    writing to the file, it manages the files in the directory.

    Parameters:
    not_found_manga_names (list): A list of tuples, where each tuple contains a
    manga name and the last chapter read.

    Returns:
    None
    """
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
    """
    Writes the names of manga with multiple IDs to a file.

    This function checks if the directory exists, if not, it creates it. Then it
    opens a file to write the names of manga with multiple IDs. If there are no
    manga with multiple IDs, it writes a message to the file. Otherwise, it writes
    the manga name, IDs, and last chapter read for each manga with multiple IDs.
    After writing to the file, it manages the files in the directory.

    Parameters:
    multiple_id_manga_names (dict): A dictionary where keys are manga names and
    values are lists of tuples, each containing an ID and the last chapter read.

    Returns:
    None
    """
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
                formatted_ids = ", ".join(map(str, actual_ids))
                lines.append(
                    f"{manga_name} ID's: {formatted_ids}, "
                    f"Last Chapter Read: {last_chapter_read}\n"
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
    """
    Writes the number of chapters updated to a file.

    This function checks if the directory exists, if not, it creates it. Then it
    opens a file to append the current timestamp and the number of chapters updated.

    Parameters:
    chapters_updated (int): The number of chapters updated.

    Returns:
    None
    """
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
