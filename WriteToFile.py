def Write_Multiple_IDs(multiple_id_manga_names):
    # Print and write duplicate manga names and IDs to a text file
    with open('multiple_manga_ids.txt', 'w', encoding='utf-8') as multiple_file:
        multiple_file.write("Duplicate Manga Names and IDs:\n")
        for manga_name, ids in multiple_id_manga_names.items():
            multiple_file.write(f"{manga_name}: {', '.join(map(str, ids))}\n")
            # Write Anilist URL for each ID
            for manga_id in ids:
                multiple_file.write(f"Anilist URL: https://anilist.co/manga/{manga_id}\n")

def Write_Not_Found(not_found_manga_names):
    # Print and write cleaned manga names and IDs to a text file
    with open('not_found_manga_names.txt', 'w', encoding='utf-8') as not_found_file:
        not_found_file.write("Manga Names with No IDs Found:\n")
        for manga_name in not_found_manga_names:
            not_found_file.write(f"{manga_name}\n")