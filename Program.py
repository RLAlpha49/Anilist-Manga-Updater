# Import necessary modules and functions
from GetFromFile import Get_Manga_Names, Manga_Found_In_CSV, alternative_titles_dict
from GetID import Get_Manga_ID, Clean_Manga_IDs, Get_No_Manga_Found, Set_No_Manga_Found
from AccessAPI import Get_Format, Update_Manga, Get_Chapters_Updated, Set_Chapters_Updated, Set_Access_Token, needs_refresh
from WriteToFile import Write_Chapters_Updated
from Config import Get_Config, load_config
import time

# Define constants for API call delay and update delay
API_CALL_DELAY = 0.3
UPDATE_DELAY = 0.3

class Program:
    # Function to print the time taken for a task
    def print_time_taken(self, start_time, task_name):
        end_time = time.time()
        time_taken = round((end_time - start_time), 3)
        self.app.update_terminal(f"\nTime taken to {task_name}: {time_taken} seconds")
        return time_taken

    # Initialize the Program class
    def __init__(self, app):
        self.app = app
        
        Set_No_Manga_Found()
        Set_Chapters_Updated()

        total_steps = 10  # Total number of steps in your program
        current_step = 0  # Current step number
        
        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status('Setting access token & Loading configuration...', current_step / total_steps)
        
        # Set the access token
        Set_Access_Token(app)
        # Check if the access token needs to be refreshed
        refresh = needs_refresh(app)
        if refresh == True:
            app.update_terminal("Access Token needs to be refreshed")
            app.update_progress_and_status('Token needs to be refreshed...', 0)
            return
        
        # Load the configuration from the config.json file
        config = load_config('config.json')
        if config is None:
            # If the configuration is not loaded successfully, get the configuration
            Get_Config(app)
            return
        else:
            # If the configuration is loaded successfully, get the client ID, secret ID, access token, months, and private from the configuration
            client = config['ANILIST_CLIENT_ID']
            secret = config['ANILIST_CLIENT_SECRET']
            token = config['ACCESS_TOKEN']
            months = config['MONTHS']
            private = config['PRIVATE']

            # Flag to indicate whether all values are set
            all_values_set = True

            # Check if any of the values are None and print a message if they are
            if client is None:
                app.update_terminal("Client ID needs to be set")
                all_values_set = False
            if secret is None:
                app.update_terminal("Secret ID needs to be set")
                all_values_set = False
            if months is None:
                app.update_terminal("Months needs to be set") 
                all_values_set = False
            if private is None:
                app.update_terminal("Private needs to be set")
                all_values_set = False
            if token is None:
                app.update_terminal("Access Token needs to be set")
                all_values_set = False

            # If not all values are set, return
            if not all_values_set:
                app.update_progress_and_status('Configuration needs to be set...', 0)
                return
            
        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status('Checking file path...', current_step / total_steps)
        
        # Check if the file path is set
        if app.file_path == '':
            app.update_terminal("Error: Please browse for a kenmei export file. (Previous is Optional)")
            return
        
        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status('Getting manga from CSV...', current_step / total_steps)
        
        # Get the manga found in the CSV file
        Manga_Found_In_CSV(app)
        # Record the start time
        manga_data_start_time = time.time()
        
        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status('Getting manga IDs...', current_step / total_steps)

        # Call the function and get the list of IDs & Names
        manga_names_ids = {}
        manga_names = Get_Manga_Names(app, alternative_titles_dict)
        
        # Before the loop, record the start time and initialize a list to store the times
        start_time = time.time()
        times = []

        # Iterate through the manga_names dictionary
        for manga_name, manga_info in manga_names.items():
            try:
                app.update_progress_and_status(f'Getting ID for {manga_name}...', progress)
            except UnboundLocalError:
                app.update_progress_and_status(f'Getting ID for {manga_name}...')
            app.update_idletasks()
            
            # Record the time before finding the ID
            time_before = time.time()
            # Replace all occurrences of U+2019 with U+0060 in manga_name
            manga_name = manga_name.replace('\u2019', '\u0060')
            manga_name = manga_name.replace('-', ' ')
            manga_name = manga_name.replace('`', "'")
    
            # Sleep for 0.4 seconds to reduce hitting the API rate limit
            time.sleep(API_CALL_DELAY)
            status = manga_info['status'] 
            
            # Get the manga IDs regardless of the status
            if status != 'plan_to_read':
                last_chapter_read = manga_info['last_chapter_read']
                manga_ids = Get_Manga_ID(manga_name, last_chapter_read, app)
            else:
                manga_ids = Get_Manga_ID(manga_name, None, app)

            # Iterate through the list of manga IDs
            for manga_id in manga_ids:
                # Get the format of the manga regardless of the status
                media_info = Get_Format(manga_id, app)

                # If the format of the manga is not a novel
                if media_info != "NOVEL":

                    # If the manga name is not already in the manga_names_ids dictionary
                    if manga_name not in manga_names_ids:
                        # Add the manga name to the manga_names_ids dictionary with an empty list as the value
                        manga_names_ids[manga_name] = []

                    # If the status is not 'plan_to_read', append additional information
                    if status != 'plan_to_read':
                        last_chapter_read = manga_info['last_chapter_read']
                        last_read_at = manga_info['last_read_at']
                        manga_names_ids[manga_name].append((manga_id, last_chapter_read, manga_info['status'], last_read_at))
            
            # Record the time after finding the ID
            time_after = time.time()
            operation_time = time_after - time_before

            # Append the operation time to the list
            times.append(operation_time)

            # Calculate the average time per ID and the estimated total time
            average_time = sum(times) / len(times)
            estimated_total_time = average_time * len(manga_names)
            
            # Calculate the estimated time remaining
            time_elapsed = time.time() - start_time
            estimated_time_remaining = estimated_total_time - time_elapsed
            
            # Print the estimated time remaining
            app.update_estimated_time_remaining(estimated_time_remaining)

            # Calculate the progress for this step
            step_progress = (time_after - start_time) / estimated_total_time

            # Adjust the progress to be between 20% and 50%
            progress = 0.2 + step_progress * 0.3
        
        # After the loop, the progress should be around 50%
        app.update_progress_and_status('Finished getting IDs!')

        # Update progress and status
        current_step += 3.5
        app.update_progress_and_status('Cleaning manga IDs...', current_step / total_steps)
        
        # Clean the manga_names_ids dictionary
        manga_names_ids = Clean_Manga_IDs(manga_names_ids, app)
        
        # Print the dictionary containing manga names and associated IDs
        self.app.update_terminal("\nManga Names With Associated IDs & Chapters Read:")
        for manga_name, ids in manga_names_ids.items():
            for id_info in ids:
                manga_id, last_chapter_read, status, last_read_at = id_info
                self.app.update_terminal(f"{manga_name}, ID: {manga_id}, Last Chapter Read: {last_chapter_read}, Status: {status}, Last Read At: {last_read_at}")
        self.app.update_terminal("\n\n")
        
        app.update_progress_and_status('Writing no manga found file...', (current_step + (0.5/3) * 2) / total_steps)
        Get_No_Manga_Found(app)

        # Calculate and print the time taken
        manga_data_time_taken = self.print_time_taken(manga_data_start_time, "get Manga data")
        self.app.update_terminal("")

        # Record the start time
        manga_update_start_time = time.time()

        # Update progress and status
        current_step = 6
        app.update_progress_and_status('Updating manga...', 0.6)
        
        # Before the loop, initialize a counter for the number of manga updated
        manga_updated = 0
        total_manga = sum(len(info_list) for info_list in manga_names_ids.values())
        
        # Iterate over entries in the cleaned manga_names_ids dictionary
        for manga_name, manga_info_list in manga_names_ids.items():
            # For each manga, there is a list of information (manga_info_list)
            for manga_info in manga_info_list:
                try:
                    app.update_progress_and_status(f'Updating {manga_name}...', progress)
                except UnboundLocalError:
                    app.update_progress_and_status(f'Updating {manga_name}...')
                # Unpack the manga_info list into individual variables
                manga_id, last_chapter_read, status, last_read_at = manga_info
                # Print the manga information
                self.app.update_terminal(f"Manga: {manga_name}, Manga ID: {manga_id}, Last Chapter Read: {last_chapter_read}, Status: {status}, Last Read At: {last_read_at}")
                # Call the Update_Manga function to update the manga's progress and status on Anilist
                Update_Manga(manga_name, manga_id, last_chapter_read, private, status, last_read_at, months, app)
                # Sleep for 0.3 seconds to reduce hitting the API rate limit
                time.sleep(UPDATE_DELAY)
                
                # After updating the manga, increment the counter
                manga_updated += 1

                # Calculate the progress for this step
                step_progress = manga_updated / total_manga

                # Adjust the progress to be between 60% and 90%
                progress = 0.6 + step_progress * 0.3

                app.update_progress_and_status(f'Updating {manga_name}...', progress)
        
        current_step += 3
        # After the loop, the progress should be exactly 90%
        app.update_progress_and_status('Finished updating manga!', current_step / total_steps)

        # Update progress and status
        current_step += 0.5
        app.update_progress_and_status('Writing chapters updated...', current_step / total_steps)
        
        # Get the number of chapters updated
        chapters_updated = Get_Chapters_Updated()
        self.app.update_terminal(f"\nTotal chapters updated: {chapters_updated}")
        #Write the number of chapters updated to a file
        Write_Chapters_Updated(chapters_updated)
        
        time.sleep(0.3)
        
        # Script has finished, update progress and status
        current_step += 0.5
        app.update_progress_and_status('Script Finished...', current_step / total_steps)
        
        time.sleep(0.3)

        # Calculate and print the time taken
        manga_update_time_taken = self.print_time_taken(manga_update_start_time, "update Manga data")

        # Calculate the total time taken by adding the time taken to get manga data and the time taken to update manga data
        self.app.update_terminal(f"\nTotal time taken: {round((manga_data_time_taken + manga_update_time_taken), 3)} seconds")

        # Print a message indicating that the script has finished and provide information about the generated text files
        self.app.update_terminal("\nScript has finished, the 2 txt files generated by the program have manga that was not found on anilist and manga that had multiple id's associated to it.\nPlease check these 2 files and see if there is anything that you need to do manually.\n")