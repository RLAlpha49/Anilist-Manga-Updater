"""
This module contains functions to update manga details such as status, progress,
and privacy settings. It also includes functions to handle the updating process,
including creating a dictionary of variables for updating, updating the status
and progress of the manga, and sending the update request to the Anilist API.
"""

# pylint: disable=C0103, W0601, W0603, E0401

from datetime import datetime, timedelta

from API.AccessAPI import (  # noqa: F401
    Get_User,
    chapters_updated,
    status_mapping,
    userId,
)
from API.APIRequests import api_request
from Utils.log import Logger


def update_manga_variables(manga_id, progress=None, status=None, private=None):
    """
    Creates a dictionary of variables for updating a manga.

    Parameters:
    manga_id (int): The ID of the manga to update.
    progress (int): The progress of the manga. Default is None.
    status (str): The status of the manga. Default is None.
    private (bool): The privacy setting of the manga. Default is None.

    Returns:
    dict: A dictionary of variables for updating a manga, excluding any parameters that are None.
    """
    Logger.INFO("Function update_manga_variables called.")
    variables = {
        "mediaId": manga_id,
        "progress": progress,
        "status": status,
        "private": private,
    }
    Logger.DEBUG(f"Created the variables dictionary: {variables}")
    # Only return variables that are not None
    filtered_variables = {k: v for k, v in variables.items() if v is not None}
    Logger.DEBUG(f"Filtered the variables dictionary: {filtered_variables}")
    return filtered_variables


def Update_Manga(manga, app, chapter_anilist, manga_status):
    """
    Updates the manga in the user's list.

    This function gets the user ID if it's not already set, updates the status of the manga,
    updates the variables for the manga, and updates the progress of the manga.

    Args:
    manga: The manga to update.
    app: The application instance.
    chapter_anilist: The current progress of the manga in the user's list.
    manga_status: The current status of the manga in the user's list.

    Returns:
    None
    """
    global userId

    Logger.INFO("Function Update_Manga called.")
    # Get the user ID
    if userId is None:
        Logger.INFO("User ID is not set. Getting the user ID.")
        userId = Get_User(app)
        Logger.DEBUG(f"Got the user ID: {userId}")

    Logger.INFO("Updating the status of the manga.")
    manga.status = update_status(manga)
    Logger.DEBUG(f"Updated the status of the manga to: {manga.status}")

    Logger.INFO("Updating the variables for the manga.")
    variables_list = update_variables(manga, chapter_anilist, manga_status)
    Logger.DEBUG(f"Updated the variables for the manga: {variables_list}")

    Logger.INFO("Updating the progress of the manga.")
    updated = update_manga_progress(manga, app, variables_list, chapter_anilist)
    Logger.DEBUG("Updated the progress of the manga.")
    return updated


def update_status(manga):
    """
    Updates the status of the given manga.

    This function checks the current status of the manga. If the status is not
    "plan_to_read" and the last read date is more than a certain number of months
    ago, the status is updated to "PAUSED". Otherwise, the status is mapped using
    the status_mapping dictionary.

    Args:
    manga: The manga object whose status is to be updated. The manga object should
    have 'status', 'months', and 'last_read_at' attributes.

    Returns:
    str: The updated status of the manga.
    """
    Logger.INFO("Function update_status called.")
    if manga.status != "plan_to_read":
        Logger.DEBUG("The manga status is not 'plan_to_read'.")
        # Check if last_read_at is more than # months ago
        if int(manga.months) != 0:
            Logger.DEBUG("The manga has been read in the past.")
            if datetime.now() - manga.last_read_at >= timedelta(
                days=30 * int(manga.months)
            ):
                Logger.INFO(
                    "The last read date is more than a certain number "
                    "of months ago. Updating the status to 'PAUSED'."
                )
                return "PAUSED"
            Logger.DEBUG(
                "The last read date is not more than a certain number "
                "of months ago. Mapping the status."
            )
            return status_mapping.get(manga.status.lower(), manga.status)
        Logger.DEBUG("The manga has not been read in the past. Mapping the status.")
        return status_mapping.get(manga.status.lower(), manga.status)
    Logger.DEBUG("The manga status is 'plan_to_read'. Mapping the status.")
    return status_mapping.get(manga.status.lower(), manga.status)


