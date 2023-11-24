import os
import datetime
import glob

directory = "Manga_Data"

# Function to manage files
def manage_files(directory, file_type):
    # Get a list of all files of the specified type in the directory sorted by modification time
    files = sorted(glob.glob(f"{directory}/{file_type}_*"), key=os.path.getmtime)
    # If there are more than 5 files, delete the oldest file
    if len(files) > 5:
        os.remove(files[0])

# Function to write not found manga names to a file
def Write_Not_Found(not_found_manga_names):
    if not os.path.exists(directory):
        os.makedirs(directory)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    with open(f'{directory}/not_found_{timestamp}.txt', 'w', encoding='utf-8') as not_found_file:
        if not_found_manga_names == []:
            not_found_file.write("Manga Names with No IDs Found:\n" + "No Manga Not Found")
        else:
            not_found_file.write("Manga Names with No IDs Found:\n" + "\n".join(not_found_manga_names))
    manage_files(directory, 'not_found')

# Function to write multiple IDs to a file
def Write_Multiple_IDs(multiple_id_manga_names):
    if not os.path.exists(directory):
        os.makedirs(directory)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    with open(f'{directory}/multiple_ids_{timestamp}.txt', 'w', encoding='utf-8') as multiple_file:
        lines = ["Duplicate Manga Names and IDs:\n"]
        if multiple_id_manga_names == {}:
            lines.append("No Manga Names with Multiple IDs Found\n")
        else:
            for manga_name, ids in multiple_id_manga_names.items():
                actual_ids = [id_tuple[0] for id_tuple in ids]
                lines.append(f"{manga_name} ID's: {', '.join(map(str, actual_ids))}\n")
                lines.extend([f"Anilist URL: https://anilist.co/manga/{manga_id}\n" for manga_id in actual_ids])
                lines.append("\n")
        multiple_file.writelines(lines)
    manage_files(directory, 'multiple_ids')

# Function to write the number of chapters updated to a file
def Write_Chapters_Updated(chapters_updated):
    # Define the directory path
    dir_path = 'Chapters-Updated'
    # If the directory does not exist, create it
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

    # Get the current timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Define the file path
    file_path = f'{dir_path}/chapters_updated.txt'
    # Open the file in append mode
    with open(file_path, 'a+', encoding='utf-8') as chapters_updated_file:
        # Write the timestamp and the number of chapters updated to the file
        chapters_updated_file.write(f"\n{timestamp} | Chapters Updated: {chapters_updated}" if os.path.exists(file_path) else f"{timestamp} | Chapters Updated: {chapters_updated}")