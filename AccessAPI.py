from Config import load_config
from datetime import datetime, timedelta
import requests
import time

# Define the API endpoint
url = "https://graphql.anilist.co"

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


def Set_Access_Token(app):
    global headers
    config = load_config("config.json")
    try:
        if config["ACCESS_TOKEN"] is not None:
            # Get the access token
            access_token = config["ACCESS_TOKEN"]

            # Define the headers for the API request
            headers = {"Authorization": f"Bearer {access_token}"}
        else:
            app.update_terminal("No access token found.")
    except TypeError:
        app.update_terminal("No config file found")
        return


def needs_refresh(app):
    # Define a simple query
    query = """
    query {
        Viewer {
            id
            name
        }
    }
    """
    try:
        # Send a POST request to the API endpoint
        response = requests.post(url, json={"query": query}, headers=headers)
    except:
        app.update_terminal("Error: Cannot resolve graphql.anilist.co")
        app.update_terminal("Possibly due to internet connection\n")
        return

    # If the status code is 401 (Unauthorized), the access token is invalid
    if response.status_code == 401 or response.status_code == 400:
        app.update_terminal("Error: Invalid Access Token")
        return True

    # If the status code is not 401, the access token is valid
    return False


# Function to handle API requests
def api_request(query, app, variables=None):
    # Send a POST request to the API endpoint
    response = requests.post(
        url, json={"query": query, "variables": variables}, headers=headers
    )

    # Check the rate limit headers
    rate_limit_remaining = int(response.headers.get("X-RateLimit-Remaining", 0))
    rate_limit_reset = int(response.headers.get("X-RateLimit-Reset", 0))

    # If the rate limit has been hit, print a message and wait
    if response.status_code == 429:
        wait_time = rate_limit_reset - int(time.time())
        if wait_time < 0:
            app.update_terminal(
                f"\nReset time: {wait_time} Seconds\nError: Rate limit reset time is in the past."
            )
            wait_time = 65
            app.update_terminal(f"Waiting for {wait_time} seconds.\n")
            time.sleep(wait_time)
        else:
            app.update_terminal(f"\nRate limit hit. Waiting for {wait_time} seconds.")
            time.sleep(wait_time)
        return api_request(query, app, variables)

    # If the rate limit is close to being hit, print a warning
    elif rate_limit_remaining < 5:
        app.update_terminal(
            f"\nWarning: Only {rate_limit_remaining} requests remaining until rate limit reset."
        )

    # If the request was successful, return the JSON response
    if response.status_code == 200:
        return response.json()
    # If the request was not successful, print an error message and return None
    else:
        app.update_terminal(
            f"\nFailed to retrieve data. Status code: {response.status_code}\nAssumming title is not on list\n"
        )
        return None


def update_manga_variables(manga_id, progress=None, status=None, private=None):
    variables = {
        "mediaId": manga_id,
        "progress": progress,
        "status": status,
        "private": private,
    }
    # Only return variables that are not None
    return {k: v for k, v in variables.items() if v is not None}


# Function to get the user ID
def Get_User(app):
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
    else:
        # Return None
        return None


# Function to get the current progress and status from Anilist
def Get_Progress_Status(id, app):
    # Define the query to get the current progress and status
    query = """
    query ($mediaId: Int, $userId: Int) {
        MediaList (mediaId: $mediaId, userId: $userId) {
            userId
            mediaId
            progress
            status
        }
    }
    """
    # Define the variables for the query
    variables = {"mediaId": id, "userId": userId}
    # Send the API request
    data = api_request(query, app, variables)
    # If the request was successful
    if data:
        # Get the progress and status values from the response
        chapter_value = data.get("data", {}).get("MediaList", {}).get("progress")
        status_value = data.get("data", {}).get("MediaList", {}).get("status")
        # Return the progress value as an integer (or 0 if None), and the status value
        return int(chapter_value) if chapter_value else 0, status_value
    # If the request was not successful
    else:
        # Return 0 and None
        return 0, None


