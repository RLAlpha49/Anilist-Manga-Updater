from GetAccessToken import Get_Access_Token
import requests

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

# Function to update the manga
def Update_Manga(manga_name, manga_id, last_chapter_read, private_bool):
    global chapters_updated
    # Get the current progress from Anilist
    chapter_anilist = Get_Progress(manga_id)
    
    # Check if the last chapter read is greater than the current progress on Anilist
    if last_chapter_read > chapter_anilist or chapter_anilist is None:
        # Define the mutation query to update the manga
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
            'status': 'CURRENT',
            'progress': (chapter_anilist + 1),
            'private' :private_bool
        }
        
        # Define the variables for the second API request
        second_variables = {
            'mediaId': manga_id,
            'progress': last_chapter_read
        }
    else:
        query = None
    
    if query is not None:
        # Make the first API request
        response1 = requests.post(url, json={'query': query, 'variables': first_variables}, headers=headers)
        # Make the second API request
        response2 = requests.post(url, json={'query': query, 'variables': second_variables}, headers=headers)
    
        # Check if both API requests were successful
        if response1.status_code == 200 and response2.status_code == 200:
            print(f"Manga: {manga_name}({manga_id}) Has been set to chapter {last_chapter_read} from {chapter_anilist}")
            # Update the counter for the number of chapters updated
            chapters_updated = chapters_updated + (last_chapter_read - chapter_anilist)
        else:
            print(f"Failed to alter data. Status code: {response1.status_code}")
    else:
        print(f"Manga: {manga_name}({manga_id}) is already set to last chapter read.")

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
    
    # Define the variables for the API request
    variables = {
        'mediaId': id,
        'userId': userId
    }
    
    # Make the API request
    response = requests.post(url, json={'query': query, 'variables': variables}, headers=headers)
    
    # Check if the response is successful
    if response.status_code == 200:
        # Parse the JSON response
        data = response.json()

        # Extract the 'progress' value from the response
        chapter_value = data.get('data', {}).get('MediaList', {}).get('progress')

        if chapter_value is not None:
            return int(chapter_value)
        else:
            print("Chapter is not found in the response.")
            return 0
    else:
        print(f"Failed to retrieve data (Most likely due to item not being on user's list). Status code: {response.status_code}")
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
    
    # Make the API request
    response = requests.post(url, json={'query': query}, headers=headers)
    
    if response.status_code == 200:
        # Parse the JSON response
        data = response.json()
        # Extract the 'id' value from the response
        userId_value = data.get('data', {}).get('Viewer', {}).get('id')

        if userId_value is not None:
            return userId_value
        else:
            print("UserId not found in the response.")
            return None
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")
        return None

# Function to get the format of the manga
def Get_Format(id):
    # Define the query to get the format
    query = '''
    query ($id: Int) {
        Media (id: $id) {
            id
            format
            title {
            romaji
            english
            native
            }
        }
    }
    '''

    # Define the variables for the API request
    variables = {
        'id': id
    }

    # Make the API request
    response = requests.post(url, json={'query': query, 'variables': variables})
    
    # Check if the response is successful
    if response.status_code == 200:
        # Parse the JSON response
        data = response.json()

        # Extract the 'format' value from the response
        format_value = data.get('data', {}).get('Media', {}).get('format')

        if format_value is not None:
            print(f"Format: {format_value}")
            return format_value
        else:
            print("Format not found in the response.")
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")

# Function to get the number of chapters updated
def Get_Chapters_Updated():
    return chapters_updated