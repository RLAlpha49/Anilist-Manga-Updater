# Import necessary modules
import pandas as pd

# Initialize an empty dictionary to store the manga names and chapters
manga_names_chapters = {}

# Function to print the manga found in the CSV file
def Manga_Found_In_CSV(app):
    # Get the manga with the last chapter from the CSV file
    manga_with_last_chapter = Get_Manga_Names(app)
    
    try:
        # Print the manga found in the CSV file
        app.update_terminal("Manga found in CSV:")
        for title, details in manga_with_last_chapter.items():
            app.update_terminal(f"Title: {title}, Last Chapter Read: {details.get('last_chapter_read')}, Last Read At: {details.get('last_read_at')}")
    except AttributeError:
        return None

# Function to get manga names from a file
def Get_Manga_Names(app):
    # Get the difference between the current and previous file
    file = Get_File_Diff(app)
    try:
        # Iterate through each row in the file
        for index, row in file.iterrows():
            # Get the title, last chapter read, status, and last read at from the row
            title = row['title']
            last_chapter_read = row['last_chapter_read']
            status = row['status']
            last_read_at = row['last_read_at']

            try:
                # Add the title and its details to the manga_names_chapters dictionary
                manga_names_chapters[title] = {'last_chapter_read': int(last_chapter_read), 'status': status, 'last_read_at': last_read_at}
            except (ValueError, AttributeError):
                # If there is no last chapter read, print a message and add the title and its status to the dictionary
                app.update_terminal(f"Title: {title}, Has no Last Chapter Read")
                app.update_terminal(status)
                if status == 'plan_to_read':
                    manga_names_chapters[title] = {'status': status}
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