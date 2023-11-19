import requests
import webbrowser
import os
import time

# Define the authorization URL
authorization_url = 'https://anilist.co/api/v2/oauth/authorize'

def Get_Authentication_Code(client_id, thread): 
    while True:
        auth_params = {
            'client_id': client_id,
            'response_type': 'token'
        }
        
        webbrowser.open(f'{authorization_url}?{"&".join([f"{key}={value}" for key, value in auth_params.items()])}')
        
        while True:
            if thread.stop:
                return None
            if os.environ.get('ACCESS_TOKEN') is not None:
                return os.environ.get('ACCESS_TOKEN')
            time.sleep(0.5)

def Get_Access_Token(thread, app):
    client_id = os.environ.get('ANILIST_CLIENT_ID')
    
    if client_id is None:
        app.update_terminal("No client ID found. Please enter your AniList client ID with the 'Set API Values' button.")
    else:
        return Get_Authentication_Code(client_id, thread)