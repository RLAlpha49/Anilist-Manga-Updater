from GetFromFile import Get_Manga_Names
from GetID import Get_Manga_ID, Clean_Manga_IDs, Get_No_Manga_Found
from AccessAPI import Get_Format, Update_Manga, Get_Chapters_Updated
from WriteToFile import Write_Chapters_Updated
import time

def Get_Private_Bool():
    # Ask the user if they want all entries on Anilist to be private
    private_bool = input("\nWould you like all entries on Anilist to be private and only seen by you? (y/n): ")
    
    # If the user inputs 'y' or 'Y', set private_bool to True and return it
    if private_bool.lower() == "y":
        private_bool = True
        print("")
        return private_bool
    
    # If the user inputs 'n' or 'N', set private_bool to False and return it
    elif private_bool.lower() == "n":
        private_bool = False
        print("")
        return private_bool
    
    # If the user inputs anything else, print an error message and call the function again
    else:
        print("Invalid input")
        Get_Private_Bool()

def Get_Months():
    # Ask the user how many months they would like to set the manga to PAUSED if it has not been updated
    months = input("How many months would you like to set the manga to PAUSED if it has not been updated? Set to 0 to ignore. (Default: 4): ")
    
    # If the user inputs a digit, convert it to an integer and return it
    if months.isdigit():
        months = int(months)
        return months
    
    # If the user inputs nothing, set months to 4 and return it
    elif months == "":
        months = 4
        return months
    
    # If the user inputs anything else, print an error message and call the function again
    else:
        print("Invalid input")
        Get_Months()

# Record the start time
manga_data_start_time = time.time()

# Call the function and get the list of IDs & Names
manga_names_ids = {}
manga_names = Get_Manga_Names()

# Iterate through the manga_names dictionary
for manga_name, manga_info in manga_names.items():
    # Sleep for 0.4 seconds to reduce hitting the API rate limit
    time.sleep(0.4)
    status = manga_info['status'] 
    if status != 'plan_to_read':
        # Get the last chapter read and last read at from the manga_info dictionary
        last_chapter_read = manga_info['last_chapter_read']
        last_read_at = manga_info['last_read_at']
        # Call the Get_Manga_ID function to get the IDs of the manga
        manga_ids = Get_Manga_ID(manga_name)
        # Print the list of IDs for the manga
        print("List of IDs for", manga_name, ":", manga_ids)

        # Iterate through the list of manga IDs
        for manga_id in manga_ids:
            # Call the Get_Format function to get the format of the manga
            media_info = Get_Format(manga_id)

            # If the format of the manga is not a novel
            if media_info != "NOVEL":
                # Set the manga_type variable to the format of the manga
                manga_type = media_info

                # If the manga name is not already in the manga_names_ids dictionary
                if manga_name not in manga_names_ids:
                    # Add the manga name to the manga_names_ids dictionary with an empty list as the value
                    manga_names_ids[manga_name] = []

                # Append a tuple containing the manga ID, the last chapter read, the status, and the last read at to the list of values for the manga name in the manga_names_ids dictionary
                manga_names_ids[manga_name].append((manga_id, last_chapter_read, manga_info['status'], last_read_at))
    else:
        manga_ids = Get_Manga_ID(manga_name)
        # Iterate through the list of manga IDs
        for manga_id in manga_ids:
            # Call the Get_Format function to get the format of the manga
            media_info = Get_Format(manga_id)

            # If the format of the manga is not a novel
            if media_info != "NOVEL":
                # Set the manga_type variable to the format of the manga
                manga_type = media_info
                
                if manga_name not in manga_names_ids:
                    manga_names_ids[manga_name] = []
                
                manga_names_ids[manga_name].append((manga_id, None, manga_info['status'], None))
        

# Clean the manga_names_ids dictionary
manga_names_ids = Clean_Manga_IDs(manga_names_ids)

# Print the dictionary containing manga names and associated IDs
print("\nManga Names With Associated IDs & Chapters Read:")
for manga_name, ids in manga_names_ids.items():
    print(f"{manga_name}: {ids}")

print("\nNot Found Manga:")
Get_No_Manga_Found()
print("")

# Calculate and print the time taken
manga_data_end_time = time.time()
manga_data_time_taken = round((manga_data_end_time - manga_data_start_time), 3)
print(f"\nTime taken to get Manga data: {manga_data_time_taken} seconds")

# Get the private_bool
private_bool = Get_Private_Bool()

# Get months value to set manga to PAUSED
months = Get_Months()

# Record the start time
manga_update_start_time = time.time()

# Iterate over entries in the cleaned manga_names_ids dictionary
for manga_name, manga_info_list in manga_names_ids.items():
    # For each manga, there is a list of information (manga_info_list)
    for manga_info in manga_info_list:
        # Unpack the manga_info list into individual variables
        manga_id, last_chapter_read, status, last_read_at = manga_info
        # Print the manga information
        print(f"Manga: {manga_name}, Manga ID: {manga_id}, Last Chapter Read: {last_chapter_read}, Status: {status}, Last Read At: {last_read_at}")
        # Call the Update_Manga function to update the manga's progress and status on Anilist
        Update_Manga(manga_name, manga_id, last_chapter_read, private_bool, status, last_read_at, months)
        # Sleep for 0.3 seconds to reduce hitting the API rate limit
        time.sleep(0.3)

# Get the number of chapters updated
chapters_updated = Get_Chapters_Updated()
print(f"\nTotal chapters updated: {chapters_updated}")
#Write the number of chapters updated to a file
Write_Chapters_Updated(chapters_updated)

# Calculate and print the time taken
manga_update_end_time = time.time()
manga_update_time_taken = round((manga_update_end_time - manga_update_start_time), 3)
print(f"\nTime taken to get Update Manga data: {manga_update_time_taken} seconds")

print(f"\nTotal time taken: {round((manga_data_time_taken + manga_update_time_taken), 3)} seconds")

print("\nScript has finished, the 2 txt files generated by the program have manga that was not found on anilist and manga that had multiple id's associated to it.\nPlease check these 2 files and see if there is anything that you need to do manually.\nThese files WILL get OVERWRITTEN if the program is run again.")
input("\nPress enter to exit...")