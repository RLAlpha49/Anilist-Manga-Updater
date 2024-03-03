"""
This module contains functions and a class for accessing and manipulating a user's
manga list on Anilist. It includes functions to get the user ID, retrieve the user's
manga list, and get the format of a manga. It also includes the Manga class, which
represents a manga with its details.
"""

# pylint: disable=C0103, W0601, W0603, E0401

from datetime import datetime

from API.APIRequests import api_request

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
    # Define the query to get the user ID
    query = """
    query {
        Viewer {
            id
            name
        }
    }
    """
    # Send the API request
    data = api_request(query, app)
    # If the request was successful
    if data:
        # Get the user ID from the response
        userId_value = data.get("data", {}).get("Viewer", {}).get("id")
        # Return the user ID, or None if the user ID is None
        return userId_value if userId_value else None
    # If the request was not successful
    return None


def Get_User_Manga_List(app):
    """
    Retrieves the entire manga list of a user from AniList.

    Parameters:
    user_id (int): The ID of the user.
    app: The application object used to send the API request.

    Returns:
    list: The list of manga, each represented as a dictionary with 'mediaId',
    'progress', and 'status' keys.
    """
    # Define the query to get the user's manga list
    query = """
    query ($userId: Int, $chunk: Int, $perChunk: Int) {
        MediaListCollection (userId: $userId, type: MANGA, chunk: $chunk, perChunk: $perChunk) {
            lists {
                entries {
                    mediaId
                    progress
                    status
                }
            }
        }
    }
    """
    # Initialize the chunk number
    chunk = 0
    # Define the number of entries per chunk
    per_chunk = 500
    # Initialize the list of manga
    manga_list = []
    # Get the user ID
    user_Id = Get_User(app)
    # Loop indefinitely
    while True:
        # Define the variables for the query
        variables = {"userId": user_Id, "chunk": chunk, "perChunk": per_chunk}
        # Send the API request
        data = api_request(query, app, variables)
        # If the request was successful
        if data:
            # Get the list of manga from the response
            chunk_manga_list = (
                data.get("data", {}).get("MediaListCollection", {}).get("lists", [])
            )
            # If the chunk is empty, break the loop
            if not chunk_manga_list:
                break
            # Flatten the list and add it to the manga list
            for sublist in chunk_manga_list:
                for entry in sublist.get("entries", []):
                    manga_list.append(entry)
            # Increment the chunk number
            chunk += 1
        else:
            # If the request was not successful, break the loop
            break
    # Return the manga list
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
    # Define the query to get the format of the manga
    query = """
    query ($id: Int) {
        Media (id: $id) {
            id
            format
        }
    }
    """
    # Define the variables for the query
    variables = {"id": media_id}
    # Send the API request
    data = api_request(query, app, variables)
    # If the request was successful
    if data:
        # Get the format value from the response
        format_value = data.get("data", {}).get("Media", {}).get("format")
        # Return the format value, or None if the format value is None
        return format_value if format_value else None
    # If the request was not successful
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
        self.name = name
        self.id = manga_id
        self.last_chapter_read = last_chapter_read
        self.private_bool = (
            True if private_bool == "Yes" else False if private_bool == "No" else None
        )
        self.status = status
        self.last_read_at = datetime.strptime(last_read_at, "%Y-%m-%d %H:%M:%S UTC")
        self.months = months
