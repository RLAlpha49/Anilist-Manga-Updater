"""
This module contains functions for creating, saving, loading, and 
setting the configuration for the AniList API.

Functions:
- create_config: Creates a configuration dictionary.
- save_config: Saves the configuration dictionary to a file.
- Get_Config: Gets the configuration dictionary.
- load_config: Loads the configuration dictionary from a file.
- Set_Environment_Variables: Sets the environment variables with 
    the values from the configuration dictionary.
"""

# pylint: disable=C0103
# Import necessary modules
import os
import json


# Function to create a configuration dictionary
def create_config(client, secret, token=None, months=None, private=None):
    """
    Creates a configuration dictionary.

    Parameters:
    client (str): The client ID for the AniList API.
    secret (str): The client secret for the AniList API.
    token (str): The access token for the AniList API. Default is None.
    months (int): The number of months to consider for the manga updates. Default is None.
    private (bool): The privacy setting for the manga updates. Default is None.

    Returns:
    dict: The configuration dictionary.
    """
    # Create and return the configuration dictionary directly
    return {
        "ANILIST_CLIENT_ID": client,
        "ANILIST_CLIENT_SECRET": secret,
        "ACCESS_TOKEN": token,
        "MONTHS": months,
        "PRIVATE": private,
    }


# Function to save the configuration dictionary to a file
def save_config(config, file_path):
    """
    Saves the configuration dictionary to a file.

    Parameters:
    config (dict): The configuration dictionary.
    file_path (str): The path to the configuration file.
    """
    # Open the configuration file in write mode with explicit encoding
    with open(file_path, "w", encoding="utf-8") as file:
        # Write the configuration dictionary to the file in JSON format
        json.dump(config, file, indent=4)


# Function to get the configuration dictionary
def Get_Config(app):
    """
    Gets the configuration dictionary.

    This function loads the configuration dictionary and sets the environment variables
    with the values from the configuration dictionary.

    Parameters:
    app (App): The application object.
    """
    # Load the configuration dictionary from the file
    config = load_config("config.json")

    if config:
        # If the configuration dictionary is loaded successfully, print a message
        app.update_terminal("Configuration file found.")

        # Set the environment variables with the values from the configuration dictionary
        Set_Environment_Variables(config)
        app.update_terminal("Environment variables set.")
    else:
        # If the configuration dictionary is not loaded successfully, print a message
        message = (
            "\nConfiguration file not found. Please use buttons on the left side "
            "to set the Client, Secret ID's, as well as the Private value and number of Months"
        )
        app.update_terminal(message)


# Function to load the configuration dictionary from a file
def load_config(file_path):
    """
    Loads the configuration dictionary from a file.

    Parameters:
    file_path (str): The path to the configuration file.

    Returns:
    dict: The configuration dictionary if the file is found, otherwise None.
    """
    try:
        # Open the configuration file in read mode with explicit encoding
        with open(file_path, "r", encoding="utf-8") as file:
            # Load the configuration dictionary from the file
            config = json.load(file)
        # Return the configuration dictionary
        return config
    except FileNotFoundError:
        # If the configuration file is not found, return None
        return None


# Function to set the environment variables
def Set_Environment_Variables(config):
    """
    Sets the environment variables with the values from the configuration dictionary.

    Parameters:
    config (dict): The configuration dictionary.
    """
    # Set the environment variables with the values from the configuration dictionary
    for key, value in config.items():
        if value is not None:
            os.environ[key] = value
