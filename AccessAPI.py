from GetAccessToken import Get_Access_Token
from datetime import datetime, timedelta
import requests
import time

# Get the access token
access_token = Get_Access_Token()

# Define the API endpoint
url = 'https://graphql.anilist.co'

# Define the headers for the API request
headers = {
    'Authorization': f'Bearer {access_token}'
}

# Initialize the counter for the number of chapters updated
chapters_updated = 0

# Initialize the dictionary for the status mapping
status_mapping = {
        "reading": "CURRENT",
        "completed": "COMPLETED",
        "on_hold": "PAUSED",
        "dropped": "DROPPED",
        "plan_to_read": "PLANNING"
    }

# Function to handle API requests
def api_request(query, variables=None):
    # Send a POST request to the API endpoint
    response = requests.post(url, json={'query': query, 'variables': variables}, headers=headers)
    
    # Check the rate limit headers
    rate_limit_remaining = int(response.headers.get('X-RateLimit-Remaining', 0))
    rate_limit_reset = int(response.headers.get('X-RateLimit-Reset', 0))
    
    # If the rate limit has been hit, print a message and wait
    if response.status_code == 429:
        wait_time = rate_limit_reset - int(time.time())
        if wait_time < 0:
            print(f"Reset time: {wait_time} Seconds\nRate limit reset time is in the past.")
            wait_time = 50
            print(f"Waiting for {wait_time} seconds.")
            time.sleep(wait_time)
        else:
            print(f"Rate limit hit. Waiting for {wait_time} seconds.")
            time.sleep(wait_time)
        return api_request(query, variables)

    # If the rate limit is close to being hit, print a warning
    elif rate_limit_remaining < 10:
        print(f"Warning: Only {rate_limit_remaining} requests remaining until rate limit reset.")

    # If the request was successful, return the JSON response
    if response.status_code == 200:
        return response.json()
    # If the request was not successful, print an error message and return None
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")
        return None

# Function to update the progress of a manga
def Update_Manga(manga_name, manga_id, last_chapter_read, private_bool, status, last_read_at, months): 
    global chapters_updated
    
    manga_status = Get_Status(manga_id)
    
    if status != 'plan_to_read':
        # Get the current progress of the manga
        chapter_anilist = Get_Progress(manga_id)
        # Convert last_read_at to datetime object
        last_read_at = datetime.strptime(last_read_at, '%Y-%m-%d %H:%M:%S UTC')
        # Check if last_read_at is more than # months ago
        if datetime.now() - last_read_at >= timedelta(days=(30 * months)):
            status = 'PAUSED'
        else:
            status = status_mapping.get(status.lower(), status)
    else:
        status = status_mapping.get(status.lower(), status)
        print(status)
    
    if status == 'PLANNING':
        last_chapter_read = 0
        chapter_anilist = 0
        # Define the mutation query to update the progress and status of the manga
        query = '''
        mutation ($mediaId: Int, $status: MediaListStatus, $private: Boolean) {
            SaveMediaListEntry (mediaId: $mediaId, status: $status private: $private) {
                id
                status
                private
            }
        }
        '''
        
        # Define the variables for the first API request
        first_variables = {
            'mediaId': manga_id,
            'status': status,
            'private' :private_bool
        }
        
        # Define the variables for the second API request
        second_variables = {
            'mediaId': manga_id,
            'status': status,
            'private' :private_bool
        }
        
    # If the last chapter read is greater than the current progress or the current progress is None
    elif last_chapter_read > chapter_anilist or chapter_anilist is None:
        # Define the mutation query to update the progress and status of the manga
        query = '''
        mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $private: Boolean) {
            SaveMediaListEntry (mediaId: $mediaId, status: $status, progress: $progress, private: $private) {
                id
                status
                progress
                private
            }
        }
        '''
        
        # Define the variables for the first API request
        first_variables = {
            'mediaId': manga_id,
            'progress': (chapter_anilist + 1),
            'private' :private_bool
        }
        
        # Define the variables for the second API request
        second_variables = {
            'mediaId': manga_id,
            'status': status,
            'progress': last_chapter_read
        }
    # If status is not the same as status on Anilist and chapters are the same, just change status
    elif status is not manga_status:
        # Define the mutation query to update the progress and status of the manga
        query = '''
        mutation ($mediaId: Int, $status: MediaListStatus, $private: Boolean) {
            SaveMediaListEntry (mediaId: $mediaId, status: $status, private: $private) {
                id
                status
                private
            }
        }
        '''
        
        # Define the variables for the first API request
        first_variables = {
            'mediaId': manga_id,
            'status': status,
            'private' :private_bool
        }
        
        # Define the variables for the second API request
        second_variables = {
            'mediaId': manga_id,
            'status': status
        }
    # If the last chapter read is not greater than the current progress
    else:
        # Print a message indicating that the manga is already set to the last chapter read
        print(f"Manga: {manga_name}({manga_id}) is already set to last chapter read.")
        return
    
    # Send the first API request to update the status and progress of the manga
    response1 = api_request(query, first_variables)
    # Send the second API request to update the progress of the manga
    response2 = api_request(query, second_variables)

    # If both API requests were successful
    if response1 and response2:
        # Print a success message
        print(f"Manga: {manga_name}({manga_id}) Has been set to chapter {last_chapter_read} from {chapter_anilist}")
        # Update the counter for the number of chapters updated
        chapters_updated += (last_chapter_read - chapter_anilist)
    # If either API request was not successful
    else:
        # Print an error message
        print(f"Failed to alter data.")

