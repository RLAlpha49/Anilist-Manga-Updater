from getFromFile import Get_Manga_Names
from GetID import Get_Manga_ID
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import webbrowser
import time

edge_path = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
edge_config_path = 'msedgeconfig.json'

# Create Microsoft Edge WebDriver with specified options
edge_options = webdriver.EdgeOptions()
edge_options.use_chromium = True
edge_options.binary_location = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
edge_options.add_argument(f'--msedge --msedge-path="{edge_config_path}"')

edge_driver = webdriver.Edge(options=edge_options)
webbrowser.register('edge', None, webbrowser.BackgroundBrowser(edge_path))

# Call the function and get the list of IDs & Names
manga_names_ids = {}
manga_names = Get_Manga_Names()

# Iterate through manga names
for manga_name in manga_names:
    manga_ids = Get_Manga_ID(manga_name)
    print("List of IDs for", manga_name, ":", manga_ids)

    # Iterate through manga IDs for the current manga name
    for manga_id in manga_ids:
        url = f"https://anilist.co/manga/{manga_id}"
        webbrowser.get('edge').open(url, new=1)
        time.sleep(0.5)

        edge_driver.get(url)

        # Wait for the element to be present using a CSS selector
        try:
            element = WebDriverWait(edge_driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".value"))
            )

            # Extract and print the text from the element
            manga_type = element.text.strip()
            print("Manga Type:", manga_type)

            if manga_type != "Light Novel":
                if manga_name not in manga_names_ids:
                    manga_names_ids[manga_name] = []

                manga_names_ids[manga_name].append(manga_id)

        except Exception as e:
            print("Element not found:", e)

#edge_driver.quit()

# Print the dictionary containing manga names and associated IDs
print("Manga Names and Associated IDs:")
for manga_name, ids in manga_names_ids.items():
    print(f"{manga_name}: {ids}")