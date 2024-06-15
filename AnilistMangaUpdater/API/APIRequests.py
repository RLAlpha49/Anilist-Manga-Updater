"""
This module contains functions to send API requests to Anilist's GraphQL endpoint.
It includes functions to handle rate limits, set the access token, and check if
the access token needs to be refreshed.
"""

# pylint: disable=C0103, W0601, E0401, W0603

import time
from typing import Optional, Union

import API.queries as Queries
import requests
from Utils.Config import load_config
from Utils.log import Logger

# Define the API endpoint
url = "https://graphql.anilist.co"

headers: dict[str, str] = {}


def api_request(
    query: str,
    app: object,
    variables: Optional[Union[dict, None]] = None,
    retries: int = 3,
) -> Optional[Union[dict, None]]:
    """
    Send a POST request to the API endpoint and handle rate limits.

    Parameters:
        query (str): The GraphQL query to send.
        app: The application object used to update the terminal and progress.
        variables (dict, optional): The variables for the GraphQL query.
        retries (int, optional): The number of times to retry the request if a
            500 status code is received.

    Returns:
        dict: The JSON response from the API if the request is successful, None otherwise.
    """
    global headers
    if "headers" not in globals():
        headers = {}

    Logger.INFO("Function api_request called.")
    for _ in range(retries):
        response = requests.post(
            url,
            json={"query": query, "variables": variables},
            headers=headers,  # pylint: disable=E0606
            timeout=10,
        )

        if response.status_code == 429:
            wait_time = int(response.headers.get("X-RateLimit-Reset", 0)) - int(time.time())
            wait_time = max(wait_time, 60)
            Logger.WARNING(f"Rate limit hit. Waiting for {wait_time} seconds.")
            app.update_terminal(f"\nRate limit hit. Waiting for {wait_time} seconds.")
            time.sleep(wait_time)
            return api_request(query, app, variables)

        if response.status_code == 200:
            Logger.INFO("Request successful.")
            return response.json()

        if response.status_code == 500:
            Logger.ERROR(f"Server error, retrying request. Status code: {response.status_code}")
            app.update_terminal(f"\nServer error, retrying request. Status code: {response.status_code}")
            time.sleep(2)
            continue

        Logger.ERROR(f"Failed to retrieve data. Status code: {response.status_code}")
        app.update_terminal(
            f"\nFailed to retrieve data. Status code: {response.status_code}\n" "Assumming title is not on list\n"
        )
        return None

    Logger.ERROR(f"Failed to retrieve data after {retries} retries.")
    app.update_terminal(f"\nFailed to retrieve data after {retries} retries.\nAssumming title is not on list\n")
    return None


def Set_Access_Token(app: object) -> None:
    """
    Set the access token for the API requests.

    This function loads the configuration from a JSON file and sets the
    access token for the API requests. If the access token is not found
    in the configuration, it prints an error message. If the configuration
    file is not found, it prints an error message and returns.

    Parameters:
        app: The application object used to update the terminal and progress.

    Returns:
        None
    """
    global headers
    Logger.INFO("Function Set_Access_Token called.")
    config = load_config("config.json")
    Logger.DEBUG("Loaded the configuration from config.json.")
    if config is not None:
        try:
            if config["ACCESS_TOKEN"] is not None:
                Logger.INFO("Access token found in the configuration.")
                # Get the access token
                access_token = config["ACCESS_TOKEN"]

                # Define the headers for the API request
                headers = {"Authorization": f"Bearer {access_token}"}
                Logger.DEBUG("Defined the headers for the API request.")
            else:
                Logger.WARNING("No access token found in the configuration.")
                app.update_terminal("No access token found.")
        except KeyError:
            Logger.ERROR("No 'ACCESS_TOKEN' key in the configuration.")
            app.update_terminal("No 'ACCESS_TOKEN' key in the configuration.")
    else:
        Logger.ERROR("No config file found.")
        app.update_terminal("No config file found.")


def needs_refresh(app: object) -> Optional[Union[bool, None]]:
    """
    Check if the access token needs to be refreshed.

    This function sends a simple query to the API to check if the access token is valid.
    If the status code of the response is 401 (Unauthorized) or 400 (Bad Request),
    it means the access token is invalid and needs to be refreshed.
    In this case, it returns True. Otherwise, it returns False.

    Parameters:
        app: The application object used to update the terminal and progress.

    Returns:
        bool: True if the access token needs to be refreshed, False otherwise.
    """
    Logger.INFO("Function needs_refresh called.")
    # Define a simple query
    query = Queries.VIEWER
    Logger.DEBUG("Defined the query.")
    try:
        # Send a POST request to the API endpoint with a timeout of 10 seconds
        response = requests.post(url, json={"query": query}, headers=headers, timeout=10)
        Logger.DEBUG("Sent the POST request.")
    except requests.exceptions.RequestException:
        Logger.ERROR("Error: Cannot resolve graphql.anilist.co")
        app.update_terminal("Error: Cannot resolve graphql.anilist.co")
        app.update_terminal("Possibly due to internet connection\n")
        return None

    # If the status code is 401 (Unauthorized) or 400 (Bad Request), the access token is invalid
    if response.status_code in {401, 400}:
        Logger.ERROR("Error: Invalid Access Token")
        app.update_terminal("Error: Invalid Access Token")
        return True

    # If the status code is not 401 or 400, the access token is valid
    Logger.INFO("The access token is valid.")
    return False
