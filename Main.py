from GetFromFile import Get_Manga_Names
from GetID import Get_Manga_ID, Clean_Manga_IDs, Get_No_Manga_Found
from AccessAPI import Get_Format, Update_Manga, Get_Chapters_Updated
from WriteToFile import Write_Chapters_Updated
import time

def Get_Private_Bool():
    # Ask the user if they want all entries on Anilist to be private
    private_bool = input("\nWould you like all entries on Anilist to be private and only seen by you? (y/n): ")
    if private_bool.lower() == "y":
        private_bool = True
        print("")
        return private_bool
    elif private_bool.lower() == "n":
        private_bool = False
        print("")
        return private_bool
    else:
        print("Invalid input")
        Get_Private_Bool()

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

        # If the media is not a novel, add it to the dictionary
        if media_info != "NOVEL":
            manga_type = media_info

            if manga_name not in manga_names_ids:
                manga_names_ids[manga_name] = []

            # Append a tuple containing manga_id and last_chapter_read
            manga_names_ids[manga_name].append((manga_id, last_chapter_read))

# Clean the manga_names_ids dictionary
manga_names_ids = Clean_Manga_IDs(manga_names_ids)

# Print the dictionary containing manga names and associated IDs
print("\nManga Names With Associated IDs & Chapters Read:")
for manga_name, ids in manga_names_ids.items():
    print(f"{manga_name}: {ids}")

print("\nNot Found Manga:")
Get_No_Manga_Found()
print("")

# Get the private_bool
private_bool = Get_Private_Bool()

# Iterate over entries in the cleaned manga_names_ids dictionary
for manga_name, manga_info_list in manga_names_ids.items():
    for manga_info in manga_info_list:
        manga_id, last_chapter_read = manga_info
        print(f"Manga: {manga_name}, Manga ID: {manga_id}, Last Chapter Read: {last_chapter_read}")
        Update_Manga(manga_name, manga_id, last_chapter_read, private_bool)
        time.sleep(0.3)

# Get the number of chapters updated
chapters_updated = Get_Chapters_Updated()
print(f"\nTotal chapters updated: {chapters_updated}")
#Write the number of chapters updated to a file
Write_Chapters_Updated(chapters_updated)

print("\nScript has finished, the 2 txt files generated by the program have manga that was not found on anilist and manga that had multiple id's associated to it.\nPlease check these 2 files and see if there is anything that you need to do manually.\nThese files WILL get OVERWRITTEN if the program is run again.")
input("\nPress enter to exit...")