# Function to get the format of the manga
def Get_Format(id, app):
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
    variables = {"id": id}
    # Send the API request
    data = api_request(query, app, variables)
    # If the request was successful
    if data:
        # Get the format value from the response
        format_value = data.get("data", {}).get("Media", {}).get("format")
        # Return the format value, or None if the format value is None
        return format_value if format_value else None
    # If the request was not successful
    else:
        # Return None
        return None


# Function to update the progress of a manga
def Update_Manga(
    manga_name,
    manga_id,
    last_chapter_read,
    private_bool,
    status,
    last_read_at,
    months,
    app,
):
    global chapters_updated
    global userId

    variables_mediaId = None

    # Get the user ID
    if userId is None:
        userId = Get_User(app)

    private_bool = (
        True if private_bool == "Yes" else False if private_bool == "No" else None
    )

    # Get current progress and status of manga in users list
    chapter_anilist, manga_status = Get_Progress_Status(manga_id, app)

    if status != "plan_to_read":
        # Convert last_read_at to datetime object
        last_read_at = datetime.strptime(last_read_at, "%Y-%m-%d %H:%M:%S UTC")
        # Check if last_read_at is more than # months ago
        if int(months) != 0:
            if datetime.now() - last_read_at >= timedelta(days=(30 * int(months))):
                status = "PAUSED"
            else:
                status = status_mapping.get(status.lower(), status)
        else:
            status = status_mapping.get(status.lower(), status)
    else:
        status = status_mapping.get(status.lower(), status)

    # Define the mutation query to update the progress and status of the manga
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

    # List to hold the variable dictionaries
    variables_list = []

    # If status is planning or if last read chapter is not greater and status is not manga status
    if status == "PLANNING" or (
        status != manga_status
        and (last_chapter_read <= chapter_anilist or chapter_anilist is None)
    ):
        last_chapter_read = 0 if status == "PLANNING" else last_chapter_read
        chapter_anilist = 0 if status == "PLANNING" else chapter_anilist

        # Define the variables for the first API request
        first_variables = update_manga_variables(
            manga_id, status=status, private=private_bool
        )

        # Add the variables to the list
        variables_list.append(first_variables)

    # If the last chapter read is greater than the current progress or the current progress is None
    elif last_chapter_read > chapter_anilist or chapter_anilist is None:
        # Define the variables for the three API requests
        first_variables = update_manga_variables(
            manga_id, progress=(chapter_anilist + 1), private=private_bool
        )
        second_variables = update_manga_variables(
            manga_id, progress=last_chapter_read, private=private_bool
        )
        third_variables = update_manga_variables(
            manga_id, status=status, private=private_bool
        )

        # Add the variables for the three API requests to the list
        variables_list.extend([first_variables, second_variables, third_variables])

    # If the last chapter read is not greater than the current progress
    else:
        # Print a message indicating that the manga is already set to the last chapter read
        app.update_terminal(
            f"Manga: {manga_name}({manga_id}) is already set to last chapter read.\n"
        )
        return

    # Iterate over the variable dictionaries in the list
    for variables in variables_list:
        previous_mediaId = variables.get("mediaId")
        # Send the API request to update the status and progress of the manga
        response = api_request(query, app, variables)
        # If the API request was successful
        if response:
            if last_chapter_read > chapter_anilist or chapter_anilist is None:
                if previous_mediaId != variables_mediaId:
                    variables_mediaId = previous_mediaId
                    # Print a success message
                    app.update_terminal(
                        f"Manga: {manga_name}({manga_id}) Has been set to chapter {last_chapter_read} from {chapter_anilist}\n"
                    )
                    # Update the counter for the number of chapters updated
                    chapters_updated += last_chapter_read - chapter_anilist
            else:
                # Print a success message
                app.update_terminal(
                    f"Manga: {manga_name}({manga_id}) Has less than or equal chapter progress\n"
                )
                break
        # If the API request was not successful
        else:
            # Print an error message
            app.update_terminal(f"Failed to alter data.")
            return


# Function to get the number of chapters updated
def Get_Chapters_Updated():
    # Return the global variable chapters_updated
    return chapters_updated


def Set_Chapters_Updated():
    global chapters_updated
    chapters_updated = 0
