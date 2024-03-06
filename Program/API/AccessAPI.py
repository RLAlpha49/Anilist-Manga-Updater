"""
This module contains functions and a class for accessing and manipulating a user's
manga list on Anilist. It includes functions to get the user ID, retrieve the user's
manga list, and get the format of a manga. It also includes the Manga class, which
represents a manga with its details.
"""

# pylint: disable=C0103, W0601, W0603, E0401

from datetime import datetime

import API.queries as Queries
from API.APIRequests import api_request
from Utils.log import log

# Initialize the counter for the number of chapters updated
chapters_updated = 0

# Initialize userId
userId = None

# Initialize the dictionary for the status mapping
status_mapping = {
    "reading": "CURRENT",
    "completed": "COMPLETED",
    "on_hold": "PAUSED",
    "dropped": "DROPPED",
    "plan_to_read": "PLANNING",
}


# Function to get the user ID
def Get_User(app):
    """
    Retrieves the user ID from the Viewer object.

    Parameters:
    app: The application object used to send the API request.

    Returns:
    int: The user ID if the request was successful and the user ID is not None, otherwise None.
    """
    log("Function Get_User called.")
    # Define the query to get the user ID
    query = Queries.VIEWER
    log("Defined the query to get the user ID.")
    # Send the API request
    data = api_request(query, app)
    log("Sent the API request.")
    # If the request was successful
    if data:
        log("The request was successful.")
        # Get the user ID from the response
        userId_value = data.get("data", {}).get("Viewer", {}).get("id")
        log(f"Got the user ID from the response: {userId_value}.")
        # Return the user ID, or None if the user ID is None
        return userId_value if userId_value else None
    # If the request was not successful
    log("The request was not successful.")
    return None


def Get_User_Manga_List(app):
    """
    Retrieves the entire manga list of a user from AniList.

    Parameters:
    app: The application object used to send the API request.

    Returns:
    list: The list of manga, each represented as a dictionary with 'mediaId',
    'progress', and 'status' keys.
    """
    log("Function Get_User_Manga_List called.")
    # Define the query to get the user's manga list
    query = Queries.MANGALIST
    log("Defined the query to get the user's manga list.")
    # Initialize the chunk number
    chunk = 0
    log("Initialized the chunk number.")
    # Define the number of entries per chunk
    per_chunk = 500
    log("Defined the number of entries per chunk.")
    # Initialize the list of manga
    manga_list = []
    log("Initialized the list of manga.")
    # Get the user ID
    user_Id = Get_User(app)
    log(f"Got the user ID: {user_Id}.")
    # Loop indefinitely
    while True:
        log("Starting a new loop iteration.")
        # Define the variables for the query
        variables = {"userId": user_Id, "chunk": chunk, "perChunk": per_chunk}
        log("Defined the variables for the query.")
        # Send the API request
        data = api_request(query, app, variables)
        log("Sent the API request.")
        # If the request was successful
        if data:
            log("The request was successful.")
            # Get the list of manga from the response
            chunk_manga_list = (
                data.get("data", {}).get("MediaListCollection", {}).get("lists", [])
            )
            log(f"Got the list of manga from the response: {chunk_manga_list}.")
            # If the chunk is empty, break the loop
            if not chunk_manga_list:
                log("The chunk is empty. Breaking the loop.")
                break
            # Flatten the list and add it to the manga list
            for sublist in chunk_manga_list:
                for entry in sublist.get("entries", []):
                    manga_list.append(entry)
            log(f"Added the entries from the chunk to the manga list: {manga_list}.")
            # Increment the chunk number
            chunk += 1
            log(f"Incremented the chunk number to: {chunk}.")
        else:
            # If the request was not successful, break the loop
            log("The request was not successful. Breaking the loop.")
            break
    # Return the manga list
    log("Returning the manga list.")
    return manga_list


# Function to get the format of the manga
def Get_Format(media_id, app):
    """
    Retrieves the format of a media item from AniList.

    Parameters:
    media_id (int): The ID of the media item.
    app: The application object used to send the API request.

    Returns:
    str: The format of the media item if the request was successful and
    the format is not None, otherwise None.
    """
    log(f"Function Get_Format called with media_id: {media_id}")
    # Define the query to get the format of the manga
    query = Queries.FORMAT
    log("Defined the query to get the format of the manga.")
    # Define the variables for the query
    variables = {"id": media_id}
    log("Defined the variables for the query.")
    # Send the API request
    data = api_request(query, app, variables)
    log("Sent the API request.")
    # If the request was successful
    if data:
        log("The request was successful.")
        # Get the format value from the response
        format_value = data.get("data", {}).get("Media", {}).get("format")
        log(f"Got the format value from the response: {format_value}.")
        # Return the format value, or None if the format value is None
        return format_value if format_value else None
    # If the request was not successful
    log("The request was not successful. Returning None.")
    return None


class Manga:  # pylint: disable=R0903
    """
    Represents a Manga with its details.

    Attributes:
    name: The name of the manga.
    id: The ID of the manga.
    last_chapter_read: The last chapter of the manga that was read.
    private_bool: A boolean indicating whether the manga is private.
    status: The status of the manga.
    last_read_at: The date and time when the manga was last read.
    months: The number of months since the manga was last read.
    """

    def __init__(  # pylint: disable=R0913
        self,
        name,
        manga_id,
        last_chapter_read,
        private_bool,
        status,
        last_read_at,
        months,
    ):
        log("Initializing a new Manga object.")
        self.name = name
        log(f"Set the name attribute to: {name}.")
        self.id = manga_id
        log(f"Set the id attribute to: {manga_id}.")
        self.last_chapter_read = last_chapter_read
        log(f"Set the last_chapter_read attribute to: {last_chapter_read}.")
        self.private_bool = (
            True if private_bool == "Yes" else False if private_bool == "No" else None
        )
        log(f"Set the private_bool attribute to: {self.private_bool}.")
        self.status = status
        log(f"Set the status attribute to: {status}.")
        self.last_read_at = datetime.strptime(last_read_at, "%Y-%m-%d %H:%M:%S UTC")
        log(f"Set the last_read_at attribute to: {self.last_read_at}.")
        self.months = months
        log(f"Set the months attribute to: {months}.")
