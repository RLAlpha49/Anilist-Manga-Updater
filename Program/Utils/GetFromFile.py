"""
This module contains functions for reading manga data from a CSV file,
getting the difference between the current and previous file,
getting the manga names and their details, and printing the manga found in the CSV file.
"""

# pylint: disable=C0103, W0602, W0603, E0401
# Import necessary modules
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd

from Utils.dictionaries import alternative_titles_dict
from Utils.log import Logger
from Utils.WriteToFile import Get_Alt_Titles_From_File

# Initialize an empty dictionary to store the manga names and chapters
manga_names_chapters = {}

alternative_titles_dict = Get_Alt_Titles_From_File(alternative_titles_dict)


def Manga_Found_In_CSV(app):  # pylint: disable=R1710
    """
    Prints the manga found in the CSV file.

    This function gets the manga with the last chapter from the CSV file and
    prints the title, last chapter read, and last read at for each manga.

    Parameters:
    app (App): The application object.

    Returns:
    None
    """
    Logger.INFO("Function Manga_Found_In_CSV called.")
    manga_with_last_chapter = Get_Manga_Names(app, alternative_titles_dict)
    Logger.DEBUG("Retrieved manga with last chapter from CSV file.")

    with ThreadPoolExecutor(max_workers=1) as executor:
        # Create a list to store the futures
        futures = []

        for title, details in manga_with_last_chapter.items():
            # Submit the task to the executor
            future = executor.submit(process_manga_details, title, details)
            futures.append(future)

        # Gather the results
        messages = []
        for future in as_completed(futures):
            messages.append(future.result())

        # Update the terminal
        app.update_terminal("\n".join(messages))


def process_manga_details(title, details):
    """
    Process the details of a manga.

    Args:
    title (str): The title of the manga.
    details (dict): A dictionary containing details about the manga.

    Returns:
    str: A formatted string containing the processed information.
    """
    last_chapter_read = details.get("last_chapter_read")
    last_read_at = details.get("last_read_at")
    Logger.DEBUG(f"Processing manga: {title}")
    return f"Title: {title}, Last Chapter Read: {last_chapter_read}, Last Read At: {last_read_at}"


def get_alternative_title(title, alt_titles_dict):
    """
    Gets the alternative title of a manga.

    This function checks if a manga title is in a dictionary of alternative titles.
    If it is, it returns the alternative title. If it's not, it returns the original title.

    Parameters:
    title (str): The title of the manga.
    alt_titles_dict (dict): A dictionary of alternative titles.

    Returns:
    str: The alternative title if it exists, otherwise the original title.
    """
    Logger.INFO("Function get_alternative_title called.")
    # Check if the title is in the dictionary
    if title in alt_titles_dict:
        # If it is, return the alternative title
        Logger.DEBUG(f"Alternative title found for {title}.")
        return alt_titles_dict[title]
    # If it's not, return the original title
    Logger.DEBUG(f"No alternative title found for {title}. Returning original title.")
    return title


# Function to get manga names from a file
def Get_Manga_Names(app, alt_titles_dict):
    """
    Gets the manga names from a file and stores them in a dictionary.

    This function gets the difference between the current and previous file,
    iterates through each row in the file, and gets the title, last chapter read,
    status, and last read at from the row. It then gets the alternative title and
    adds it and its details to the manga_names_chapters dictionary.

    Parameters:
    app (App): The application object.
    alt_titles_dict (dict): A dictionary where keys are manga names and
    values are alternative titles.

    Returns:
    None
    """
    Logger.INFO("Function Get_Manga_Names called.")
    global manga_names_chapters
    # Get the difference between the current and previous file
    file = Get_File_Diff(app)
    try:
        # Iterate through each row in the file
        for row in file.itertuples():
            # Get the title, last chapter read, status, and last read at from the row
            title = row.title
            # Get the alternative title
            alt_title = get_alternative_title(title, alt_titles_dict)
            last_chapter_read = row.last_chapter_read
            status = row.status
            last_read_at = row.last_read_at
            Logger.DEBUG(
                f"Processing row: {title}, {last_chapter_read}, {status}, {last_read_at}"
            )

            try:
                # Add the alternative title and its details to the manga_names_chapters dictionary
                manga_names_chapters[alt_title] = {
                    "last_chapter_read": int(last_chapter_read),
                    "status": status,
                    "last_read_at": last_read_at,
                }
                Logger.DEBUG(f"Added {alt_title} to manga_names_chapters dictionary.")
            except (ValueError, AttributeError):
                # If no last chapter read, print a message and add the alternative title
                app.update_terminal(f"Title: {alt_title}, Has no Last Chapter Read")
                app.update_terminal(status)
                if status == "plan_to_read":
                    manga_names_chapters[alt_title] = {"status": status}
                    Logger.DEBUG(
                        f"Added {alt_title} to manga_names_chapters dictionary "
                        "with status plan_to_read."
                    )
    except AttributeError:
        Logger.ERROR("AttributeError encountered. Returning None.")
        return None

    # Return the manga_names_chapters dictionary
    Logger.INFO("Returning manga_names_chapters dictionary.")
    return manga_names_chapters


# Function to get the difference between the current and previous file
def Get_File_Diff(app):
    """
    Gets the difference between the current and previous file.

    This function reads the current file and checks if there is a previous file.
    If there is a previous file, it reads it. If the file is not found, it prints
    an error message.

    Parameters:
    app (App): The application object.

    Returns:
    None
    """
    Logger.INFO("Function Get_File_Diff called.")
    global manga_names_chapters
    df_previous = None
    try:
        manga_names_chapters = {}
        # Read the current file
        df = pd.read_csv(app.file_path)
        # Check if there is a previous file
        Logger.DEBUG(f"Read current file: {app.file_path}")
        has_previous_file = app.previous_file_path != ""
        if has_previous_file:
            # If there is a previous file, read it
            df_previous = pd.read_csv(app.previous_file_path)
            Logger.DEBUG(f"Read previous file: {app.previous_file_path}")
    except FileNotFoundError:
        # If the file is not found, print an error message
        app.update_terminal(
            "Error: Please browse for a kenmei export file. (Previous is Optional)"
        )
        Logger.ERROR("FileNotFoundError encountered. Returning None.")
        return None

    if has_previous_file and df_previous is not None:
        df_diff = pd.merge(
            df,
            df_previous,
            how="outer",
            indicator=True,
            on=["title", "status", "last_chapter_read", "last_read_at"],
        )
        df_diff = df_diff[df_diff["_merge"] == "left_only"]
        Logger.INFO("Returning difference between current and previous file.")
        return df_diff
    Logger.INFO("Returning current file.")
    return df
