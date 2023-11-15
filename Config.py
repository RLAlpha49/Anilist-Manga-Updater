import os
import json

def create_config():
    # Create a new configuration dictionary
    config = {}

    # Prompt the user to enter their AniList client ID and secret
    config['ANILIST_CLIENT_ID'] = input("Enter your AniList client ID: ")
    config['ANILIST_CLIENT_SECRET'] = input("Enter your AniList client secret: ")

    # Return the configuration dictionary
    return config

def save_config(config, file_path):
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

def Get_Config():
    # Define the path to the configuration file
    config_path = 'config.json'
    # Load the configuration dictionary from the file
    config = load_config(config_path)

    if config:
        # If the configuration dictionary is loaded successfully, print a message
        print("Configuration file found.")
    else:
        # If the configuration dictionary is not loaded successfully, create a new one
        print("\nConfiguration file not found. Let's create one.")
        config = create_config()
        save_config(config, config_path)
        print("Configuration file created and saved.")

    Set_Environment_Variables(config)
    print("Environment variables set.")

def Set_Environment_Variables(config):
    # Set the environment variables with the values from the configuration dictionary
    for key, value in config.items():
        os.environ[key] = value

def Set_Access_Token():
    # Prompt the user to enter their access token
    token = input("\nEnter your access token: ")
    # Set the environment variable with the access token
    os.environ['ACCESS_TOKEN'] = token