from GetFromFile import Get_Manga_Names
from GetID import Get_Manga_ID, Clean_Manga_IDs, Get_No_Manga_Found
from AccessAPI import Get_Format, Update_Manga, Get_Chapters_Updated
from WriteToFile import Write_Chapters_Updated
import time

API_CALL_DELAY = 0.3
UPDATE_DELAY = 0.3

def print_time_taken(start_time, task_name):
    end_time = time.time()
    time_taken = round((end_time - start_time), 3)
    print(f"\nTime taken to {task_name}: {time_taken} seconds")
    return time_taken

def get_user_input(prompt, validation_func, error_message):
    while True:
        user_input = input(prompt)
        validated_input = validation_func(user_input)
        if validated_input is not None:
            return validated_input
        else:
            print(error_message)

def is_yes_no_response(response):
    if response.lower() == 'y':
        return True
    elif response.lower() == 'n':
        return False
    else:
        return None

def is_digit_or_empty(response):
    return response.isdigit() or response == ''

# Record the start time
manga_data_start_time = time.time()

# Call the function and get the list of IDs & Names
manga_names_ids = {}
manga_names = Get_Manga_Names()

# Iterate through the manga_names dictionary
for manga_name, manga_info in manga_names.items():
    # Sleep for 0.4 seconds to reduce hitting the API rate limit
    time.sleep(API_CALL_DELAY)
    status = manga_info['status'] 

    # Get the manga IDs regardless of the status
    manga_ids = Get_Manga_ID(manga_name)
    print("List of IDs for", manga_name, ":", manga_ids)

    # Iterate through the list of manga IDs
    for manga_id in manga_ids:
        # Get the format of the manga regardless of the status
        media_info = Get_Format(manga_id)

        # If the format of the manga is not a novel
        if media_info != "NOVEL":
            # Set the manga_type variable to the format of the manga
            manga_type = media_info

            # If the manga name is not already in the manga_names_ids dictionary
            if manga_name not in manga_names_ids:
                # Add the manga name to the manga_names_ids dictionary with an empty list as the value
                manga_names_ids[manga_name] = []

            # If the status is not 'plan_to_read', append additional information
            if status != 'plan_to_read':
                last_chapter_read = manga_info['last_chapter_read']
                last_read_at = manga_info['last_read_at']
                manga_names_ids[manga_name].append((manga_id, last_chapter_read, manga_info['status'], last_read_at))

# Clean the manga_names_ids dictionary
manga_names_ids = Clean_Manga_IDs(manga_names_ids)

# Print the dictionary containing manga names and associated IDs
print("\nManga Names With Associated IDs & Chapters Read:")
for manga_name, ids in manga_names_ids.items():
    print(f"{manga_name}: {ids}")

print("\nNot Found Manga:")
Get_No_Manga_Found()

# Calculate and print the time taken
manga_data_time_taken = print_time_taken(manga_data_start_time, "get Manga data")

# Get the private_bool
private_bool = get_user_input("\nWould you like all entries on Anilist to be private and only seen by you? (y/n): ", is_yes_no_response, "Invalid input")

# Get months value to set manga to PAUSED
months = get_user_input("How many months would you like to set the manga to PAUSED if it has not been read for those number of months? Set to 0 to ignore. (Default: 4): ", is_digit_or_empty, "Invalid input")

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
        time.sleep(UPDATE_DELAY)

# Get the number of chapters updated
chapters_updated = Get_Chapters_Updated()
print(f"\nTotal chapters updated: {chapters_updated}")
#Write the number of chapters updated to a file
Write_Chapters_Updated(chapters_updated)

# Calculate and print the time taken
manga_update_time_taken = print_time_taken(manga_update_start_time, "update Manga data")

print(f"\nTotal time taken: {round((manga_data_time_taken + manga_update_time_taken), 3)} seconds")

print("\nScript has finished, the 2 txt files generated by the program have manga that was not found on anilist and manga that had multiple id's associated to it.\nPlease check these 2 files and see if there is anything that you need to do manually.\nThese files WILL get OVERWRITTEN if the program is run again.")
input("\nPress enter to exit...")