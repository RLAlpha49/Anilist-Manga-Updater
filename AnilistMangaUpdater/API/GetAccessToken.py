"""
This module contains functions for getting the access token and
authentication code for the AniList API.

Functions:
- Get_Access_Token: Gets the access token from the environment variables
    or opens the authorization URL in the web browser.
- Get_Authentication_Code: Opens the authorization URL in the web browser
    with the parameters and checks if the access token is set in the
    environment variables.
"""

# pylint: disable=C0103
# Import necessary modules
import os
import platform
import time
import webbrowser

# Define the authorization URL for AniList OAuth
authorization_url = "https://anilist.co/api/v2/oauth/authorize"


def Get_Access_Token(app):
    """
    Retrieves the AniList API access token from environment variables
    or opens the authorization URL in the web browser.

    Parameters:
    app (object): The application object.

    Returns:
    str: The access token, or None if the client ID is not found.
    """
    client_id = os.environ.get("ANILIST_CLIENT_ID")
    if client_id is None:
        app.update_terminal(
            "No client ID found. Please enter your AniList client ID with the "
            "'Set API Values' button."
        )
        return None

    auth_url = f"{authorization_url}?client_id={client_id}&response_type=token"
    if platform.system() == "Linux":
        app.update_terminal(
            "Please open the following URL in your web browser and follow the instructions:"
        )
        app.update_terminal(auth_url)
    else:
        webbrowser.open(auth_url)

    return Get_Authentication_Code()


def Get_Authentication_Code():
    """
    Checks for the presence of the access token in the environment variables in a loop.

    Returns:
    str: The access token once it's found.
    """
    while True:
        if os.environ.get("ACCESS_TOKEN") is not None:
            return os.environ.get("ACCESS_TOKEN")
        time.sleep(0.5)
