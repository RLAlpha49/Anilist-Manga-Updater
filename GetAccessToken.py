import requests
import webbrowser
import os
from Config import Get_Config, Set_Access_Token, load_config

# Load the configuration
Get_Config()

# Get the client ID and secret from environment variables
client_id = os.environ.get('ANILIST_CLIENT_ID')
client_secret = os.environ.get('ANILIST_CLIENT_SECRET')

# Define the redirect URI and authorization URL
redirect_uri = 'https://anilist.co/api/v2/oauth/pin'
authorization_url = 'https://anilist.co/api/v2/oauth/authorize'

def Get_Authentication_Code(): 
    while True:
        # Define the authorization parameters
        auth_params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code'
        }
        
        # Open the authorization URL in the web browser
        webbrowser.open(f'{authorization_url}?{"&".join([f"{key}={value}" for key, value in auth_params.items()])}')
        
        # Wait for the user to authorize and get the code from the URL
        while True:
            try:
                # If the access token is not set, set it
                if os.environ.get('ACCESS_TOKEN') is None:
                    Set_Access_Token()
                # Get the authorization code from the environment variable
                authorization_code = os.environ.get('ACCESS_TOKEN')
                return authorization_code
            except KeyError:
                # If the access token is not found, set it
                Set_Access_Token()

def Get_Access_Token():
    # Get the authorization code
    authorization_code = Get_Authentication_Code()
    
    # Define the URL, headers, and data for the API request
    url = 'https://anilist.co/api/v2/oauth/token'
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    data = {
        'grant_type': 'authorization_code',
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'code': authorization_code,  # The Authorization Code received previously
    }

    # Make the API request
    response = requests.post(url, headers=headers, json=data)

    # Check if the response is successful
    if response.status_code == 200:
        # Extract the access token from the response
        access_token = response.json().get('access_token')
        return access_token
    else:
        # If the response is not successful, print an error message
        print(f"Failed to obtain access token. Status code: {response.status_code}")