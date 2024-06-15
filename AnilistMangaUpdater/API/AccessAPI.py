"""
This module contains functions and a class for accessing and manipulating a user's
manga list on Anilist. It includes functions to get the user ID, retrieve the user's
manga list, and get the format of a manga. It also includes the Manga class, which
represents a manga with its details.
"""

# pylint: disable=C0103, W0601, W0603, E0401

import math
from datetime import datetime
from typing import Union

import API.queries as Queries
from API.APIRequests import api_request
from Utils.log import Logger

# Initialize the counter for the number of chapters updated
chapters_updated: int = 0

# Initialize userId
userId: Union[int, None] = None

# Initialize the dictionary for the status mapping
status_mapping: dict[str, str] = {
    "reading": "CURRENT",
    "completed": "COMPLETED",
    "on_hold": "PAUSED",
    "dropped": "DROPPED",
    "plan_to_read": "PLANNING",
}


# Function to get the user ID
def Get_User(app: object) -> Union[int, None]:
    """
    Retrieves the user ID from the Viewer object.

    Parameters:
        app: The application object used to send the API request.

    Returns:
        int: The user ID if the request was successful and the user ID is not None, otherwise None.
    """
    Logger.INFO("Function Get_User called.")
    query = Queries.VIEWER
    data = api_request(query, app)

    if data:
        Logger.INFO("The request was successful.")
        userId_value = data.get("data", {}).get("Viewer", {}).get("id")
        Logger.DEBUG(f"Got the user ID from the response: {userId_value}.")
        return userId_value if userId_value else None

    Logger.WARNING("The request was not successful.")
    return None


def Get_User_Manga_List(app: object) -> list[dict[str, Union[int, str]]]:
    """
    Retrieves the entire manga list of a user from AniList.

    Parameters:
        app: The application object used to send the API request.

    Returns:
        list: The list of manga, each represented as a dictionary with 'mediaId',
        'progress', and 'status' keys.
    """
    Logger.INFO("Function Get_User_Manga_List called.")
    query: str = Queries.MANGALIST
    chunk: int = 0
    per_chunk: int = 500
    manga_list: list = []
    user_Id: Union[int, None] = Get_User(app)

    while True:
        variables = {"userId": user_Id, "chunk": chunk, "perChunk": per_chunk}
        Logger.DEBUG(f"Sending API request with variables: {variables}")
        data = api_request(query, app, variables)

        if data:
            chunk_manga_list = data.get("data", {}).get("MediaListCollection", {}).get("lists", [])

            if not chunk_manga_list:
                Logger.DEBUG("No more chunks in manga list. Breaking the loop.")
                break

            manga_list += [entry for sublist in chunk_manga_list for entry in sublist.get("entries", [])]
            Logger.DEBUG(f"Added chunk to manga list. Current list length: {len(manga_list)}")
            chunk += 1
        else:
            Logger.WARNING("API request returned no data. Breaking the loop.")
            break

    return manga_list


# Function to get the format of the manga
def Get_Format(media_id: int, app: object) -> Union[str, None]:
    """
    Retrieves the format of a media item from AniList.

    Parameters:
        media_id (int): The ID of the media item.
        app: The application object used to send the API request.

    Returns:
        str: The format of the media item if the request was successful and
        the format is not None, otherwise None.
    """
    Logger.INFO(f"Function Get_Format called with media_id: {media_id}")
    # Define the query to get the format of the manga
    query = Queries.FORMAT
    variables = {"id": media_id}
    data = api_request(query, app, variables)
    Logger.DEBUG("Sent the API request.")
    # If the request was successful
    if data:
        Logger.INFO("The request was successful.")
        # Get the format value from the response
        format_value = data.get("data", {}).get("Media", {}).get("format")
        Logger.DEBUG(f"Got the format value from the response: {format_value}.")
        # Return the format value, or None if the format value is None
        return format_value if format_value else None
    # If the request was not successful
    Logger.WARNING("The request was not successful. Returning None.")
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
        name: str,
        manga_id: int,
        last_chapter_read: int,
        private_bool: str,
        status: str,
        last_read_at: str,
        months: str,
    ):
        self.name: str = name
        self.id: int = manga_id
        self.last_chapter_read: int = last_chapter_read
        self.private_bool: Union[bool, None] = (
            True if private_bool == "Yes" else False if private_bool == "No" else None
        )
        self.status: str = status
        self.last_read_at: Union[datetime, None]
        if last_read_at is None or (isinstance(last_read_at, float) and math.isnan(last_read_at)):
            self.last_read_at = None
        else:
            self.last_read_at = datetime.strptime(last_read_at, "%Y-%m-%d %H:%M:%S UTC")
        self.months: str = months
