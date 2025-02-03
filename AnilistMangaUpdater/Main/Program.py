# pylint: disable=C0103, C0114, E0401
# Import necessary modules
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Union

from API.AccessAPI import Get_Format, Get_User_Manga_List, Manga
from API.APIRequests import Set_Access_Token, needs_refresh
from API.UpdateManga import Get_Chapters_Updated, Set_Chapters_Updated, Update_Manga
from Manga.GetID import Clean_Manga_IDs, Get_No_Manga_Found
from Manga.manga_search import MangaSearch
from Utils.cache import Cache
from Utils.Config import Get_Config, load_config
from Utils.GetFromFile import (
    Get_Manga_Names,
    Manga_Found_In_CSV,
    alternative_titles_dict,
)
from Utils.log import Logger
from Utils.WriteToFile import write_chapters_updated_to_file


class Program:  # pylint: disable=R0903, C0115
    # Function to print the time taken for a task
    def print_time_taken(self, start_time: float, task_name: str) -> float:
        """
        Prints the time taken to perform a task and returns the time taken.

        This function calculates the time taken to perform a task.
        It then updates the terminal with a message indicating the time taken to perform the task.

        Args:
            start_time: The time when the task started.
            task_name: The name of the task.

        Returns:
            float: The time taken to perform the task, rounded to three decimal places.
        """
        Logger.DEBUG("Function print_time_taken called.")
        end_time: float = time.time()
        Logger.DEBUG(f"End time: {end_time}")
        time_taken: float = round((end_time - start_time), 3)
        Logger.INFO(f"Time taken to {task_name}: {time_taken} seconds")
        self.app.update_terminal(f"\nTime taken to {task_name}: {time_taken} seconds")
        Logger.DEBUG("Updated terminal with time taken.")
        return time_taken

    # Initialize the AnilistMangaUpdater class
    def __init__(self, app: object) -> None:  # pylint: disable=R0912, R0914, R0915
        """
        Initializes the Program class. This goes through the entire process of the script.

        Args:
            app: The gui object.
        """
        Logger.INFO("Initializing the class.")
        self.app = app
        self.cache = Cache("Manga_Data/format_cache.json")

        Set_Chapters_Updated()
        Logger.DEBUG("Set_Chapters_Updated called.")

        total_steps: int = 10  # Total number of steps in your program
        current_step: float = 0  # Current step number

        self.start_time_total = time.time()
        self.times_total = []
        self.total_steps_total = 0
        self.processed_steps_total = 0
        self.time_remaining_total = 0

        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status(
            "Setting access token & Loading configuration...",
            current_step / total_steps,
        )
        Logger.DEBUG("Updated progress and status.")

        # Set the access token
        token = Set_Access_Token(app)
        if token is False:
            return
        Logger.DEBUG("Set_Access_Token called.")
        # Check if the access token needs to be refreshed
        refresh: Union[bool, None] = needs_refresh(app)
        Logger.DEBUG(f"needs_refresh returned: {refresh}")
        if refresh:
            app.update_terminal("Access Token needs to be refreshed")
            app.update_progress_and_status("Token needs to be refreshed...", 0)
            Logger.WARNING(
                "Access token needs to be refreshed. Returning from __init__."
            )
            return

        # Load the configuration from the config.json file
        config: Union[dict, None] = load_config("config.json")
        Logger.DEBUG(f"Loaded config: {config}")
        if config is None:
            # If the configuration is not loaded successfully, get the configuration
            Get_Config(app)
            Logger.WARNING(
                "Config is None. Called Get_Config and returning from __init__."
            )
            return

        # If the configuration is loaded successfully, get the client ID, secret ID,
        # access token, months, and private from the configuration
        client: str = config["ANILIST_CLIENT_ID"]
        secret: str = config["ANILIST_CLIENT_SECRET"]
        token: str = config["ACCESS_TOKEN"]
        months: str = config["MONTHS"]
        private: str = config["PRIVATE"]

        # Flag to indicate whether all values are set
        all_values_set: bool = True

        # Check if any of the values are None and print a message if they are
        if client is None:
            app.update_terminal("Client ID needs to be set")
            all_values_set = False
            Logger.WARNING("Client ID is None.")
        if secret is None:
            app.update_terminal("Secret ID needs to be set")
            all_values_set = False
            Logger.WARNING("Secret ID is None.")
        if months is None:
            app.update_terminal("Months needs to be set")
            all_values_set = False
            Logger.WARNING("Months is None.")
        if private is None:
            app.update_terminal("Private needs to be set")
            all_values_set = False
            Logger.WARNING("Private is None.")
        if token is None:
            app.update_terminal("Access Token needs to be set")
            all_values_set = False
            Logger.WARNING("Access Token is None.")

        # If not all values are set, return
        if not all_values_set:
            app.update_progress_and_status("Configuration needs to be set...", 0)
            Logger.WARNING("Not all values are set. Returning from __init__.")
            return

        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status(
            "Checking file path...", current_step / total_steps
        )
        Logger.INFO("Checking file path...")

        # Check if the file path is set
        if app.file_path == "":
            app.update_terminal(
                "Error: Please browse for a kenmei export file. (Previous is Optional)"
            )
            Logger.ERROR("File path not set.")
            return

        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status(
            "Getting manga from CSV...", current_step / total_steps
        )
        Logger.INFO("Getting manga from CSV...")

        # Get the manga found in the CSV file
        Manga_Found_In_CSV(app)
        Logger.INFO("Manga found in CSV.")

        # Record the start time
        manga_data_start_time: float = time.time()
        Logger.DEBUG(f"Start time for manga data: {manga_data_start_time}")

        self.start_time_total = time.time()
        self.times_total = []
        self.processed_steps_total = 0

        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status(
            "Getting manga IDs...", current_step / total_steps
        )
        Logger.INFO("Getting manga IDs...")

        # Get the manga found in the CSV file
        manga_names_ids: dict = {}
        manga_names: dict = Get_Manga_Names(app, alternative_titles_dict)
        Logger.DEBUG(f"Manga names: {manga_names}")

        # Initialize estimation variables for Getting IDs
        total_ids = len(manga_names)
        processed_ids = 0
        times_ids = []

        # Iterate through the manga_names dictionary
        for manga_name, manga_info in manga_names.items():
            Logger.INFO(f"Processing manga: {manga_name}")
            try:
                app.update_progress_and_status(
                    f"Getting ID for {manga_name}...",
                    (current_step + ((processed_ids / total_ids) * 3)) / total_steps,
                )
                Logger.DEBUG("Updated progress and status.")
            except UnboundLocalError:
                app.update_progress_and_status(f"Getting ID for {manga_name}...")
                Logger.ERROR("UnboundLocalError occurred. Updated progress and status.")
            app.update_idletasks()
            Logger.DEBUG("Updated idle tasks.")

            # Record the time before finding the ID
            time_before: float = time.time()
            Logger.DEBUG(f"Time before finding ID: {time_before}")

            # Replace all occurrences of U+2019 with U+0060 in manga_name
            manga_name = manga_name.replace("\u2019", "\u0060")
            manga_name = manga_name.replace("-", " ")
            manga_name = manga_name.replace("`", "'")
            Logger.DEBUG(f"Processed manga name: {manga_name}")

            status: str = manga_info["status"]
            Logger.DEBUG(f"Manga status: {status}")

            # Get the manga IDs regardless of the status
            if status != "plan_to_read":
                if "last_chapter_read" in manga_info:
                    last_chapter_read = manga_info["last_chapter_read"]
                    manga_search = MangaSearch(manga_name, last_chapter_read, app)
                    Logger.DEBUG("Created MangaSearch instance with last chapter read.")
                else:
                    manga_search = MangaSearch(manga_name, None, app)
                    Logger.DEBUG(
                        "Created MangaSearch instance without last chapter read."
                    )
            else:
                manga_search = MangaSearch(manga_name, None, app)
                Logger.DEBUG("Created MangaSearch instance without last chapter read.")

            manga_ids: list = manga_search.get_manga_id()
            Logger.DEBUG(f"Got manga IDs: {manga_ids}")

            for manga_id in manga_ids:
                # Check if the media format is in the cache
                media_info: Union[str, None] = self.cache.get(f"{manga_id}_format")
                if media_info is None:
                    # Get the format of the manga regardless of the status
                    media_info = Get_Format(manga_id, app)
                    Logger.DEBUG(f"Got media info: {media_info}")
                    # Add the media format to the cache
                    self.cache.set(f"{manga_id}_format", media_info)

                # If the format of the manga is not a novel
                if media_info != "NOVEL":
                    Logger.DEBUG("Media info is not a novel.")

                    # If the manga name is not already in the manga_names_ids dictionary
                    if manga_name not in manga_names_ids:
                        # Add the manga name to the manga_names_ids dictionary
                        manga_names_ids[manga_name] = []
                        Logger.DEBUG("Added manga name to manga_names_ids.")

                    # If the status is not 'plan_to_read', append additional information
                    if status != "plan_to_read":
                        if "last_chapter_read" in manga_info:
                            last_chapter_read = manga_info["last_chapter_read"]
                            last_read_at = manga_info["last_read_at"]
                            manga_names_ids[manga_name].append(
                                (
                                    manga_id,
                                    last_chapter_read,
                                    manga_info["status"],
                                    last_read_at,
                                )
                            )
                        else:
                            manga_names_ids[manga_name].append(
                                (manga_id, None, manga_info["status"], None)
                            )
                        Logger.DEBUG(
                            "Appended additional information to manga_names_ids."
                        )
            # Increment the counter for the number of manga processed
            processed_ids += 1

            # Record the time after finding the ID
            time_after = time.time()
            Logger.DEBUG(f"Time after finding ID: {time_after}")

            operation_time: float = time_after - time_before
            Logger.DEBUG(f"Operation time: {operation_time}")

            # Append the operation time to the list
            times_ids.append(operation_time)
            Logger.DEBUG("Appended operation time to times_ids.")

            # Calculate the average time per manga ID
            average_time_ids = sum(times_ids) / len(times_ids)
            Logger.DEBUG(f"Average time per manga ID: {average_time_ids}")

            # Calculate the estimated time remaining for Getting IDs
            remaining_ids = total_ids - processed_ids
            estimated_time_remaining_ids = average_time_ids * remaining_ids
            Logger.INFO(
                f"Estimated time remaining for Getting IDs: {estimated_time_remaining_ids} seconds"
            )

            # Update the terminal with estimation
            app.update_estimated_time_remaining(estimated_time_remaining_ids)
            Logger.DEBUG("Updated estimated time remaining for Getting IDs.")

        # After the loop, estimate the total updates
        total_updates = sum(len(info_list) for info_list in manga_names_ids.values())
        Logger.INFO(f"Total updates to perform: {total_updates}")

        # Add the update phase to estimated total steps
        self.total_steps_total = total_updates

        # Update progress and status
        current_step += 3.5
        app.update_progress_and_status(
            "Cleaning manga IDs...", current_step / total_steps
        )
        Logger.INFO("Cleaning manga IDs...")

        # Clean the manga_names_ids dictionary
        manga_names_ids = Clean_Manga_IDs(manga_names_ids, app)
        Logger.DEBUG("Cleaned manga_names_ids.")

        # Print the dictionary containing manga names and associated IDs
        self.app.update_terminal("\nManga Names With Associated IDs & Chapters Read:")

        with ThreadPoolExecutor(max_workers=1) as executor:
            # Create a list to store the futures
            futures: list = []

            for manga_name, ids in manga_names_ids.items():
                for id_info in ids:
                    # Submit the task to the executor
                    future = executor.submit(
                        Program.process_id_info, manga_name, id_info
                    )
                    futures.append(future)

            # Gather the results
            messages: list = []
            for future in futures:
                messages.append(future.result())

            # Update the terminal
            self.app.update_terminal("\n".join(messages))
        self.app.update_terminal("\n\n")

        app.update_progress_and_status(
            "Writing no manga found file...",
            (current_step + (0.5 / 3) * 2) / total_steps,
        )
        Logger.INFO("Writing no manga found file...")
        Get_No_Manga_Found(app)

        # Calculate and print the time taken
        manga_data_time_taken: float = self.print_time_taken(
            manga_data_start_time, "get Manga data"
        )
        Logger.INFO(f"Time taken to get manga data: {manga_data_time_taken}")
        self.app.update_terminal("")

        # Record the start time for updating manga
        manga_update_start_time = time.time()
        Logger.DEBUG(f"Start time for manga update: {manga_update_start_time}")

        # Update progress and status
        app.update_progress_and_status("Updating manga...", 0.6)
        Logger.INFO("Updating manga...")

        # Initialize estimation variables for Updating Manga
        processed_updates = 0
        total_updates = sum(len(info_list) for info_list in manga_names_ids.values())
        times_updates = []
        skipped_ids: list = []
        Logger.DEBUG("Created list for skipped IDs.")

        # Get the entire manga list from AniList
        manga_list: list[dict[str, Union[int, str]]] = Get_User_Manga_List(app)
        Logger.INFO("Got user manga list from AniList.")

        # Iterate over entries in the cleaned manga_names_ids dictionary
        for manga_name, manga_info_list in manga_names_ids.items():
            Logger.INFO(f"Processing manga: {manga_name}")
            # For each manga, there is a list of information (manga_info_list)
            for manga_info in manga_info_list:
                # Unpack the manga_info list into individual variables
                manga_id, last_chapter_read, status, last_read_at = manga_info
                Logger.DEBUG(f"Processing manga info: {manga_info}")
                # Find the manga in the manga list
                manga_entry: Union[dict[str, Union[int, str]], None] = next(
                    (entry for entry in manga_list if entry["mediaId"] == manga_id),
                    None,
                )
                # If the manga was not found in the manga list
                if manga_entry is None:
                    self.app.update_terminal(
                        f"Manga: {manga_name} (ID: {manga_id}) was not "
                        "found on user list. Adding..."
                    )

                    Logger.WARNING(
                        f"Manga: {manga_name} "
                        f"(ID: {manga_id}) was not found "
                        "on user list. Adding..."
                    )
                    chapter_anilist, status_anilist = 0, None
                else:
                    # Get the current progress and status of the manga from the manga entry
                    chapter_anilist, status_anilist = (
                        (
                            int(manga_entry["progress"])
                            if isinstance(manga_entry["progress"], str)
                            else manga_entry["progress"]
                        ),
                        manga_entry["status"],
                    )
                    Logger.DEBUG(
                        f"Got current progress and status from manga entry: {manga_entry}"
                    )

                # If the progress or status has changed or the manga was not found in the manga list

                if (
                    manga_entry is None
                    or chapter_anilist != last_chapter_read
                    or status_anilist != status
                ):
                    Logger.INFO(f"Updating manga: {manga_name}")
                    manga = Manga(
                        name=manga_name,
                        manga_id=manga_id,
                        last_chapter_read=last_chapter_read,
                        private_bool=private,
                        status=status,
                        last_read_at=last_read_at,
                        months=months,
                    )
                    Logger.DEBUG(f"Created Manga instance: {manga}")

                    # Record the time taken for this update
                    update_time_before = time.time()

                    Update_Manga(manga, app, chapter_anilist, status_anilist)
                    Logger.DEBUG("Updated manga.")

                    # After updating the manga, increment the counter
                    processed_updates += 1
                    Logger.DEBUG(
                        f"Incremented processed_updates to: {processed_updates}"
                    )

                    # Assume Update_Manga is synchronous; if not, adjust accordingly
                    update_time_after = time.time()
                    operation_time_update = update_time_after - update_time_before
                    times_updates.append(operation_time_update)
                    Logger.DEBUG(f"Operation time for update: {operation_time_update}")

                    # Calculate the average time per update
                    average_time_update = sum(times_updates) / len(times_updates)
                    Logger.DEBUG(f"Average time per update: {average_time_update}")

                    # Calculate the estimated time remaining for Updating Manga
                    remaining_updates = total_updates - processed_updates
                    estimated_time_remaining_update = (
                        average_time_update * remaining_updates
                    )
                    Logger.INFO(
                        "Estimated time remaining for Updating Manga: "
                        + f"{estimated_time_remaining_update} seconds"
                    )

                    # Calculate total estimated time remaining
                    total_estimated_time_remaining = estimated_time_remaining_update
                    Logger.DEBUG(
                        f"Total estimated time remaining: {total_estimated_time_remaining}"
                    )

                    # Update the estimated time remaining in the app
                    app.update_estimated_time_remaining(total_estimated_time_remaining)
                    Logger.DEBUG("Updated estimated time remaining for Updating Manga.")

                    # Update the progress and status
                    app.update_progress_and_status(
                        f"Updating manga: {manga_name}",
                        (current_step + (processed_updates / total_updates) * 3)
                        / total_steps,
                    )
                    Logger.DEBUG("Updated progress and status for Updating Manga.")

                else:
                    # If the progress and status have not changed, add the manga ID to list
                    skipped_ids.append(manga_id)
                    Logger.DEBUG(f"Added manga ID: {manga_id} to skipped_ids.")

        # After the loop, print the IDs of the manga that were not updated
        if skipped_ids:
            Logger.WARNING(
                f"Skipped updating the following manga IDs because their entries "
                f"did not change: {', '.join(map(str, skipped_ids))}"
            )
            self.app.update_terminal(
                f"Skipped updating the following manga IDs because their entries "
                f"did not change: {', '.join(map(str, skipped_ids))}"
            )
            Logger.DEBUG(f"Skipped IDs: {skipped_ids}")

        Logger.INFO("Finished updating manga!")
        # After the loop, the progress should be exactly 90%
        app.update_progress_and_status("Finished updating manga!", 0.9)

        # Update progress and status
        app.update_progress_and_status("Writing chapters updated...", 0.95)
        Logger.INFO("Writing chapters updated...")

        # Get the number of chapters updated
        chapters_updated = Get_Chapters_Updated()
        Logger.INFO(f"\nTotal chapters updated: {chapters_updated}")
        self.app.update_terminal(f"\nTotal chapters updated: {chapters_updated}")
        # Write the number of chapters updated to a file
        write_chapters_updated_to_file("chapters_updated", chapters_updated)

        time.sleep(0.3)

        # Script has finished, update progress and status
        app.update_progress_and_status("Script Finished...", 1.0)
        Logger.INFO("Script Finished...")

        time.sleep(0.3)

        # Calculate and print the time taken
        manga_update_time_taken = self.print_time_taken(
            manga_update_start_time, "update Manga data"
        )
        Logger.INFO(
            f"Time taken to update Manga data: {manga_update_time_taken} seconds"
        )

        # Calculate the total time taken by adding the time taken to get manga data
        # and the time taken to update manga data
        total_time = round((manga_data_time_taken + manga_update_time_taken), 3)
        Logger.INFO(f"\nTotal time taken: {total_time} seconds")
        self.app.update_terminal(f"\nTotal time taken: {total_time} seconds")

        # Print a message indicating that the script has finished and provide
        # information about the generated text files
        Logger.INFO(
            "\nScript has finished, the 2 txt files generated by the program have manga "
            "that was not found on anilist and manga that had multiple id's associated to it."
            "\nPlease check the 2 files to see if there is anything that you need to do manually.\n"
        )
        self.app.update_terminal(
            "\nScript has finished, the 2 txt files generated by the program have manga "
            "that was not found on anilist and manga that had multiple id's associated to it."
            "\nPlease check the 2 files to see if there is anything that you need to do manually.\n"
        )

    @staticmethod
    def process_id_info(manga_name: str, id_info: tuple) -> str:
        """
        Process the ID information of a manga.

        Args:
            manga_name (str): The name of the manga.
            id_info (tuple): A tuple containing the manga ID, last chapter read,
             status, and last read date.

        Returns:
            str: A formatted string containing the processed information.
        """
        manga_id, last_chapter_read, status, last_read_at = id_info
        message = (
            f"{manga_name}, ID: {manga_id}, Last Chapter Read: "
            f"{last_chapter_read}, Status: {status}, Last Read At: {last_read_at}"
        )
        Logger.DEBUG(f"Processed info for manga: {manga_name}")
        return message
