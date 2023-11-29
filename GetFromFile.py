# Import necessary modules
import pandas as pd
from WriteToFile import Get_Alt_Titles_From_File

# Initialize an empty dictionary to store the manga names and chapters
manga_names_chapters = {}

# Initialize the dictionary to store the alternative titles
alternative_titles_dict = {
   "Insanely Talented Player" : "Insanely-Talented Player",
   "The Part Time Nation of the Gods" : "The Part-Time Land of the Gods",
   "Baek Clan’s Terminally Ill Young Master" : "The Terminally Ill Young Master of the Baek Clan ",
   "Yuiitsu Muni No Saikyou Tamer" : "Yuiitsu Muni no Saikyou Tamer: Kuni no Subete no Guild de Monzembaraisareta kara, Takoku ni Itte Slow-Life Shimasu",
   "The Dark Mage’s Return to Enlistment" : "The Dark Mage's Return to Enlistment",
   "Swordmaster’s Youngest Son" : "The Swordmaster's Son",
   "I Became a Renowned Family’s Sword Prodigy" : "I Became a Renowned Family's Sword Prodigy",
   "The God of War Who Regressed to Level 2" : "The Martial God who Regressed Back to Level 2",
   "Academy Genius Swordsman" : "Academy’s Genius Swordsman",
   "Auto-Hunting With Clones" : "Auto Hunting With My Clones",
   "Regressor’s Life After Retirement" : "Regressor's Life After Retirement",
   "Necromancer’s Evolutionary Traits" : "Necromancer's Evolutionary Traits",
}

alternative_titles_dict = Get_Alt_Titles_From_File(alternative_titles_dict)

# Function to print the manga found in the CSV file
def Manga_Found_In_CSV(app):
    # Get the manga with the last chapter from the CSV file
    manga_with_last_chapter = Get_Manga_Names(app, alternative_titles_dict)
    
    try:
        # Print the manga found in the CSV file
        app.update_terminal("Manga found in CSV:")
        for title, details in manga_with_last_chapter.items():
            app.update_terminal(f"Title: {title}, Last Chapter Read: {details.get('last_chapter_read')}, Last Read At: {details.get('last_read_at')}")
    except AttributeError:
        return None
    
def get_alternative_title(title, alternative_titles_dict):
    # Check if the title is in the dictionary
    if title in alternative_titles_dict:
        # If it is, return the alternative title
        return alternative_titles_dict[title]
    # If it's not, return the original title
    return title

# Function to get manga names from a file
def Get_Manga_Names(app, alternative_titles_dict):
    # Get the difference between the current and previous file
    file = Get_File_Diff(app)
    try:
        # Iterate through each row in the file
        for index, row in file.iterrows():
            # Get the title, last chapter read, status, and last read at from the row
            title = row['title']
            # Get the alternative title
            alt_title = get_alternative_title(title, alternative_titles_dict)
            last_chapter_read = row['last_chapter_read']
            status = row['status']
            last_read_at = row['last_read_at']

            try:
                # Add the alternative title and its details to the manga_names_chapters dictionary
                manga_names_chapters[alt_title] = {'last_chapter_read': int(last_chapter_read), 'status': status, 'last_read_at': last_read_at}
            except (ValueError, AttributeError):
                # If there is no last chapter read, print a message and add the alternative title and its status to the dictionary
                app.update_terminal(f"Title: {alt_title}, Has no Last Chapter Read")
                app.update_terminal(status)
                if status == 'plan_to_read':
                    manga_names_chapters[alt_title] = {'status': status}
    except AttributeError:
        return None

    # Return the manga_names_chapters dictionary
    return manga_names_chapters

# Function to get the difference between the current and previous file
def Get_File_Diff(app):
    try:
        # Read the current file
        df = pd.read_csv(app.file_path)
        # Check if there is a previous file
        has_previous_file = app.previous_file_path != ''
        if has_previous_file:
            # If there is a previous file, read it
            df_previous = pd.read_csv(app.previous_file_path)
    except FileNotFoundError:
        # If the file is not found, print an error message
        app.update_terminal("Error: Please browse for a kenmei export file. (Previous is Optional)")
        return None

    if has_previous_file:
        # If there is a previous file, get the difference between the current and previous file
        df_diff = pd.merge(df, df_previous, how='outer', indicator=True, on=['title', 'status', 'last_chapter_read', 'last_read_at'])
        df_diff = df_diff[df_diff['_merge'] == 'left_only']
        return df_diff
    return df