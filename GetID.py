import pymoe

def Get_Manga_ID(name):
    manga = pymoe.manga.search.anilist.manga(name)
    id_list = []  # Initialize a list to store the IDs
    index = 0  # Initialize the index variable
    while index < len(manga):
        manga_item = manga[index]
        if 'title' in manga_item and 'english' in manga_item['title']:
            english_title = manga_item['title']['english']
            if english_title and name.lower() in english_title.lower():
                id = manga_item['id']
                id_list.append(id)  # Add the ID to the list
                romaji_title = manga_item['title']['romaji']
                url = manga_item['siteUrl']
                print(f"ID: {id}")
                print(f"Romaji Title: {romaji_title}")
                print(f"English Title: {english_title}")
                print(f"Anilist URL: {url}")
            index += 1
        else:
            index += 1

    if not id_list:
        print(f"No manga found for '{name}'.")
    
    return id_list  # Return the list of IDs