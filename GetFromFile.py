import pandas as pd

# Initialize an empty dictionary to store the manga names and chapters
manga_names_chapters = {}

def Get_Manga_Names(app):
    file = Get_File_Diff(app)
    try:
        for index, row in file.iterrows():
            title = row['title']
            last_chapter_read = row['last_chapter_read']
            status = row['status']
            last_read_at = row['last_read_at']

            try:
                manga_names_chapters[title] = {'last_chapter_read': int(last_chapter_read), 'status': status, 'last_read_at': last_read_at}
            except (ValueError, AttributeError):
                app.update_terminal(f"Title: {title}, Has no Last Chapter Read")
                app.update_terminal(status)
                if status == 'plan_to_read':
                    manga_names_chapters[title] = {'status': status}
    except AttributeError:
        return None

    return manga_names_chapters

def Manga_Found_In_CSV(app):
    manga_with_last_chapter = Get_Manga_Names(app)
    
    try:
        app.update_terminal("Manga found in CSV:")
        for title, details in manga_with_last_chapter.items():
            app.update_terminal(f"Title: {title}, Last Chapter Read: {details.get('last_chapter_read')}, Last Read At: {details.get('last_read_at')}")
    except AttributeError:
        return None

def Get_File_Diff(app):
    try:
        df = pd.read_csv(app.file_path)
        has_previous_file = app.previous_file_path != ''
        if has_previous_file:
            df_previous = pd.read_csv(app.previous_file_path)
    except FileNotFoundError:
        app.update_terminal("Error: Please browse for a kenmei export file. (Previous is Optional)")
        return None

    if has_previous_file:
        df_diff = pd.merge(df, df_previous, how='outer', indicator=True)
        df_diff = df_diff[df_diff['_merge'] == 'left_only']
        print(df_diff)
        return df_diff

    return df