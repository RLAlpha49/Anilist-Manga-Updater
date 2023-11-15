import pandas as pd

# Read the CSV file into a DataFrame
df = pd.read_csv('kenmei-export.csv')

# Initialize an empty dictionary to store the manga names and chapters
manga_names_chapters = {}

def Get_Manga_Names():
    # Iterate through each row in the DataFrame
    for index, row in df.iterrows():
        # Extract the title, last_chapter_read, status and last_read_at from each row
        title = row['title']
        last_chapter_read = row['last_chapter_read']
        status = row['status']
        last_read_at = row['last_read_at']

        # Try to add the title, last chapter read and last read at to the dictionary
        try:
            manga_names_chapters[title] = {'last_chapter_read': int(last_chapter_read), 'status': status, 'last_read_at': last_read_at}
        except ValueError:
            # If the last chapter read is not a number, print an error message
            print(f"Title: {title}, Has no Last Chapter Read")
            print(status)
            if status == 'plan_to_read':
                manga_names_chapters[title] = {'status': status}
        except AttributeError:
            # If the last chapter read or last read at is missing, print an error message
            print(f"Title: {title}, Has no Last Chapter Read or Last Read At")
            print(status)
            if status == 'plan_to_read':
                manga_names_chapters[title] = {'status': status}

    # Return the dictionary of manga names and chapters
    return manga_names_chapters

# Get the dictionary of manga names and chapters
manga_with_last_chapter = Get_Manga_Names()

print("Manga found in CSV:")
# Loop through the dictionary and print each entry
for title, details in manga_with_last_chapter.items():
    if 'last_chapter_read' not in details or 'last_read_at' not in details:
        print(f"Title: {title}, Status: {details['status']}")
    else:
        print(f"Title: {title}, Last Chapter Read: {details['last_chapter_read']}, Last Read At: {details['last_read_at']}")

print("")