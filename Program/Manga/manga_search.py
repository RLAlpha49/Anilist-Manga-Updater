"""
This module contains the MangaSearch class which is used to search for a manga on Anilist.
"""

import time

import pymoe
from Manga.GetID import Check_Title_Match, no_manga_found  # pylint: disable=E0401


class MangaSearch:  # pylint: disable=R0902
    """
    A class used to search for a manga on Anilist.

    Attributes:
    name (str): The name of the manga to search for.
    last_chapter_read (int): The last chapter read of the manga.
    app: The application object used to update the terminal and progress.
    max_retries (int, optional): The maximum number of retries. Defaults to 5.
    delay (int, optional): The delay between retries in seconds. Defaults to 15.
    retry_count (int): The current number of retries.
    matches (list): The list of matches from the search results.
    id_list (list): The list of IDs for the matches.

    Methods:
    search_manga(): Searches for the manga on Anilist.
    process_manga_item(manga_item): Processes a manga item from the search results.
    process_title(title): Processes the title by replacing certain characters.
    check_title_match(title): Checks if the title matches the name.
    get_id_list(): Gets the list of IDs from the matches.
    print_details(): Prints the details of the matches.
    handle_no_ids_found(): Handles the case where no IDs are found.
    handle_server_error(e): Handles server errors.
    get_manga_id(): Retrieves the ID of the manga.
    """

    def __init__(
        self, name, last_chapter_read, app, max_retries=3, delay=60
    ):  # pylint: disable=R0913
        """
        Initializes the MangaSearch object.

        Parameters:
        name (str): The name of the manga to search for.
        last_chapter_read (int): The last chapter read of the manga.
        app: The application object used to update the terminal and progress.
        max_retries (int, optional): The maximum number of retries. Defaults to 5.
        delay (int, optional): The delay between retries in seconds. Defaults to 15.
        """
        self.name = name
        self.last_chapter_read = last_chapter_read
        self.app = app
        self.max_retries = max_retries
        self.delay = delay
        self.retry_count = 0
        self.matches = []
        self.id_list = []

    def search_manga(self):  # pylint: disable=R1710
        """
        Searches for the manga on Anilist.

        Returns:
        list: A list of manga items from the search results. If an error occurs, it returns None.
        """
        max_retries = 5  # Maximum number of retries
        for attempt in range(max_retries):  # pylint: disable=W0612
            try:
                return pymoe.manga.search.anilist.manga(self.name)
            except (pymoe.errors.serverError, KeyError) as e:  # pylint: disable=E1101
                # Handle server error
                if "Too Many Requests" in str(e):
                    self.app.update_terminal(
                        f"\nToo Many Requests For Pymoe. Retrying in {self.delay} seconds..."
                    )
                    time.sleep(self.delay)
                    self.retry_count += 1
                else:
                    self.app.update_terminal(
                        f"\nAn unexpected error occurred for {self.name}: {e}. "
                        "Retrying in 2 seconds..."
                    )
                    time.sleep(2)
        self.app.update_terminal(
            f"Failed to search for {self.name} after {max_retries} attempts."
        )

    def process_manga_item(self, manga_item):
        """
        Processes a manga item from the search results.

        This method gets the English and Romaji titles and the synonyms from the manga item.
        It processes them and checks if they match the name.
        If they do, it adds the manga item to the matches.

        Parameters:
        manga_item (dict): The manga item to process.
        """
        title = manga_item["title"]
        match = False
        if "english" in title and title["english"]:
            english_title = self.process_title(title["english"])
            match = match or self.check_title_match(english_title)
        if "romaji" in title and title["romaji"]:
            romaji_title = self.process_title(title["romaji"])
            match = match or self.check_title_match(romaji_title)
        if "synonyms" in manga_item:
            for synonym in manga_item["synonyms"]:
                synonym = self.process_title(synonym)
                match = match or self.check_title_match(synonym)
        if match:
            self.matches.append((match, manga_item))

    def process_title(self, title):
        """
        Processes the title by replacing certain characters.

        Parameters:
        title (str): The title to process.

        Returns:
        str: The processed title.
        """
        title = title.replace("-", " ")
        title = title.replace("\u2019", "\u0060")
        title = title.replace("`", "'")
        return title

    def check_title_match(self, title):
        """
        Checks if the title matches the name.

        Parameters:
        title (str): The title to check.

        Returns:
        bool: True if the title matches the name, False otherwise.
        """
        return Check_Title_Match(title, self.name)

    def get_id_list(self):
        """
        Gets the list of IDs from the matches.

        This method sorts the matches by the match score in descending order.
        Then it gets the list of IDs for the matches with a positive match score.
        """
        self.matches.sort(key=lambda x: x[0], reverse=True)
        self.id_list = [manga_item["id"] for match, manga_item in self.matches if match]

    def print_details(self):
        """
        Prints the details of the matches.

        This method prints the list of IDs, the romaji title, the English title,
        and the Anilist URL for the matches with a positive match score.
        """
        if self.id_list:
            self.app.update_terminal(f"\nList of IDs for {self.name} : {self.id_list}")
            romaji_title = self.matches[0][1]["title"]["romaji"]
            english_title = self.matches[0][1]["title"]["english"]
            self.app.update_terminal(f"Romaji Title: {romaji_title}")
            self.app.update_terminal(f"English Title: {english_title}")
            for match, manga_item in self.matches:
                if match:
                    self.app.update_terminal(f"Anilist URL: {manga_item['siteUrl']}")

    def handle_no_ids_found(self):
        """
        Handles the case where no IDs are found.

        This method prints a message and adds the name and the last chapter read
        to the list of manga not found if no IDs are found.
        """
        if not self.id_list:
            self.app.update_terminal(f"\nNo manga found for '{self.name}'.")
            no_manga_found.append((self.name, self.last_chapter_read))

    def handle_server_error(self, e):
        """
        Handles server errors.

        This method checks if the error is a "Too Many Requests" error.
        If so, it waits for a delay and increments the retry count.
        If the error is not a "Too Many Requests" error, it prints an error message.

        Parameters:
        e (Exception): The server error to handle.
        """
        if "Too Many Requests" in str(e):
            self.app.update_terminal(
                f"\nToo Many Requests For Pymoe. Retrying in {self.delay} seconds..."
            )
            time.sleep(self.delay)
            self.retry_count += 1
        else:
            self.app.update_terminal(
                f"An unexpected server error occurred for {self.name}: {e}"
            )

    def get_manga_id(self):
        """
        Retrieves the ID of the manga.

        This method searches for the manga, processes the search results, gets the list of IDs,
        prints the details, and handles cases where no IDs are found. If the manga name is
        "Skipping Title", it skips the search and returns an empty list. If the maximum number
        of retries is reached without finding an ID, it prints an error message and returns an
        empty list.

        Returns:
        list: A list of IDs for the manga. If no IDs are found or an error occurs, it returns
        an empty list.
        """
        result = []
        while self.retry_count < self.max_retries:
            if self.name != "Skipping Title":
                try:
                    manga = self.search_manga()
                    if manga is None or not manga:
                        break
                    for manga_item in manga:
                        self.process_manga_item(manga_item)
                    self.retry_count = (
                        0  # Reset the retry count after a successful search
                    )
                except pymoe.errors.serverError as e:  # pylint: disable=E1101
                    self.handle_server_error(e)
                    continue
                except IndexError:
                    self.app.update_terminal(
                        f"\nNo search results found for '{self.name}'."
                    )
                    no_manga_found.append((self.name, self.last_chapter_read))
                    break
                except KeyError:
                    self.app.update_terminal(
                        f"\nFailed to get data for '{self.name}', retrying..."
                    )
                    self.retry_count += 1
                    continue
                if not self.matches:
                    self.app.update_terminal(
                        f"\nNo search results found for '{self.name}'."
                    )
                    no_manga_found.append((self.name, self.last_chapter_read))
                    break
                self.get_id_list()
                self.print_details()
                self.handle_no_ids_found()
                if self.id_list:
                    result = self.id_list
                    break
            else:
                self.app.update_terminal("\nSkipping a title...")
                break
        else:
            self.app.update_terminal(
                f"Failed to get manga ID for '{self.name}' after {self.max_retries} retries."
            )
        return result
