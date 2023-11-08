from GetID import Get_Manga_ID
import webbrowser  # Import the webbrowser module

# Call the function and get the list of IDs
manga_ids = Get_Manga_ID("That Time I Got Reincarnated as a Slime")
print("List of IDs:", manga_ids)

# Open the web browser for each manga ID
for manga_id in manga_ids:
    url = f"https://anilist.co/manga/{manga_id}"
    webbrowser.open_new_tab(url)
