import os
import json

def create_config():
    config = {}

    config['ANILIST_CLIENT_ID'] = input("Enter your AniList client ID: ")
    config['ANILIST_CLIENT_SECRET'] = input("Enter your AniList client secret: ")

    return config

def save_config(config, file_path):
    with open(file_path, 'w') as file:
        json.dump(config, file, indent=4)

def load_config(file_path):
    try:
        with open(file_path, 'r') as file:
            config = json.load(file)
        return config
    except FileNotFoundError:
        return None

def Get_Config():
    # Load the config
    config_path = 'config.json'
    config = load_config(config_path)

    if config:
        print("Configuration file found.")
        Set_Environment_Variables(config)
        print("Environment variables set.")
    else:
        print("\nConfiguration file not found. Let's create one.")
        new_config = create_config()
        save_config(new_config, config_path)
        print("Configuration file created and saved.")
        Set_Environment_Variables(new_config)
        print("Environment variables set.")

def Set_Environment_Variables(config):
    os.environ['ANILIST_CLIENT_ID'] = config.get('ANILIST_CLIENT_ID', '')
    os.environ['ANILIST_CLIENT_SECRET'] = config.get('ANILIST_CLIENT_SECRET', '')

def Set_Access_Token():
    token = input("\nEnter your access token: ")
    os.environ['ACCESS_TOKEN'] = token