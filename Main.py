from getFromFile import Get_Manga_Names
from GetID import Get_Manga_ID, Clean_Manga_IDs, get_no_manga_found
from AccessAPI import Get_Format
import time

# Call the function and get the list of IDs & Names
manga_names_ids = {}
manga_names = Get_Manga_Names()

# Iterate through manga names
for manga_name, last_chapter_read in manga_names.items():
    time.sleep(0.5)
    manga_ids = Get_Manga_ID(manga_name)
    print("List of IDs for", manga_name, ":", manga_ids)

    for manga_id in manga_ids:
        media_info = Get_Format(manga_id)

        if media_info != "NOVEL":
            manga_type = media_info
            #print("Manga Type:", manga_type)

            if manga_name not in manga_names_ids:
                manga_names_ids[manga_name] = []

            manga_names_ids[manga_name].append(manga_id)

manga_names_ids = Clean_Manga_IDs(manga_names_ids)

# Print the dictionary containing manga names and associated IDs
print("Manga Names and Associated IDs:")
for manga_name, ids in manga_names_ids.items():
    print(f"{manga_name}: {ids}")

get_no_manga_found()