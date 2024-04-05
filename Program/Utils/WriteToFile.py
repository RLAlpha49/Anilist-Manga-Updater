"""
This module contains functions to manage and write data to files.

It includes functions to save and retrieve alternative titles of manga,
manage files in a directory, write names of not found manga and manga with
multiple IDs to files, and write the number of chapters updated to a file.
"""

# pylint: disable=C0103
import datetime
import glob
import json
import os

from Utils.log import Logger  # pylint: disable=E0401

directory = "Manga_Data"


def create_directory_if_not_exists(dir_path):
    """
    Checks if the given directory exists, creates it if it doesn't.

    Args:
        dir_path (str): The path of the directory to check or create.
    """
    if not os.path.exists(dir_path):
        Logger.WARNING(f"Directory {dir_path} does not exist. Creating it now.")
        os.makedirs(dir_path)


def create_directory_and_get_timestamp(dir_path):
    """
    Checks if the given directory exists, creates it if it doesn't,
    and then returns the current timestamp.

    Args:
        dir_path (str): The path of the directory to check or create.

    Returns:
        str: The current timestamp in the format "YYYY-MM-DD_HH-MM-SS".
    """
    # Check if directory exists, if not, create it
    create_directory_if_not_exists(dir_path)
    # Get current timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    Logger.DEBUG(f"Current timestamp: {timestamp}")
    return timestamp


def Save_Alt_Titles_To_File(alternative_titles_dict):
    """
    Saves alternative titles to a file.

    Parameters:
    alternative_titles_dict (dict): A dictionary of alternative titles.
    directory (str): The directory where the file will be saved.

    Returns:
    None
    """
    Logger.INFO("Function Save_Alt_Titles_To_File called.")
    # Check if directory exists, if not, create it
    create_directory_if_not_exists(directory)
    # Open a file to write, this will overwrite the file if it already exists
    with open(
        f"{directory}/alternative_titles.json", "w", encoding="utf-8"
    ) as alt_titles_file:
        Logger.DEBUG(f"Writing to file: {directory}/alternative_titles.json")
        json.dump(alternative_titles_dict, alt_titles_file)
    Logger.INFO("Finished writing to file.")


def Get_Alt_Titles_From_File(alternative_titles_dict):
    """
    Retrieves alternative titles from a file.

    This function checks if the file 'alternative_titles.json' exists in the
    specified directory. If it does, it opens the file and loads the dictionary
    from it. If the file does not exist, it saves the alternative titles to the
    file and then opens it to load the dictionary.

    Parameters:
    alternative_titles_dict (dict): A dictionary of alternative titles.
    directory (str): The directory where the file is located.

    Returns:
    dict: The dictionary of alternative titles loaded from the file.
    """
    Logger.INFO("Function Get_Alt_Titles_From_File called.")
    filename = f"{directory}/alternative_titles.json"
    # Check if the directory exists, if not, create it
    create_directory_if_not_exists(directory)
    # Check if the file exists
    if os.path.exists(filename):
        Logger.DEBUG(f"File {filename} exists.")
        # Open the file to read
        with open(filename, "r", encoding="utf-8") as alt_titles_file:
            Logger.DEBUG(f"Reading from file: {filename}")
            # Load the dictionary from the file
            alternative_titles_dict = json.load(alt_titles_file)
            Logger.INFO("Loaded dictionary from file.")
            return alternative_titles_dict
    # If the file does not exist, save the dictionary to the file and then read it
    else:
        Logger.WARNING(f"File {filename} does not exist. Creating it now.")
        Save_Alt_Titles_To_File(alternative_titles_dict)
        # Open the file to read
        with open(filename, "r", encoding="utf-8") as alt_titles_file:
            Logger.DEBUG(f"Reading from file: {filename}")
            # Load the dictionary from the file
            alternative_titles_dict = json.load(alt_titles_file)
            Logger.INFO("Loaded dictionary from file.")
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
    Logger.INFO("Function manage_files called.")
    # Get a list of all files of the specified type in the directory sorted by modification time
    files = sorted(glob.glob(f"{dir_path}/{file_type}_*"), key=os.path.getmtime)
    Logger.DEBUG(f"Found {len(files)} {file_type} files in {dir_path}.")
    # If there are more than 5 files, delete the oldest file
    if len(files) > 5:
        Logger.WARNING(
            f"More than 5 {file_type} files found. Deleting oldest file: {files[0]}"
        )
        os.remove(files[0])
    else:
        Logger.INFO("No files to delete.")


def write_to_file(filename, data, formatter):
    """
    Writes data to a file.

    Parameters:
    filename (str): The name of the file to write to.
    data (list or dict): The data to write to the file.
    formatter (function): A function that formats the data into a string.

    Returns:
    None
    """
    Logger.INFO(f"Function write_to_file called with filename: {filename}")
    timestamp = create_directory_and_get_timestamp(directory)
    # Open a file to write
    with open(f"{directory}/{filename}_{timestamp}.txt", "w", encoding="utf-8") as file:
        Logger.DEBUG(f"Writing to file: {directory}/{filename}_{timestamp}.txt")
        # Write formatted data to the file
        file.writelines(formatter(data))
    Logger.INFO("Finished writing to file.")
    # Manage files in the directory
    manage_files(directory, filename)
    Logger.INFO("Managed files in directory.")


def formatter_not_found(not_found_manga_names):
    """
    Formats not found manga names for writing to a file.

    Parameters:
    not_found_manga_names (list): A list of tuples, where each tuple contains a
    manga name and the last chapter read.

    Returns:
    list: A list of strings formatted for writing to a file.
    """
    # Initialize lines list with header
    lines = ["Manga Names with No IDs Found:\n"]
    # If no not found manga names, append message to lines
    if not not_found_manga_names:
        Logger.INFO("No Manga Names with No IDs Found")
        lines.append("No Manga Names with No IDs Found\n")
    else:
        Logger.INFO("Writing Manga Names with No IDs Found")
        # Loop through each not found manga name
        for name, last_chapter_read in not_found_manga_names:
            Logger.DEBUG(f"Writing data for manga: {name}")
            # Create search link for the manga name
            search_link = (
                f"https://anilist.co/search/manga?search={name.replace(' ', '%20')}"
            )
            # Write manga name, last chapter read, and search link to file
            lines.append(
                f"{name} - Last Chapter Read: {last_chapter_read}, Search Link: {search_link}\n"
            )
    return lines


def formatter_multiple_ids(multiple_id_manga_names):
    """
    Formats manga names with multiple IDs for writing to a file.

    Parameters:
    multiple_id_manga_names (dict): A dictionary where keys are manga names and
    values are lists of tuples, each containing an ID and the last chapter read.

    Returns:
    list: A list of strings formatted for writing to a file.
    """
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
    return lines


def write_chapters_updated_to_file(filename, data):
    """
    Appends data to a chapters updated file.

    Parameters:
    filename (str): The name of the file to append to.
    data (int): The number of updated chapters.
    formatter (function): A function that formats the data into a string.

    Returns:
    None
    """
    Logger.INFO(
        f"Function write_chapters_updated_to_file called with filename: {filename}"
    )
    # Check if directory exists, if not, create it
    create_directory_if_not_exists("Chapters-Updated")
    # Open a file to append
    with open(f"Chapters-Updated/{filename}.txt", "a", encoding="utf-8") as file:
        Logger.DEBUG(f"Appending to file: Chapters-Updated/{filename}.txt")
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        file.write(f"{timestamp} | Chapters Updated: {data}\n")
    Logger.INFO("Finished appending to file.")
