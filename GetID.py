import pymoe

def Get_Manga_ID(name):
    manga = pymoe.manga.search.anilist.manga(name)
    if manga:  # Ensure there is at least one result
        id = manga[0]['id']
        romaji_title = manga[0]['title']['romaji']
        english_title = manga[0]['title']['english']
        
        print(f"The first ID for '{name}' is: {id}")
        print(f"Romaji Title: {romaji_title}")
        print(f"English Title: {english_title}")
    else:
        print(f"No manga found for '{name}'.")

Get_Manga_ID("Tensei Shitara Slime Datta Ken")