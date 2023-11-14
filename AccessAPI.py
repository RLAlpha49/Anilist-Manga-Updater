from GetAccessToken import Get_Access_Token
import requests

access_token = Get_Access_Token()

url = 'https://graphql.anilist.co'

headers = {
    'Authorization': f'Bearer {access_token}'
}

chapters_updated = 0

def Update_Manga(manga_name, manga_id, last_chapter_read, private_bool):
    global chapters_updated
    chapter_anilist = Get_Progress(manga_id)
    
    if last_chapter_read > chapter_anilist or chapter_anilist is None:
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
        
        first_variables = {
            'mediaId': manga_id,
            'status': 'CURRENT',
            'progress': (chapter_anilist + 1),
            'private' :private_bool
        }
        
        second_variables = {
            'mediaId': manga_id,
            'progress': last_chapter_read
        }
    else:
        query = None
    
    if query is not None:
        # Make the HTTP Api request
        response1 = requests.post(url, json={'query': query, 'variables': first_variables}, headers=headers)
        response2 = requests.post(url, json={'query': query, 'variables': second_variables}, headers=headers)
    
        if response1.status_code == 200 and response2.status_code == 200:
            print(f"Manga: {manga_name}({manga_id}) Has been set to chapter {last_chapter_read} from {chapter_anilist}")
            chapters_updated = chapters_updated + (last_chapter_read - chapter_anilist)
        else:
            print(f"Failed to alter data. Status code: {response1.status_code}")
    else:
        print(f"Manga: {manga_name}({manga_id}) is already set to last chapter read.")

def Get_Progress(id):
    userId = Get_User()
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
    
    variables = {
        'mediaId': id,
        'userId': userId
    }
    
    # Make the HTTP Api request
    response = requests.post(url, json={'query': query, 'variables': variables}, headers=headers)
    
    # Check if the response is successful (status code 200)
    if response.status_code == 200:
        # Parse the JSON response
        data = response.json()

        # Extract the 'format' value from the response
        chapter_value = data.get('data', {}).get('MediaList', {}).get('progress')

        if chapter_value is not None:
            return int(chapter_value)
        else:
            print("Chapter is not found in the response.")
            return 0
    else:
        print(f"Failed to retrieve data (Most likely due to item not being on user's list). Status code: {response.status_code}")
        return 0

def Get_User():
    query = '''
    query {
        Viewer {
            id
            name
        }
    }
    '''
    
    response = requests.post(url, json={'query': query}, headers=headers)
    
    if response.status_code == 200:
        # Parse the JSON response
        data = response.json()
        # Extract the 'format' value from the response
        userId_value = data.get('data', {}).get('Viewer', {}).get('id')

        if userId_value is not None:
            return userId_value
        else:
            print("UserId not found in the response.")
            return None
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")
        return None

def Get_Format(id):
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

    variables = {
        'id': id
    }

    # Make the HTTP Api request
    response = requests.post(url, json={'query': query, 'variables': variables})
    
    # Check if the response is successful (status code 200)
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

def Get_Chapters_Updated():
    return chapters_updated