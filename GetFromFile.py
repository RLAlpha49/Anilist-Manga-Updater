import pandas as pd

df = pd.read_csv('kenmei-export.csv')
manga_names_chapters = {}

def Get_Manga_Names():
    # Iterate through each row in the DataFrame
    for index, row in df.iterrows():
        # Extract the title and last_chapter_read from each row
        title = row['title']
        last_chapter_read = row['last_chapter_read']
        try:
            manga_names_chapters[title] = int(last_chapter_read)
        except ValueError:
            print(f"Title: {title}, Has no Last Chapter Read")
        except AttributeError:
            print(f"Title: {title}, Has no Last Chapter Read")
    return manga_names_chapters

manga_with_last_chapter = Get_Manga_Names()

# Loop through the dictionary and print each entry
for title, last_chapter_read in manga_with_last_chapter.items():
    print(f"Title: {title}, Last Chapter Read: {last_chapter_read}")
