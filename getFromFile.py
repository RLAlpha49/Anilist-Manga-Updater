import pandas as pd

df = pd.read_csv('kenmei-export.csv')

def Get_Manga_Names():
    # Iterate through each row in the DataFrame
    for index, row in df.iterrows():
        # Extract the title and last_chapter_read from each row
        title = row['title']
        last_chapter_read = row['last_chapter_read']
        try:
            # Print the extracted information
            print(f"Title: {title}, Last Chapter Read: {int(last_chapter_read)}")
        except ValueError:
            print(f"Title: {title}, Has no Last Chapter Read")
        except AttributeError:
            print(f"Title: {title}, Has no Last Chapter Read")
    return ["That Time I Got Reincarnated as a Slime", "Drama Writer Who Reads Spoilers", "The S-Classes That I Raised", "I'm Being Raised by Villains", "Reborn as the Enemy Prince","Isekai Tenishita Node Cheat wo Ikashite Mahou Kenshi Yaru Koto ni Suru"]

Get_Manga_Names()