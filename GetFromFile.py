import pandas as pd

# Read the CSV file into a DataFrame
df = pd.read_csv('kenmei-export.csv')

# Initialize an empty dictionary to store the manga names and chapters
manga_names_chapters = {}

def Get_Manga_Names():
    # Iterate through each row in the DataFrame
    for index, row in df.iterrows():
        # Extract the title, last_chapter_read and status from each row
        title = row['title']
        last_chapter_read = row['last_chapter_read']
        status = row['status']

        # Try to add the title and last chapter read to the dictionary
        try:
            manga_names_chapters[title] = {'last_chapter_read': int(last_chapter_read), 'status': status}
        except ValueError:
            # If the last chapter read is not a number, print an error message
            print(f"Title: {title}, Has no Last Chapter Read")
        except AttributeError:
            # If the last chapter read is missing, print an error message
            print(f"Title: {title}, Has no Last Chapter Read")

    # Return the dictionary of manga names and chapters
    return manga_names_chapters

# Get the dictionary of manga names and chapters
manga_with_last_chapter = Get_Manga_Names()

print("Manga found in CSV:")
# Loop through the dictionary and print each entry
for title, last_chapter_read in manga_with_last_chapter.items():
    print(f"Title: {title}, Last Chapter Read: {last_chapter_read}")

print("")