def update_variables(manga, chapter_anilist, manga_status):
    """
    Updates the variables for the given manga.

    This function checks the status of the manga and its last read chapter against
    the status and chapter from Anilist. Depending on the conditions, it updates the
    variables accordingly and appends them to a list.

    Args:
    manga: The manga object whose variables are to be updated. The manga object
    should have 'status', 'last_chapter_read', and 'private_bool' attributes.
    chapter_anilist: The current chapter of the manga from Anilist.
    manga_status: The current status of the manga.

    Returns:
    list: A list of updated variables for the manga.
    """
    Logger.INFO("Function update_variables called.")
    variables_list = []
    Logger.DEBUG(f"Manga: {manga.name} (status: {manga_status})")

    if manga_status == "COMPLETED":
        Logger.DEBUG("The current manga status is 'COMPLETED'. Skipping status update.")
    elif manga.status == "PLANNING" or (
        manga.status != manga_status
        and (manga.last_chapter_read <= chapter_anilist or chapter_anilist is None)
    ):
        Logger.DEBUG(
            "The manga status is 'PLANNING' or the manga status is not equal to the AniList status "
            "and the last read chapter is less than or equal to the AniList chapter "
            "or the AniList chapter is None."
        )
        manga.last_chapter_read = (
            0 if manga.status == "PLANNING" else manga.last_chapter_read
        )
        Logger.DEBUG(f"Updated the last read chapter to: {manga.last_chapter_read}")
        chapter_anilist = 0 if manga.status == "PLANNING" else chapter_anilist
        Logger.DEBUG(f"Updated the AniList chapter to: {chapter_anilist}")

        first_variables = update_manga_variables(
            manga.id, status=manga.status, private=manga.private_bool
        )
        Logger.DEBUG(f"Updated the first set of variables: {first_variables}")

        variables_list.append(first_variables)
        Logger.DEBUG("Appended the first set of variables to the list.")

    elif manga.last_chapter_read > chapter_anilist or chapter_anilist is None:
        Logger.DEBUG(
            "The last read chapter is greater than the AniList chapter "
            "or the AniList chapter is None."
        )
        first_variables = update_manga_variables(
            manga.id,
            progress=((chapter_anilist if chapter_anilist is not None else 0) + 1),
            private=manga.private_bool,
        )
        third_variables = None

        Logger.DEBUG(f"Updated the first set of variables: {first_variables}")

        if manga.status == "PLANNING":
            second_variables = update_manga_variables(
                manga.id,
                progress=manga.last_chapter_read,
            )
            Logger.DEBUG(f"Updated the second set of variables: {second_variables}")

            third_variables = update_manga_variables(manga.id, status=manga.status)
            Logger.DEBUG(f"Updated the third set of variables: {third_variables}")
        else:
            second_variables = update_manga_variables(
                manga.id,
                status=manga.status,
                progress=manga.last_chapter_read,
            )
            Logger.DEBUG(f"Updated the second set of variables: {second_variables}")

        variables_list.extend(
            [
                v
                for v in [first_variables, second_variables, third_variables]
                if v is not None
            ]
        )
        Logger.DEBUG(
            "Appended the first, second, and third sets of variables to the list."
        )

    Logger.INFO("Returning the list of variables.")
    return variables_list


def update_manga_progress(manga, app, variables_list, chapter_anilist):
    """
    Updates the progress of the given manga.

    This function sends a mutation request to the Anilist API to update the progress of the manga.
    It iterates over the list of variables, sends the request for each set of variables, and checks
    the response. If the response is successful and the last read is greater than the chapter from
    Anilist, updates the chapter progress and prints a message. If the response is not successful,
    it prints an error message and returns.

    Args:
    manga: The manga object whose progress is to be updated. The manga object should have 'name',
    'id', and 'last_chapter_read' attributes.
    app: The application instance.
    variables_list: A list of dictionaries, each containing the variables for the mutation request.
    chapter_anilist: The current chapter of the manga from Anilist.

    Returns:
    None
    """
    global chapters_updated
    variables_mediaId = None

    query = """
    mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $private: Boolean) {
        SaveMediaListEntry (mediaId: $mediaId, status: $status, progress: $progress, private: $private) {
            id
            status
            progress
            private
        }
    }
    """

    update_sent = False

    Logger.INFO("Function update_manga_progress called.")
    for variables in variables_list:
        Logger.DEBUG(f"Processing variables: {variables}")
        previous_mediaId = variables.get("mediaId")
        response = api_request(query, app, variables)
        Logger.DEBUG(f"Received response: {response}")
        if response:
            Logger.INFO("Response is successful.")
            if manga.last_chapter_read > chapter_anilist or chapter_anilist is None:
                Logger.DEBUG(
                    "Last read chapter is greater than AniList chapter or AniList chapter is None."
                )
                if previous_mediaId != variables_mediaId:
                    Logger.DEBUG("Previous mediaId is not equal to variables_mediaId.")
                    variables_mediaId = previous_mediaId
                    message = (
                        f"Manga: {manga.name}({manga.id}) Has been set to chapter "
                        f"{manga.last_chapter_read} from {chapter_anilist}\n"
                    )
                    Logger.INFO(message)
                    app.update_terminal(message)
                    chapters_updated += manga.last_chapter_read - chapter_anilist
                    Logger.DEBUG(f"Updated chapters_updated to: {chapters_updated}")
                    update_sent = True
            else:
                Logger.DEBUG(
                    "Last read chapter is less than or equal to AniList chapter."
                )
                app.update_terminal(
                    f"Manga: {manga.name}({manga.id}) Has less than or equal chapter progress\n"
                )
                break
        else:
            Logger.ERROR("Response is not successful.")
            app.update_terminal("Failed to alter data.")
            return None
    if not update_sent:
        return False

    return True


def Get_Chapters_Updated():
    """
    Get the number of chapters updated.

    This function returns the global variable chapters_updated which keeps
    track of the number of chapters updated.

    Returns:
        int: The number of chapters updated.
    """
    Logger.INFO("Function Get_Chapters_Updated called.")
    Logger.DEBUG(f"Returning the number of chapters updated: {chapters_updated}")
    return chapters_updated


def Set_Chapters_Updated():
    """
    Set the number of chapters updated to zero.

    This function sets the global variable chapters_updated to zero.
    It's typically used to reset the count of chapters updated.
    """
    global chapters_updated
    Logger.INFO("Function Set_Chapters_Updated called.")
    chapters_updated = 0
    Logger.DEBUG("Set the number of chapters updated to zero.")
