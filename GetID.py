import pymoe

def Get_Manga_ID(name):
    manga = pymoe.manga.search.anilist.manga(name)
    id_list = []  # Initialize a list to store the IDs
    id_name_map = {}  # Map to store names associated with IDs
    index = 0  # Initialize the index variable
    
    #print(manga)

    while index < len(manga):
        manga_item = manga[index]
        title = manga_item['title']

        # Check if the manga item has an English title
        if 'english' in title and title['english']:
            english_title = title['english']
            if name.lower() in english_title.lower():
                id = manga_item['id']

                # Check if the name is already associated with an ID
                if name in id_name_map:
                    print(f"ID {id} is already associated with '{name}'")
                else:
                    id_list.append(id)  # Add the ID to the list
                    id_name_map[name] = id  # Associate the name with the ID
                    romaji_title = title['romaji']
                    url = manga_item['siteUrl']
                    print(f"ID: {id}")
                    print(f"Romaji Title: {romaji_title}")
                    print(f"English Title: {english_title}")
                    print(f"Anilist URL: {url}")

        # If the English title is not present, check the Romaji title
        if 'romaji' in title and title['romaji']:
            romaji_title = title['romaji']
            if name.lower() in romaji_title.lower():
                id = manga_item['id']

                # Check if the name is already associated with an ID
                if name in id_name_map:
                    print(f"ID {id} is already associated with '{name}'")
                else:
                    id_list.append(id)  # Add the ID to the list
                    id_name_map[name] = id  # Associate the name with the ID
                    url = manga_item['siteUrl']
                    print(f"ID: {id}")
                    print(f"Romaji Title: {romaji_title}")
                    print(f"Anilist URL: {url}")
        
        # If neither English nor Romaji titles match, check synonyms
        if 'synonyms' in manga_item:
            synonyms = manga_item['synonyms']
            if any(name.lower() in synonym.lower() for synonym in synonyms):
                id = manga_item['id']

                # Check if the name is already associated with an ID
                if name in id_name_map:
                    print(f"ID {id} is already associated with '{name}'")
                else:
                    id_list.append(id)
                    id_name_map[name] = id  # Associate the name with the ID
                    romaji_title = manga_item['title']['romaji'] if 'romaji' in manga_item['title'] else None
                    english_title = manga_item['title']['english'] if 'english' in manga_item['title'] else None
                    print(f"ID: {id}")
                    print(f"Romaji Title: {romaji_title}")
                    print(f"English Title: {english_title}")
                    print(f"Anilist URL: {manga_item['siteUrl']}")

        index += 1

    if not id_list:
        print(f"No manga found for '{name}'.")

    return id_list  # Return the list of IDs