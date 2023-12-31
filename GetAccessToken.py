# Import necessary modules
import webbrowser
import os
import time
import platform

# Define the authorization URL for AniList OAuth
authorization_url = 'https://anilist.co/api/v2/oauth/authorize'

# Function to get the access token
def Get_Access_Token(thread, app):
    # Get the client ID from the environment variables
    client_id = os.environ.get('ANILIST_CLIENT_ID')
    
    # If the client ID is not found, print an error message
    if client_id is None:
        app.update_terminal("No client ID found. Please enter your AniList client ID with the 'Set API Values' button.")
    else:
        if platform.system() == 'Linux':
            app.update_terminal("Please open the following URL in your web browser and follow the instructions:")
            print("Please open the following URL in your web browser and follow the instructions:")
            app.update_terminal(f'{authorization_url}?client_id={client_id}&response_type=token')
            print(f'{authorization_url}?client_id={client_id}&response_type=token')
            auth_code = Get_Authentication_Code(client_id, thread)
        elif platform.system() == 'Windows':
            auth_code = Get_Authentication_Code(client_id, thread)
        return auth_code

# Function to get the authentication code
def Get_Authentication_Code(client_id, thread): 
    while True:
        # Define the parameters for the authorization request
        auth_params = {
            'client_id': client_id,  # The client ID for the AniList API
            'response_type': 'token'  # The response type for the OAuth flow
        }
        
        # Open the authorization URL in the web browser with the parameters
        webbrowser.open(f'{authorization_url}?{"&".join([f"{key}={value}" for key, value in auth_params.items()])}')
        
        while True:
            # If the thread is stopped, return None
            if thread.stop:
                return None
            # If the access token is set in the environment variables, return it
            if os.environ.get('ACCESS_TOKEN') is not None:
                return os.environ.get('ACCESS_TOKEN')
            # Sleep for 0.5 seconds to avoid busy waiting
            time.sleep(0.5)