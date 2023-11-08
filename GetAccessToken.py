from flask import Flask, redirect, request
import requests
import webbrowser
import os
import time

app = Flask(__name__)

# Initialize the access token as None
access_token = None

# Fill in your application details
client_id = os.environ.get('ANILIST_CLIENT_ID')
client_secret = os.environ.get('ANILIST_CLIENT_SECRET')
redirect_uri = 'https://anilist.co/api/v2/oauth/pin'
authorization_url = 'https://anilist.co/api/v2/oauth/authorize'
token_url = 'https://anilist.co/api/v2/oauth/token'

print(client_id, client_secret)

@app.route('/')
def start_auth():
    auth_params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code'
        # Add any other optional parameters as needed
    }
    auth_url = f'{authorization_url}?{"&".join([f"{key}={value}" for key, value in auth_params.items()])}'
    
    return f"Authorization process started. Please click <a href='{auth_url}' target='_blank'>here</a> to start the authorization."

@app.route('/callback')
def callback():
    global access_token  # Declare access_token as a global variable
    authorization_code = request.args.get('code')

    if authorization_code:
        # You now have the authorization code; proceed with token retrieval
        data = {
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'code': authorization_code
        }

        response = requests.post(token_url, json=data)

        if response.status_code == 200:
            access_token = response.json()['access_token']
            return f'Access Token: {access_token}'
        else:
            return 'Failed to obtain access token'
    else:
        return 'No authorization code found in the callback URL.'

@app.route('/user_info')
def user_info():
    if access_token:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get("https://anilist.co/api/v2/user", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            return f'User Info: {user_data}'
        else:
            return 'Failed to fetch user information'
    else:
        return 'Access token is missing. Please complete the authorization process.'

if __name__ == '__main__':
    webbrowser.open("http://127.0.0.1:5000")
    app.run(debug=True)
