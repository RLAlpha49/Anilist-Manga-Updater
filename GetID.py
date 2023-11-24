# Import necessary modules and functions
from WriteToFile import Write_Multiple_IDs, Write_Not_Found
import pymoe
import time
import string

# Initialize an empty list to store names of manga that are not found
no_manga_found = []

def Get_Manga_ID(name, last_chapter_read, app, max_retries=5, delay=15):
    global no_manga_found
    retry_count = 0

    while retry_count < max_retries:
        try:
            manga = pymoe.manga.search.anilist.manga(name)
            matches = []

            try:
                for manga_item in manga:
                    title = manga_item['title']
                    match = False
                    if 'english' in title and title['english']:
                        match = match or Check_Title_Match(title['english'], name)
                    if 'romaji' in title and title['romaji']:
                        match = match or Check_Title_Match(title['romaji'], name)
                    if 'synonyms' in manga_item:
                        for synonym in manga_item['synonyms']:
                            match = match or Check_Title_Match(synonym, name)
                    if match:
                        matches.append((match, manga_item))
            except IndexError:
                app.update_terminal(f"\nNo search results found for '{name}'.")
                no_manga_found.append((name, last_chapter_read))
                return []

            matches.sort(key=lambda x: x[0], reverse=True)  # Sort matches in descending order of match
            id_list = [manga_item['id'] for match, manga_item in matches if match]

            # Print the details of the manga that matches the search
            if id_list:
                app.update_terminal(f"\nList of IDs for {name} : {id_list}")
                romaji_title = matches[0][1]['title']['romaji']
                english_title = matches[0][1]['title']['english']
                app.update_terminal(f"Romaji Title: {romaji_title}")
                app.update_terminal(f"English Title: {english_title}")
                for match, manga_item in matches:
                    if match:
                        app.update_terminal(f"Anilist URL: {manga_item['siteUrl']}")

            if not id_list:
                app.update_terminal(f"\nNo manga found for '{name}'.")
                no_manga_found.append((name, last_chapter_read))

            return id_list

        except pymoe.errors.serverError as e:
            if "Too Many Requests" in str(e):
                app.update_terminal(f"Too Many Requests For Pymoe. Retrying in {delay} seconds...")
                time.sleep(delay)
                retry_count += 1
            else:
                app.update_terminal(f"An unexpected server error occurred: {e}")
                break

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