# Import necessary modules and functions
from WriteToFile import Write_Multiple_IDs, Write_Not_Found
import pymoe
import time

# Initialize an empty list to store names of manga that are not found
no_manga_found = []

# Function to get the ID of a manga
def Get_Manga_ID(name, app, max_retries=5, delay=15):
    # Declare no_manga_found as a global variable
    global no_manga_found
    # Initialize the retry count
    retry_count = 0

    # Try to get the manga ID until the maximum number of retries is reached
    while retry_count < max_retries:
        try:
            # Search for the manga using the AniList API
            manga = pymoe.manga.search.anilist.manga(name)
            # Initialize the list of IDs and the index
            id_list = []
            index = 0

            # Loop through the manga items
            while index < len(manga):
                # Get the current manga item and its title
                manga_item = manga[index]
                title = manga_item['title']

                # If the manga item has an English title, check it and add the ID to the list
                if 'english' in title and title['english']:
                    Check_Title_And_Add_ID(title['english'], name, manga_item, id_list, app)

                # If the manga item has a romaji title, check it and add the ID to the list
                if 'romaji' in title and title['romaji']:
                    Check_Title_And_Add_ID(title['romaji'], name, manga_item, id_list, app)

                # If the manga item has synonyms, check them and add the ID to the list
                if 'synonyms' in manga_item:
                    for synonym in manga_item['synonyms']:
                        Check_Title_And_Add_ID(synonym, name, manga_item, id_list, app)

                # Increment the index
                index += 1

            # If no IDs were found, print a message and add the name to the list of not found manga
            if not id_list:
                app.update_terminal(f"\nNo manga found for '{name}'.")
                no_manga_found.append(name)

            # Return the list of IDs
            return id_list

        # If a server error occurs
        except pymoe.errors.serverError as e:
            # If the error is due to too many requests, wait and retry
            if "Too Many Requests" in str(e):
                app.update_terminal(f"Too Many Requests For Pymoe. Retrying in {delay} seconds...")
                time.sleep(delay)
                retry_count += 1
            else:
                # If the error is unexpected, print a message and break the loop
                app.update_terminal(f"An unexpected server error occurred: {e}")
                break

    # If the maximum number of retries is reached, print a message and return an empty list
    app.update_terminal(f"Failed to get manga ID for '{name}' after {max_retries} retries.")
    return []

# Define a function to check if the given name is in the title of the manga item and add the ID of the manga item to the list if it is
def Check_Title_And_Add_ID(title, name, manga_item, id_list, app):
    # Convert both the name and title to lowercase and check if the name is in the title
    if name.lower() in title.lower():
        # If the name is in the title, get the ID of the manga item
        id = manga_item['id']
        # Add the ID to the id_list
        id_list.append(id)
        # Check if the 'romaji' key is in the title of the manga item, and if it is, get the romaji title; otherwise, set it to None
        romaji_title = manga_item['title']['romaji'] if 'romaji' in manga_item['title'] else None
        # Check if the 'english' key is in the title of the manga item, and if it is, get the English title; otherwise, set it to None
        english_title = manga_item['title']['english'] if 'english' in manga_item['title'] else None
        # Print the ID, romaji title, English title, and URL of the manga item
        app.update_terminal(f"\nID: {id}")
        app.update_terminal(f"Romaji Title: {romaji_title}")
        app.update_terminal(f"English Title: {english_title}")
        app.update_terminal(f"Anilist URL: {manga_item['siteUrl']}")

# Function to clean the manga IDs
def Clean_Manga_IDs(manga_names_ids, app):
    # Initialize dictionaries to store cleaned manga names and IDs, and manga names with multiple IDs
    cleaned_manga_names_ids = {}
    multiple_id_manga_names = {}

    # Iterate through manga names and their IDs
    for manga_name, id_list in manga_names_ids.items():
        # Remove duplicates within the same manga name
        unique_ids = list(set(id_list))

        # Check if there are multiple unique IDs
        if len(unique_ids) > 1:
            # If there are multiple unique IDs, add the manga name and IDs to the multiple_id_manga_names dictionary
            multiple_id_manga_names[manga_name] = unique_ids
        else:
            # If only one ID, add it directly to the cleaned dictionary
            cleaned_manga_names_ids[manga_name] = unique_ids
    
    # Print the manga names with multiple IDs
    app.update_terminal("\nDuplicate Manga Names and IDs:")
    app.update_terminal(multiple_id_manga_names)
    # Write the manga names with multiple IDs to a file
    Write_Multiple_IDs(multiple_id_manga_names)
    # Return the cleaned manga names and IDs
    return cleaned_manga_names_ids

# Function to get the manga not found
def Get_No_Manga_Found(app):
    # Write the manga not found to a file
    Write_Not_Found(no_manga_found)
    # Print the manga not found
    for manga in no_manga_found:
        app.update_terminal(f"{manga}: Not Found")
    return