# Function to get the current progress from Anilist
def Get_Progress(id):
    # Get the user ID
    userId = Get_User()
    # Define the query to get the current progress
    query = '''
    query ($mediaId: Int, $userId: Int) {
        MediaList (mediaId: $mediaId, userId: $userId) {
            userId
            mediaId
            progress
            userId
        }
    }
    '''
    # Define the variables for the query
    variables = {
        'mediaId': id,
        'userId': userId
    }
    # Send the API request
    data = api_request(query, variables)
    # If the request was successful
    if data:
        # Get the progress value from the response
        chapter_value = data.get('data', {}).get('MediaList', {}).get('progress')
        # Return the progress value as an integer, or 0 if the progress value is None
        return int(chapter_value) if chapter_value else 0
    # If the request was not successful
    else:
        # Return 0
        return 0

# Function to get the user ID
def Get_User():
    # Define the query to get the user ID
    query = '''
    query {
        Viewer {
            id
            name
        }
    }
    '''
    # Send the API request
    data = api_request(query)
    # If the request was successful
    if data:
        # Get the user ID from the response
        userId_value = data.get('data', {}).get('Viewer', {}).get('id')
        # Return the user ID, or None if the user ID is None
        return userId_value if userId_value else None
    # If the request was not successful
    else:
        # Return None
        return None

# Function to get the format of the manga
def Get_Format(id):
    # Define the query to get the format of the manga
    query = '''
    query ($id: Int) {
        Media (id: $id) {
            id
            format
        }
    }
    '''
    # Define the variables for the query
    variables = {
        'id': id
    }
    # Send the API request
    data = api_request(query, variables)
    # If the request was successful
    if data:
        # Get the format value from the response
        format_value = data.get('data', {}).get('Media', {}).get('format')
        # Return the format value, or None if the format value is None
        return format_value if format_value else None
    # If the request was not successful
    else:
        # Return None
        return None
    
def Get_Status(id):
    # Define the query to get the format of the manga
    query = '''
    query ($id: Int) {
        Media (id: $id) {
            id
            status
        }
    }
    '''
    # Define the variables for the query
    variables = {
        'id': id
    }
    # Send the API request
    data = api_request(query, variables)
    # If the request was successful
    if data:
        # Get the format value from the response
        status_value = data.get('data', {}).get('Media', {}).get('status')
        # Return the format value, or None if the format value is None
        return status_value if status_value else None
    # If the request was not successful
    else:
        # Return None
        return None

# Function to get the number of chapters updated
def Get_Chapters_Updated():
    # Return the global variable chapters_updated
    return chapters_updated