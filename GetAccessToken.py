import requests
import webbrowser
import os

# Fill in your application details
client_id = os.environ.get('ANILIST_CLIENT_ID') # Taken from environment variable on Windows
client_secret = os.environ.get('ANILIST_CLIENT_SECRET') # Taken from environment variable on Windows
redirect_uri = 'https://anilist.co/api/v2/oauth/pin'
authorization_url = 'https://anilist.co/api/v2/oauth/authorize'

def Get_Authentication_Code():  
    auth_params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code'
        # Add any other optional parameters as needed
    }
    
    webbrowser.open(f'{authorization_url}?{"&".join([f"{key}={value}" for key, value in auth_params.items()])}')
    
    # Wait for the user to authorize and get the code from the URL
    while True:
        # Get the current URL from the user
        authorization_code = input("\nEnter the Access Token: ")
        return authorization_code

def Get_Access_Token():
    authorization_code = Get_Authentication_Code()
    
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

    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 200:
        access_token = response.json().get('access_token')
        return access_token
    else:
        print(f"Failed to obtain access token. Status code: {response.status_code}")