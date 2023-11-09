import requests
from GetAccessToken import get_access_token

access_token = get_access_token()

# query = '''
# mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int) {
#     SaveMediaListEntry (mediaId: $mediaId, status: $status, progress: $progress) {
#         id
#         status
#         progress
#     }
# }
# '''
# manga_id = 156629
# last_chapter_read = 75

# first_variables = {
#     'mediaId': manga_id,
#     'status': 'CURRENT',
#     'progress': 1
# }

# variables = {
#     'mediaId': manga_id,
#     'status': 'CURRENT',
#     'progress': last_chapter_read
# }

# url = 'https://graphql.anilist.co'

# # Add the authorization header to the request
# headers = {
#     'Authorization': f'Bearer {access_token}'
# }

# # Make the HTTP Api request
# response = requests.post(url, json={'query': query, 'variables': first_variables}, headers=headers)
# response = requests.post(url, json={'query': query, 'variables': variables}, headers=headers)
# print(response.json())


def Get_Format(id):
    query = '''
    query ($id: Int) { # Define which variables will be used in the query (id)
    Media (id: $id) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
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

    url = 'https://graphql.anilist.co'

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
    
Get_Format(86355)