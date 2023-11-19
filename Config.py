import os
import json

def create_config(client, secret, token=None, months=None, private=None):
    # Create and return the configuration dictionary directly
    return {
        'ANILIST_CLIENT_ID': client,
        'ANILIST_CLIENT_SECRET': secret,
        'ACCESS_TOKEN': token,
        'MONTHS': months,
        'PRIVATE': private
    }

def save_config(config, file_path):
    print(config)
    # Open the configuration file in write mode
    with open(file_path, 'w') as file:
        # Write the configuration dictionary to the file in JSON format
        json.dump(config, file, indent=4)

def load_config(file_path):
    try:
        # Open the configuration file in read mode
        with open(file_path, 'r') as file:
            # Load the configuration dictionary from the file
            config = json.load(file)
        # Return the configuration dictionary
        return config
    except FileNotFoundError:
        # If the configuration file is not found, return None
        return None

def Get_Config(app):
    # Load the configuration dictionary from the file
    config = load_config('config.json')

    if config:
        # If the configuration dictionary is loaded successfully, print a message
        app.update_terminal("Configuration file found.")
        
        Set_Environment_Variables(config)
        app.update_terminal("Environment variables set.")
    else:
        # If the configuration dictionary is not loaded successfully, create a new one
        app.update_terminal("\nConfiguration file not found. Please use buttons on the left side to set the Client, Secret ID's, as well as the Private value and number of Months")

def Set_Environment_Variables(config):
    # Set the environment variables with the values from the configuration dictionary
    for key, value in config.items():
        if value is not None:
            os.environ[key] = value