from flask import Flask, redirect, request
import requests
import webbrowser
import os

app = Flask(__name__)

# Fill in your application details
client_id = os.environ.get('ANILIST_CLIENT_ID')
client_secret = os.environ.get('ANILIST_CLIENT_SECRET')
redirect_uri = 'https://anilist.co/api/v2/oauth/pin'
authorization_url = 'https://anilist.co/api/v2/oauth/authorize'
token_url = 'https://anilist.co/api/v2/oauth/token'

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
    authorization_code = request.args.get('code')

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

if __name__ == '__main__':
    app.run(debug=True)