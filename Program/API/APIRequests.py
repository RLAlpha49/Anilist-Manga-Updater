"""
This module contains functions to send API requests to Anilist's GraphQL endpoint.
It includes functions to handle rate limits, set the access token, and check if 
the access token needs to be refreshed.
"""

# pylint: disable=C0103, W0601, E0401

import time
import requests

from Utils.Config import load_config

# Define the API endpoint
url = "https://graphql.anilist.co"


def api_request(query, app, variables=None, retries=3):
    """
    Send a POST request to the API endpoint and handle rate limits.

    This function sends a POST request to the API endpoint with the given query and variables.
    It also checks the rate limit headers and waits if the rate limit has been hit.
    If the rate limit is close to being hit, it prints a warning.
    If the request is successful, it returns the JSON response.
    If the request is not successful, it prints an error message and returns None.

    Parameters:
        query (str): The GraphQL query to send.
        app: The application object used to update the terminal and progress.
        variables (dict, optional): The variables for the GraphQL query.
        retries (int, optional): The number of times to retry the request if a
            500 status code is received.

    Returns:
        dict: The JSON response from the API if the request is successful, None otherwise.
    """
    for _ in range(retries):
        response = requests.post(
            url,
            json={"query": query, "variables": variables},
            headers=headers,
            timeout=10,
        )

        rate_limit_remaining = int(response.headers.get("X-RateLimit-Remaining", 0))
        rate_limit_reset = int(response.headers.get("X-RateLimit-Reset", 0))

        if response.status_code == 429:
            wait_time = rate_limit_reset - int(time.time())
            if wait_time < 0:
                app.update_terminal(
                    f"\nReset time: {wait_time} Seconds\n"
                    "Error: Rate limit reset time is in the past."
                )
                wait_time = 65
                app.update_terminal(f"Waiting for {wait_time} seconds.\n")
                time.sleep(wait_time)
            else:
                app.update_terminal(
                    f"\nRate limit hit. Waiting for {wait_time} seconds."
                )
                time.sleep(wait_time)
            return api_request(query, app, variables)

        if rate_limit_remaining < 5:
            app.update_terminal(
                f"\nWarning: Only {rate_limit_remaining} requests remaining until rate limit reset."
            )

        if response.status_code == 200:
            return response.json()

        if response.status_code == 500:
            app.update_terminal(
                f"\nServer error, retrying request. Status code: {response.status_code}"
            )
            time.sleep(2)
            continue

        app.update_terminal(
            f"\nFailed to retrieve data. Status code: {response.status_code}\n"
            "Assumming title is not on list\n"
        )
        return None

    app.update_terminal(
        f"\nFailed to retrieve data after {retries} retries. Status code: 500\n"
        "Assumming title is not on list\n"
    )
    return None


def Set_Access_Token(app):
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
        # Send a POST request to the API endpoint with a timeout of 10 seconds
        response = requests.post(
            url, json={"query": query}, headers=headers, timeout=10
        )
    except requests.exceptions.RequestException:
        app.update_terminal("Error: Cannot resolve graphql.anilist.co")
        app.update_terminal("Possibly due to internet connection\n")
        return None

    # If the status code is 401 (Unauthorized) or 400 (Bad Request), the access token is invalid
    if response.status_code in {401, 400}:
        app.update_terminal("Error: Invalid Access Token")
        return True

    # If the status code is not 401 or 400, the access token is valid
    return False
