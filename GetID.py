# Import necessary modules and functions
from WriteToFile import Write_Multiple_IDs, Write_Not_Found
import pymoe
import time
import string

# Initialize an empty list to store names of manga that are not found
no_manga_found = []

def Set_No_Manga_Found():
    global no_manga_found
    no_manga_found = []

def Get_Manga_ID(name, last_chapter_read, app, max_retries=5, delay=15):
    # Declare global variable
    global no_manga_found
    # Initialize retry count
    retry_count = 0

    # Retry loop
    while retry_count < max_retries:
        try:
            # Search for the manga
            manga = pymoe.manga.search.anilist.manga(name)
            # Initialize matches list
            matches = []

            try:
                # Loop through each manga item
                for manga_item in manga:
                    title = manga_item['title']
                    match = False
                    # Check if the title matches the search name
                    if 'english' in title and title['english']:
                        english_title = title['english'].replace('-', ' ')
                        english_title = english_title.replace('\u2019', '\u0060')
                        match = match or Check_Title_Match(english_title, name)
                    if 'romaji' in title and title['romaji']:
                        romaji_title = title['romaji'].replace('-', ' ')
                        romaji_title = romaji_title.replace('\u2019', '\u0060')
                        match = match or Check_Title_Match(romaji_title, name)
                    if 'synonyms' in manga_item:
                        for synonym in manga_item['synonyms']:
                            synonym = synonym.replace('-', ' ')
                            synonym = synonym.replace('\u2019', '\u0060')
                            match = match or Check_Title_Match(synonym, name)
                    # If match, append to matches list
                    if match:
                        matches.append((match, manga_item))
            except IndexError:
                if matches is []:
                    # If no search results found, update terminal and append to not found list
                    app.update_terminal(f"\nNo search results found for '{name}'.")
                    no_manga_found.append((name, last_chapter_read))
                    return []

            # Sort matches in descending order of match
            matches.sort(key=lambda x: x[0], reverse=True)
            # Get list of IDs for matches
            id_list = [manga_item['id'] for match, manga_item in matches if match]

            # If IDs found, print details
            if id_list:
                app.update_terminal(f"\nList of IDs for {name} : {id_list}")
                romaji_title = matches[0][1]['title']['romaji']
                english_title = matches[0][1]['title']['english']
                app.update_terminal(f"Romaji Title: {romaji_title}")
                app.update_terminal(f"English Title: {english_title}")
                for match, manga_item in matches:
                    if match:
                        app.update_terminal(f"Anilist URL: {manga_item['siteUrl']}")

            # If no IDs found, update terminal and append to not found list
            if not id_list:
                app.update_terminal(f"\nNo manga found for '{name}'.")
                no_manga_found.append((name, last_chapter_read))

            # Return list of IDs
            return id_list

        except pymoe.errors.serverError as e:
            # Handle server error
            if "Too Many Requests" in str(e):
                app.update_terminal(f"Too Many Requests For Pymoe. Retrying in {delay} seconds...")
                time.sleep(delay)
                retry_count += 1
            else:
                app.update_terminal(f"An unexpected server error occurred: {e}")
                break

    # If retries exhausted, update terminal
    app.update_terminal(f"Failed to get manga ID for '{name}' after {max_retries} retries.")
    return []

def Check_Title_Match(title, name):
    # Remove punctuation from the title and the search name
    title = title.translate(str.maketrans('', '', string.punctuation))
    name = name.translate(str.maketrans('', '', string.punctuation))

    # Split the title and the search name into words
    title_words = set(title.lower().split())
    name_words = set(name.lower().split())
    
    # Check if all words in the search name are in the title
    return name_words.issubset(title_words)

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
    if not multiple_id_manga_names:
        app.update_terminal("No Manga Names with Multiple IDs Found\n")
    else:
        for manga_name, ids in multiple_id_manga_names.items():
            app.update_terminal(f"\n{manga_name}")
            for id_info in ids:
                manga_id, last_chapter_read, status, last_read_at = id_info
                app.update_terminal(f"ID: {manga_id}, Last Chapter Read: {last_chapter_read}, Status: {status}, Last Read At: {last_read_at}")
        app.update_terminal("\n")
    # Write the manga names with multiple IDs to a file
    app.update_progress_and_status("Writing multiple ID's file...", ((5.5 + (0.5/3))/10))
    Write_Multiple_IDs(multiple_id_manga_names)
    # Return the cleaned manga names and IDs
    return cleaned_manga_names_ids

# Function to get the manga not found
def Get_No_Manga_Found(app):
    # Write the manga not found to a file
    Write_Not_Found(no_manga_found)
    # Print the manga not found
    app.update_terminal("\nNot Found Manga:")
    if not no_manga_found:
        app.update_terminal("No Manga Not Found\n")
    else:
        for manga in no_manga_found:
            name, last_chapter_read = manga
            app.update_terminal(f"{name}, Last Chapter Read: {last_chapter_read}, Status: Not Found")
        app.update_terminal("\n")