"""
This module is responsible for handling all operations related to MangaSearch.

It includes classes and methods to search for a manga on Anilist, process the search results,
retrieve the ID of the manga, and handle any errors that occur during these operations.

Classes:
    MangaSearch: Represents a search for a manga on Anilist.

Functions:
    process_title(title): Processes the title by replacing certain characters.
    check_title_match(title): Checks if the title matches the name.
    handle_server_error(e): Handles server errors.
"""

# pylint: disable=C0103, W0602, W0603, E0401

# Import necessary modules and functions
import string

from Utils.WriteToFile import Write_Multiple_IDs, Write_Not_Found

# Initialize an empty list to store names of manga that are not found
no_manga_found = []


def Set_No_Manga_Found():
    """
    Resets the global variable 'no_manga_found' to an empty list.

    This function does not take any parameters and does not return anything.
    """
    global no_manga_found
    no_manga_found = []


def Check_Title_Match(title, name):
    """
    Checks if all words in the search name are in the title.

    This function removes punctuation from the title and the search name,
    splits them into words, and checks if all words in the search name
    are in the title.

    Parameters:
    title (str): The title to check.
    name (str): The search name.

    Returns:
    bool: True if all words in the search name are in the title, False otherwise.
    """
    # Remove punctuation from the title and the search name
    title = title.translate(str.maketrans("", "", string.punctuation))
    name = name.translate(str.maketrans("", "", string.punctuation))

    # Split the title and the search name into words
    title_words = set(title.lower().split())
    name_words = set(name.lower().split())

    # Check if all words in the search name are in the title
    return name_words.issubset(title_words)


# Function to clean the manga IDs
def Clean_Manga_IDs(manga_names_ids, app):
    """
    Cleans the manga IDs by removing duplicates and separating manga with multiple unique IDs.

    Parameters:
    manga_names_ids (dict): A dictionary mapping manga names to lists of IDs.
    app: The application object used to update the terminal and progress.

    Returns:
    dict: A dictionary mapping manga names to lists of unique IDs.
    Manga with multiple unique IDs are not included.
    """
    # Initialize dictionaries to store cleaned manga names and IDs, manga names with multiple IDs
    cleaned_manga_names_ids = {}
    multiple_id_manga_names = {}

    # Iterate through manga names and their IDs
    for manga_name, id_list in manga_names_ids.items():
        # Remove duplicates within the same manga name
        unique_ids = list(set(id_list))

        # Check if there are multiple unique IDs
        if len(unique_ids) > 1:
            # If there are multiple unique IDs, add the manga name and IDs to the dictionary
            multiple_id_manga_names[manga_name] = unique_ids
        else:
            # If only one ID, add it directly to the cleaned dictionary
            cleaned_manga_names_ids[manga_name] = unique_ids

    # Print the manga names with multiple IDs
    app.update_terminal("\nDuplicate Manga Names and IDs:")
    if not multiple_id_manga_names:
        app.update_terminal("No Manga Names with Multiple IDs Found\n")
    else:
        for manga_name, ids in multiple_id_manga_names.items():
            app.update_terminal(f"\n{manga_name}")
            for id_info in ids:
                manga_id, last_chapter_read, status, last_read_at = id_info
                message = (
                    f"ID: {manga_id}, "
                    f"Last Chapter Read: {last_chapter_read}, "
                    f"Status: {status}, "
                    f"Last Read At: {last_read_at}"
                )
                app.update_terminal(message)
        app.update_terminal("\n")
    # Write the manga names with multiple IDs to a file
    app.update_progress_and_status(
        "Writing multiple ID's file...", ((5.5 + (0.5 / 3)) / 10)
    )
    Write_Multiple_IDs(multiple_id_manga_names)
    # Return the cleaned manga names and IDs
    return cleaned_manga_names_ids


# Function to get the manga not found
def Get_No_Manga_Found(app):
    """
    Retrieves and prints the list of manga not found.

    This function writes the list of manga not found to a file and prints them to the terminal.

    Parameters:
    app: The application object used to update the terminal.

    Returns:
    None
    """
    # Write the manga not found to a file
    Write_Not_Found(no_manga_found)
    # Print the manga not found
    app.update_terminal("\nNot Found Manga:")
    if not no_manga_found:
        app.update_terminal("No Manga Not Found\n")
    else:
        for manga in no_manga_found:
            name, last_chapter_read = manga
            app.update_terminal(
                f"{name}, Last Chapter Read: {last_chapter_read}, Status: Not Found"
            )
        app.update_terminal("\n")
