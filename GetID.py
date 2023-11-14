from WriteToFile import Write_Multiple_IDs, Write_Not_Found
import pymoe
import time

# List to store names of manga not found
no_manga_found = []

def Get_Manga_ID(name, max_retries=3, delay=15):
    global no_manga_found
    retry_count = 0

    # Retry the operation for a maximum number of times
    while retry_count < max_retries:
        try:
            # Search for the manga on AniList
            manga = pymoe.manga.search.anilist.manga(name)
            id_list = []
            index = 0

            # Iterate over the search results
            while index < len(manga):
                manga_item = manga[index]
                title = manga_item['title']

                # If the manga has an English title and it matches the search name, add its ID to the list
                if 'english' in title and title['english']:
                    english_title = title['english']
                    if name.lower() in english_title.lower():
                        id = manga_item['id']
                        id_list.append(id)
                        romaji_title = title['romaji']
                        url = manga_item['siteUrl']
                        print(f"\nID: {id}")
                        print(f"Romaji Title: {romaji_title}")
                        print(f"English Title: {english_title}")
                        print(f"Anilist URL: {url}")

                # If the manga has a Romaji title and it matches the search name, add its ID to the list
                elif 'romaji' in title and title['romaji']:
                    romaji_title = title['romaji']
                    if name.lower() in romaji_title.lower():
                        id = manga_item['id']
                        id_list.append(id)
                        url = manga_item['siteUrl']
                        print(f"\nID: {id}")
                        print(f"Romaji Title: {romaji_title}")
                        print(f"Anilist URL: {url}")

                # If the manga has synonyms and any of them match the search name, add its ID to the list
                if 'synonyms' in manga_item:
                    synonyms = manga_item['synonyms']
                    if any(name.lower() in synonym.lower() for synonym in synonyms):
                        id = manga_item['id']
                        id_list.append(id)
                        romaji_title = manga_item['title']['romaji'] if 'romaji' in manga_item['title'] else None
                        english_title = manga_item['title']['english'] if 'english' in manga_item['title'] else None
                        print(f"\nID: {id}")
                        print(f"Romaji Title: {romaji_title}")
                        print(f"English Title: {english_title}")
                        print(f"Anilist URL: {manga_item['siteUrl']}")

                index += 1

            # If no IDs were found, add the manga name to the list of not found manga
            if not id_list:
                print(f"\nNo manga found for '{name}'.")
                no_manga_found.append(name)

            return id_list

        except pymoe.errors.serverError as e:
            # Check if the error is "Too Many Requests"
            if "Too Many Requests" in str(e):
                print(f"Too Many Requests. Retrying in {delay} seconds...")
                time.sleep(delay)
                retry_count += 1
            else:
                print(f"An unexpected server error occurred: {e}")
                break

    print(f"Failed to get manga ID for '{name}' after {max_retries} retries.")
    return []

def Clean_Manga_IDs(manga_names_ids):
    cleaned_manga_names_ids = {}
    multiple_id_manga_names = {}

    # Iterate through manga names and their IDs
    for manga_name, id_list in manga_names_ids.items():
        # Remove duplicates within the same manga name
        unique_ids = list(set(id_list))

        # Check if there are multiple unique IDs
        if len(unique_ids) > 1:
            multiple_id_manga_names[manga_name] = unique_ids
        else:
            # If only one ID, add it directly to the cleaned dictionary
            cleaned_manga_names_ids[manga_name] = unique_ids
    
    print("\nDuplicate Manga Names and IDs:")
    print(multiple_id_manga_names)
    Write_Multiple_IDs(multiple_id_manga_names)
    return cleaned_manga_names_ids

def Get_No_Manga_Found():
    Write_Not_Found(no_manga_found)
    for manga in no_manga_found:
        print(f"{manga}: Not Found")
    return