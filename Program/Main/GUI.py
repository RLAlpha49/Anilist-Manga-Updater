#!/user/bin/env python
"""
This module contains the implementation of the main GUI for the application.

It includes classes for the main window, buttons, and other GUI components,
as well as methods for handling user input and updating the GUI.
"""

# pylint: disable=C0103, W0604, E0401, C0413, C0302
# Import necessary modules
import datetime
import os
import platform
import sys
import threading
import time
from tkinter import filedialog, messagebox, simpledialog

import CTkToolTip
import customtkinter
from PIL import Image

# Import custom functions
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from API.APIRequests import Set_Access_Token  # noqa: E402
from API.GetAccessToken import Get_Access_Token  # noqa: E402
from Utils.Config import (  # noqa: E402
    Get_Config,
    create_config,
    load_config,
    save_config,
)
from Utils.GetFromFile import alternative_titles_dict  # noqa: E402
from Utils.log import log  # noqa: E402
from Utils.WriteToFile import (  # noqa: E402
    Get_Alt_Titles_From_File,
    Save_Alt_Titles_To_File,
)

# Define a global variable for the progress
global progress, progress_status
progress = 0
progress_status = "Waiting..."

# Set the appearance mode and color theme for the custom tkinter library
if platform.system() == "Linux":
    customtkinter.set_appearance_mode("Dark")
else:
    customtkinter.set_appearance_mode("System")
customtkinter.set_default_color_theme("blue")

# Define the path for the configuration file
config_path = "config.json"

# Define the base path and image directory for the application
base_path = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
base_path = os.path.dirname(os.path.dirname(base_path))

image_directory = os.path.join(base_path, "Resources")
image1dir = os.path.join(image_directory, "Anilist-Manga-Updater-Logo2.png")


# Define a class for the access token thread
class AccessTokenThread(threading.Thread):
    """
    A class used to create a thread for getting the access token.

    Attributes
    ----------
    stop : bool
        a flag used to stop the thread
    """

    def __init__(self):
        """
        Initialize the thread and define a stop flag for the thread.
        """
        super().__init__()
        self.stop = False
        log("AccessTokenThread initialized.")

    def run(self):
        """
        Run the Get_Access_Token function in the thread.
        """
        log("AccessTokenThread started.")
        Get_Access_Token(self, app)  # pylint: disable=E0601
        log("AccessTokenThread finished.")

    def stop_thread(self):
        """
        Set the stop flag to True to stop the thread.
        """
        self.stop = True
        log("AccessTokenThread stopped.")


class App(customtkinter.CTk):  # pylint: disable=C0115, R0902
    def __init__(self):  # pylint: disable=R0915
        super().__init__()

        global program_thread  # pylint: disable=W0601
        program_thread = None
        self.after_id = None
        self.start_time = None
        self.thread1 = None
        log("Initialized GUI.")

        # Load the application logo
        logo = customtkinter.CTkImage(
            light_image=Image.open(image1dir), size=(100, 100)
        )
        log("Loaded application logo.")

        # Set the window title and size
        self.title("Anilist Manga Updater")
        self.geometry(f"{1100}x{700}")
        log("Set window title and size.")

        # Configure the grid layout for the window
        self.grid_columnconfigure(1, weight=1)
        self.grid_columnconfigure((2, 3), weight=0)
        self.grid_rowconfigure((0, 1, 2), weight=1)
        log("Configured grid layout for the window.")

        # Create a sidebar frame for the window
        self.sidebar_frame = customtkinter.CTkFrame(self, width=140, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, rowspan=9, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(7, weight=1)
        log("Created sidebar frame for the window.")

        # Add the application logo and title to the sidebar
        self.logo_label = customtkinter.CTkLabel(
            self.sidebar_frame, image=logo, text=""
        )  # display image with a CTkLabel
        self.logo_label.grid(row=0, column=0, padx=20, pady=(10, 10))
        self.title_label = customtkinter.CTkLabel(
            self.sidebar_frame,
            text="Anilist Manga\nUpdater",
            font=customtkinter.CTkFont(size=22, weight="bold"),
        )
        self.title_label.grid(row=1, column=0, padx=20, pady=(0, 10))
        log("Added application logo and title to the sidebar.")

        # Add buttons to the sidebar for various actions
        self.start_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=self.start_button_clicked,
            text="Start",
            font=customtkinter.CTkFont(size=18),
        )
        self.start_button.grid(row=2, column=0, padx=20, pady=5)
        log("Added 'Start' button to the sidebar.")

        self.api_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=self.open_input_dialog_event,
            text="Set API Values",
        )
        self.api_button.grid(row=3, column=0, padx=20, pady=5)
        log("Added 'Set API Values' button to the sidebar.")

        self.access_token_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=self.access_token_button_clicked,
            text="Get Access Token",
        )
        self.access_token_button.grid(row=4, column=0, padx=20, pady=5)
        log("Added 'Get Access Token' button to the sidebar.")

        self.month_button = customtkinter.CTkButton(
            self.sidebar_frame, command=self.month_button_clicked, text="Set Months"
        )
        self.month_button.grid(row=5, column=0, padx=20, pady=5)
        log("Added 'Set Months' button to the sidebar.")

        self.private_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=self.private_button_clicked,
            text="Private Value",
        )
        self.private_button.grid(row=6, column=0, padx=20, pady=5)
        log("Added 'Private Value' button to the sidebar.")

        self.alt_titles_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=lambda: self.manage_alternative_titles(),  # pylint: disable=W0108
            text="Manage Alt Titles",
        )
        self.alt_titles_button.grid(row=7, column=0, padx=20, pady=5)
        log("Added 'Manage Alt Titles' button to the sidebar.")

        # Create a label and option menu for the appearance mode
        self.appearance_mode_label = customtkinter.CTkLabel(
            self.sidebar_frame, text="Appearance Mode:", anchor="w"
        )
        self.appearance_mode_label.grid(row=8, column=0, padx=20, pady=(10, 0))
        log("Created 'Appearance Mode' label.")

        self.appearance_mode_optionemenu = customtkinter.CTkOptionMenu(
            self.sidebar_frame,
            values=["Light", "Dark", "System"],
            command=self.change_appearance_mode_event,
        )
        self.appearance_mode_optionemenu.grid(row=9, column=0, padx=20, pady=(10, 0))
        log("Created 'Appearance Mode' option menu.")

        # Create a label and option menu for the UI scaling
        self.scaling_label = customtkinter.CTkLabel(
            self.sidebar_frame, text="UI Scaling:", anchor="w"
        )
        self.scaling_label.grid(row=10, column=0, padx=20, pady=(5, 0))
        log("Created 'UI Scaling' label.")

        self.scaling_optionemenu = customtkinter.CTkOptionMenu(
            self.sidebar_frame,
            values=["80%", "90%", "100%", "110%", "120%"],
            command=self.change_scaling_event,
        )
        self.scaling_optionemenu.grid(row=11, column=0, padx=20, pady=(10, 15))
        log("Created 'UI Scaling' option menu.")

        # Create an exit button
        self.exit_button = customtkinter.CTkButton(
            self.sidebar_frame, command=self.on_close, text="Exit"
        )
        self.exit_button.grid(row=12, column=0, padx=20, pady=(5, 15))
        log("Created 'Exit' button.")

        # Create a terminal textbox
        self.terminal = customtkinter.CTkTextbox(self, width=250, wrap="word")
        self.terminal.grid(
            row=0,
            column=1,
            columnspan=3,
            rowspan=3,
            padx=(20, 20),
            pady=(20, 0),
            sticky="nsew",
        )
        log("Created terminal textbox.")

        # Create time remaining label
        self.time_remaining_label = customtkinter.CTkLabel(
            self, text="Estimated Time Remaining: NaN", anchor="w"
        )
        self.time_remaining_label.grid(
            row=3, column=1, padx=(20, 20), pady=(5, 5), sticky="nsew"
        )
        log("Created 'Estimated Time Remaining' label.")

        # Create time taken label
        self.time_taken_label = customtkinter.CTkLabel(
            self, text="Time Taken: 0:00:00", anchor="e"
        )
        self.time_taken_label.grid(
            row=3, column=3, padx=(20, 20), pady=(5, 5), sticky="nsew"
        )
        log("Created 'Time Taken' label.")

        # Create a progress bar
        self.progress_bar = customtkinter.CTkProgressBar(self, width=200, height=20)
        self.progress_bar.grid(
            row=4, column=1, columnspan=3, padx=(20, 20), sticky="nsew"
        )
        self.progress_bar.set(0)
        log("Created progress bar.")

        # Create a percent label under the progress bar
        self.percent_label = customtkinter.CTkLabel(self, text="0%", anchor="center")
        self.percent_label.grid(
            row=5, column=1, columnspan=3, padx=(20, 20), sticky="nsew"
        )
        log("Created percent label under the progress bar.")

        # Create a status label under the progress bar
        self.status_label = customtkinter.CTkLabel(
            self,
            text=(
                f"Status: {progress_status[:37]}..."
                if len(progress_status) > 40
                else progress_status
            ),
        )
        self.status_label.grid(
            row=6, column=1, columnspan=3, padx=(20, 20), sticky="nsew"
        )
        log("Created status label under the progress bar.")

        # Create an entry field and browse button for the previous Kenmei export file path
        self.previous_file_path_textbox = customtkinter.CTkEntry(
            self, placeholder_text="Previous Kenmei Export File Path"
        )
        self.previous_file_path_textbox.grid(
            row=7, column=1, columnspan=2, padx=(20, 0), pady=(15, 15), sticky="nsew"
        )
        log("Created entry field for the previous Kenmei export file path.")

        self.previous_browse_button = customtkinter.CTkButton(
            master=self,
            fg_color="transparent",
            border_width=2,
            text_color=("gray10", "#DCE4EE"),
            text="Browse",
            command=lambda: self.browse_file(self.previous_file_path_textbox, True),
        )
        self.previous_browse_button.grid(
            row=7, column=3, padx=(20, 20), pady=(15, 15), sticky="nsew"
        )
        log("Created browse button for the previous Kenmei export file path.")

        # Create an entry field and browse button for the Kenmei export file path
        self.file_path_textbox = customtkinter.CTkEntry(
            self, placeholder_text="Kenmei Export File Path"
        )
        self.file_path_textbox.grid(
            row=8, column=1, columnspan=2, padx=(20, 0), pady=(5, 15), sticky="nsew"
        )
        log("Created entry field for the Kenmei export file path.")

        self.browse_button = customtkinter.CTkButton(
            master=self,
            fg_color="transparent",
            border_width=2,
            text_color=("gray10", "#DCE4EE"),
            text="Browse",
            command=lambda: self.browse_file(self.file_path_textbox, False),
        )
        self.browse_button.grid(
            row=8, column=3, padx=(20, 20), pady=(5, 15), sticky="nsew"
        )
        log("Created browse button for the Kenmei export file path.")

        # Set default values for the appearance mode, UI scaling, and file path textboxes
        self.appearance_mode_optionemenu.set("Dark")
        log("Set default appearance mode to 'Dark'.")
        self.scaling_optionemenu.set("100%")
        log("Set default UI scaling to '100%'.")
        self.previous_file_path_textbox.configure(state="disabled")
        log("Disabled previous file path textbox.")
        self.file_path_textbox.configure(state="disabled")
        log("Disabled file path textbox.")

        # Add a welcome message to the terminal
        self.terminal.insert(
            "end",
            "Welcome to Anilist Manga Updater!\n\n"
            "Please make sure to set all values with the buttons on the left side.\n\n",
        )
        log("Added welcome message to the terminal.")
        self.terminal.configure(state="disabled")
        log("Disabled terminal.")

        # Set the protocol for the window close button to call the on_close function
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        log("Set window close button protocol to call 'on_close' function.")

        # Initialize the file path variables
        self.file_path = ""
        log("Initialized 'file_path' variable.")
        self.previous_file_path = ""
        log("Initialized 'previous_file_path' variable.")

        # Create tooltips for the buttons and option menus
        self.start_button_tooltip = CTkToolTip.CTkToolTip(
            self.start_button,
            (
                "Starts the program.\n"
                "The only way to stop this is to exit the Program with the exit button.",
            ),
        )
        log("Created tooltip for 'Start' button.")
        self.api_button_tooltip = CTkToolTip.CTkToolTip(
            self.api_button,
            "Opens a dialog to set the API values.\nThis is for the API's Client and Secret ID's",
        )
        log("Created tooltip for 'API' button.")
        self.access_token_button_tooltip = CTkToolTip.CTkToolTip(
            self.access_token_button,
            "Opens a dialog to get the access token.\nThis may need to be refreshed in the future.",
        )
        log("Created tooltip for 'Access Token' button.")
        self.month_button_tooltip = CTkToolTip.CTkToolTip(
            self.month_button,
            (
                "Opens a dialog to set the number of months.\n"
                "This checks when the last time you read a chapter was and if it was "
                "after the number of months you set.\n"
                "It will change the status to Paused.\n"
                "If you want the program to ignore this set this to 0",
            ),
        )
        log("Created tooltip for 'Month' button.")
        self.private_button_tooltip = CTkToolTip.CTkToolTip(
            self.private_button,
            (
                "Opens a dialog to set the private value.\n"
                "This is for if you want to set the manga that you update on here "
                "to private on Anilist.\n"
                "Meaning it will not show up as activity or on your list for other users."
            ),
        )
        log("Created tooltip for 'Private' button.")
        self.appearance_mode_optionemenu_tooltip = CTkToolTip.CTkToolTip(
            self.appearance_mode_optionemenu,
            "Changes the appearance mode of the application.",
        )
        log("Created tooltip for 'Appearance Mode' option menu.")
        self.scaling_optionemenu_tooltip = CTkToolTip.CTkToolTip(
            self.scaling_optionemenu,
            (
                "Changes the UI scaling of the application.\n"
                "You may need to resize winodw to fit the new scaling.",
            ),
        )
        log("Created tooltip for 'UI Scaling' option menu.")
        self.exit_button_tooltip = CTkToolTip.CTkToolTip(
            self.exit_button,
            (
                "Exits the application.\n"
                "Please use this to exit program.\n"
                "It is possible that the application will still run if you just "
                "close the window rather than use this button."
            ),
        )
        log("Created tooltip for 'Exit' button.")
        self.previous_file_path_textbox_tooltip = CTkToolTip.CTkToolTip(
            self.previous_file_path_textbox,
            "Displays the path of the previous Kenmei export file. (Optional)",
        )
        log("Created tooltip for 'Previous Kenmei Export File Path' textbox.")

        self.previous_browse_button_tooltip = CTkToolTip.CTkToolTip(
            self.previous_browse_button,
            "Opens a file dialog to select the previous Kenmei export file. (Optional))",
        )
        log("Created tooltip for 'Previous Kenmei Export File Path' browse button.")

        self.file_path_textbox_tooltip = CTkToolTip.CTkToolTip(
            self.file_path_textbox, "Displays the path of the Kenmei export file."
        )
        log("Created tooltip for 'Kenmei Export File Path' textbox.")

        self.browse_button_tooltip = CTkToolTip.CTkToolTip(
            self.browse_button, "Opens a file dialog to select the Kenmei export file."
        )
        log("Created tooltip for 'Kenmei Export File Path' browse button.")

        self.progress_bar_tooltip = CTkToolTip.CTkToolTip(
            self.progress_bar, f"{round((progress * 100), 1)}%"
        )
        log("Created tooltip for progress bar.")

    def manage_alternative_titles(self):
        """
        This method manages alternative titles.
        It allows the user to add, edit, or delete alternative titles.
        The user interacts with the method through a series of dialog boxes and terminal prompts.
        """
        log("Starting to manage alternative titles.")
        alt_titles_dict = Get_Alt_Titles_From_File(alternative_titles_dict)
        log("Retrieved alternative titles from file.")
        action = self.get_action()
        if action is None:
            log("No action selected. Exiting manage alternative titles.")
            return

        log(f"Action selected: {action}")
        if action in ["edit", "delete"]:
            original_title = self.get_original_title(alt_titles_dict)
            if original_title is None:
                log("No original title selected. Exiting manage alternative titles.")
                return

            log(f"Original title selected: {original_title}")
            if action == "edit":
                log("Starting to edit alternative title.")
                self.edit_alternative_title(alt_titles_dict, original_title)
                log("Finished editing alternative title.")
            elif action == "delete":
                log("Starting to delete alternative title.")
                self.delete_alternative_title(alt_titles_dict, original_title)
                log("Finished deleting alternative title.")
        elif action == "add":
            log("Starting to add alternative title.")
            self.add_alternative_title(alt_titles_dict)
            log("Finished adding alternative title.")
        log("Finished managing alternative titles.")

    def get_action(self):
        """
        Get the action from the user.
        """
        options = ["add", "edit", "delete"]
        for i, option in enumerate(options, 1):
            self.update_terminal(f"{i}. {option}")
        self.update_terminal("")

        log("Prompting user for action selection.")
        action_index = simpledialog.askinteger(
            "Manage Alternative Titles",
            "Enter the number of the option you want to select:",
        )
        if action_index is None or action_index == 0 or action_index > len(options):
            log("Invalid or no action selected by user.")
            return None
        log(f"User selected action: {options[action_index - 1]}")
        return options[action_index - 1]

    def get_original_title(self, alt_titles_dict):
        """
        Get the original title from the user.
        """
        titles = list(alt_titles_dict.items())
        for i, (title, _) in enumerate(titles, 1):
            self.update_terminal(f"{i}. {title}")

        log("Prompting user for title selection.")
        title_index = simpledialog.askinteger(
            "Select a title", "Enter the number of the title you want to select:"
        )
        if title_index is None or title_index == 0 or title_index > len(titles):
            log("Invalid or no title selected by user.")
            return None
        log(f"User selected title: {titles[title_index - 1][0]}")
        return titles[title_index - 1][0]

    def edit_alternative_title(self, alt_titles_dict, original_title):
        """
        Edit an alternative title.
        """
        log("Prompting user for new alternative title.")
        new_alternative_title = simpledialog.askstring(
            "Edit Alternative Title", "Enter the new alternative title:"
        )
        if new_alternative_title is None or new_alternative_title == "":
            log("No new alternative title provided. Exiting edit.")
            return
        log(f"New alternative title provided: {new_alternative_title}")
        alt_titles_dict[original_title] = new_alternative_title
        Save_Alt_Titles_To_File(alt_titles_dict)
        log("Saved alternative titles to file.")

    def delete_alternative_title(self, alt_titles_dict, original_title):
        """
        Delete an alternative title.
        """
        log(f"Deleting alternative title: {original_title}")
        alt_titles_dict.pop(original_title, None)
        Save_Alt_Titles_To_File(alt_titles_dict)
        log("Saved alternative titles to file.")

    def add_alternative_title(self, alt_titles_dict):
        """
        Add an alternative title.
        """
        log("Prompting user for original title.")
        original_title = simpledialog.askstring(
            "Add Alternative Title", "Enter the original title:"
        )
        if original_title is None or original_title == "":
            log("No original title provided. Exiting add.")
            return
        log(f"Original title provided: {original_title}")
        log("Prompting user for alternative title.")
        alternative_title = simpledialog.askstring(
            "Add Alternative Title", "Enter the alternative title:"
        )
        if alternative_title is None or alternative_title == "":
            log("No alternative title provided. Exiting add.")
            return
        log(f"Alternative title provided: {alternative_title}")
        alt_titles_dict[original_title] = alternative_title
        Save_Alt_Titles_To_File(alt_titles_dict)
        log("Saved alternative titles to file.")

    def update_estimated_time_remaining(self, estimated_time_remaining):
        """
        This method updates the estimated time remaining label in the GUI.

        It converts the estimated time remaining from seconds to hours, minutes, and seconds,
        updates the time remaining label, and schedules itself to be called again after 1 second
        if there is still time remaining.

        Parameters:
        estimated_time_remaining (int): The estimated time remaining in seconds.
        """
        # Convert the estimated time remaining to hours, minutes, and seconds
        time_remaining = str(datetime.timedelta(seconds=int(estimated_time_remaining)))

        # Update the time remaining label
        self.time_remaining_label.configure(
            text=f"Estimated Time Remaining: {time_remaining}"
        )
        self.update_idletasks()

        # If there is still time remaining
        if estimated_time_remaining > 0:
            # If the function is already scheduled, cancel it
            if self.after_id is not None:
                self.after_cancel(self.after_id)

            # Schedule this function to be called again after 1 second and store the ID
            self.after_id = self.after(
                1000, self.update_estimated_time_remaining, estimated_time_remaining - 1
            )

    def update_progress_bar(self):
        """
        This method updates the progress bar and status label in the GUI.

        If the program thread is running, it updates the progress and status,
        as well as the time taken label. If the program thread is not running,
        it stops the function.

        This method is scheduled to be called every 100 milliseconds.
        """
        if program_thread.is_alive():
            # If the thread is running, update the progress and status
            self.progress_bar.set(progress)
            self.status_label.configure(text=f"Status: {progress_status}")

            # Update the time taken
            time_taken = time.time() - self.start_time
            minutes, seconds = divmod(time_taken, 60)
            hours, minutes = divmod(minutes, 60)
            self.time_taken_label.configure(
                text=f"Time Taken: {int(hours):01d}:{int(minutes):02d}:{int(seconds):02d}"
            )
            self.update_idletasks()
        else:
            # If the thread is not running, set progress to 0 and stop the function
            log("Program thread is not running. Stopping progress bar update.")
            return
        self.after(100, self.update_progress_bar)

    def update_progress_and_status(self, status, program_progress=None):
        """
        This method updates the progress and status of the program.

        It updates the global variables `progress` and `progress_status` that were
        updated in the Program.py file. If the `program_progress` is different from
        `progress`, it updates the objects associated with it.

        Parameters:
        status (str): The status of the program.
        program_progress (float, optional): The progress of the program.
        Defaults to None.
        """
        # Update the global variables that were updated in the Program.py file
        global progress, progress_status  # pylint: disable=W0603
        if program_progress is None:
            log("No program progress provided. Using global progress.")
            program_progress = progress
        if program_progress != progress:
            # If progress is different update objects associated with it
            log(
                "Program progress is different from global progress. Updating progress and status."
            )
            progress = program_progress
            progress_status = status
            self.percent_label.configure(text=f"{round((progress * 100), 1)}%")
            self.progress_bar_tooltip.configure(
                message=f"{str(round((progress * 100), 1))}%"
            )
            log(f"Updated progress to: {progress} and status to: {status}")

    def update_terminal(self, text: str):
        """
        This method updates the terminal in the GUI with the provided text.

        It first checks if the scrollbar is at the bottom. If it is, it will
        automatically scroll to the end after inserting the text. The terminal is
        temporarily enabled for the insertion of the text and then disabled again.

        Parameters:
        text (str): The text to be inserted into the terminal.
        """
        # Check if the scrollbar is at the bottom
        at_bottom = self.terminal.yview()[1] == 1.0

        # Enable the terminal and insert the text
        self.terminal.configure(state="normal")
        self.terminal.insert("end", f"\n{text}")

        # If the scrollbar was at the bottom before inserting, scroll to the end
        if at_bottom:
            self.terminal.see("end")

        # Force Tkinter to update the GUI
        self.terminal.update_idletasks()

        # Disable the terminal
        self.terminal.configure(state="disabled")

    def browse_file(self, entry_widget, is_previous):
        """
        This method opens a file dialog for the user to select a file, and updates
        the entry widget with the selected file path.

        If the user cancels the file dialog, the text of the entry widget is restored
        to its previous state. If the user selects a file, the file path is inserted
        into the entry widget and stored in the appropriate variable.

        Parameters:
        entry_widget (tkinter.Entry): The entry widget to update with the selected
        file path.
        is_previous (bool): A flag indicating whether the selected file is a previous
        Kenmei export file.
        """
        # Store the current text of the entry widget
        current_text = entry_widget.get()
        log(f"Current text in the entry widget: {current_text}")

        # Open a file dialog and get the selected file path
        file_path = filedialog.askopenfilename()
        log(f"File path selected by the user: {file_path}")

        # Enable the entry widget and clear its current text
        entry_widget.configure(state="normal")
        entry_widget.delete(0, "end")

        # If the user cancels the file dialog, restore the text of the entry widget
        if file_path == "":
            log("User cancelled the file dialog.")
            if current_text == "":
                # If the entry widget was empty, insert the placeholder text
                if entry_widget == self.previous_file_path_textbox:
                    entry_widget.insert(0, "Previous Kenmei Export File Path")
                else:
                    entry_widget.insert(0, "Kenmei Export File Path")
                log("Entry widget was empty. Inserted placeholder text.")
            else:
                # If the entry widget had text, restore it
                entry_widget.insert(0, current_text)
                log("Restored the text in the entry widget.")
        else:
            # If the user selected a file, insert the file path into the entry widget
            entry_widget.insert(0, file_path)
            log("Inserted the selected file path into the entry widget.")
            # And store the file path in the appropriate variable
            if is_previous:
                self.previous_file_path = file_path
                log("Stored the selected file path in the previous_file_path variable.")
            else:
                self.file_path = file_path
                log("Stored the selected file path in the file_path variable.")

        # Disable the entry widget
        entry_widget.configure(state="disabled")
        log("Disabled the entry widget.")

    def open_input_dialog_event(self):
        """
        This method opens input dialogs for the client ID and secret ID.

        If the user cancels either dialog, it updates the terminal with a cancellation message.
        If the user enters both IDs, it creates a configuration file and saves it.
        """
        # Open input dialogs for the client ID and secret ID
        log("Opening input dialog for the Client ID.")
        client_id = customtkinter.CTkInputDialog(
            text="Type in the Client ID:", title="Client ID"
        )
        client_id_value = client_id.get_input()
        log(f"Client ID input: {client_id_value}")

        log("Opening input dialog for the Secret ID.")
        secret_id = customtkinter.CTkInputDialog(
            text="Type in the Secret ID:", title="Secret ID"
        )
        secret_id_value = secret_id.get_input()
        log(f"Secret ID input: {secret_id_value}")

        # If the user cancels either dialog, update the terminal with a cancellation message
        if client_id_value is None or secret_id_value is None:
            log("User cancelled the input dialog.")
            self.update_terminal("Canceled")
        else:
            # If the user enters both IDs, create a configuration file and save it
            log("User entered both IDs. Creating and saving configuration file.")
            config = create_config(client_id_value, secret_id_value)
            self.update_terminal("Configuration file created and saved.")
            save_config(config, config_path)
            log("Configuration file saved.")

    def open_token_dialog_event(self):
        """
        This method opens an input dialog for the access token.

        If the user cancels the dialog, it shows an error message and updates the
        terminal with a cancellation message. If the user enters the access token,
        it loads the configuration file, adds the access token, and saves the
        configuration file.
        """
        # Open an input dialog for the access token
        log("Opening input dialog for the Access Token.")
        token = customtkinter.CTkInputDialog(
            text="Type in the Access Token:", title="Access Token"
        )
        token_value = token.get_input()
        log(f"Access Token input: {token_value}")

        try:
            # Load the configuration file and add the access token
            log("Loading configuration file.")
            config = load_config(config_path)
            log("Adding Access Token to configuration file.")
            config["ACCESS_TOKEN"] = token_value
            log("Saving configuration file.")
            save_config(config, config_path)
            log("Configuration file saved.")
            self.update_terminal("Access Token set.")
            log("Access Token set.")
            Set_Access_Token(app)
            log("Set Access Token in app.")
            self.thread1.stop_thread()
            log("Stopped thread1.")
        except TypeError:
            # If the user cancels the dialog, show an error message
            log("User cancelled the input dialog.")
            messagebox.showerror("Error", "Canceled")
            self.update_terminal("Canceled")
            log("Updated terminal with cancellation message.")
            self.thread1.stop_thread()
            log("Stopped thread1.")

    def change_appearance_mode_event(self, new_appearance_mode: str):
        """
        This method changes the appearance mode of the application.

        Parameters:
        new_appearance_mode (str): The new appearance mode.
        """
        # Log the new appearance mode
        log(f"Changing appearance mode to: {new_appearance_mode}")

        # Change the appearance mode of the application
        customtkinter.set_appearance_mode(new_appearance_mode)

        # Log the successful change
        log("Appearance mode changed successfully.")

    def change_scaling_event(self, new_scaling: str):
        """
        This method changes the UI scaling of the application.

        Parameters:
        new_scaling (str): The new UI scaling.
        """
        # Log the new scaling
        log(f"Changing UI scaling to: {new_scaling}")

        # Change the UI scaling of the application
        new_scaling_float = int(new_scaling.replace("%", "")) / 100
        customtkinter.set_widget_scaling(new_scaling_float)

        # Log the successful change
        log("UI scaling changed successfully.")

    def access_token_button_clicked(self):
        """
        This method is called when the access token button is clicked.

        It gets the configuration, pauses execution for 2 seconds, creates a new
        thread for getting the access token, starts the access token thread, opens
        the token dialog, and waits for the access token thread to finish.
        """
        # Get the configuration
        log("Getting the configuration.")
        Get_Config(app)

        # Pause execution for 2 seconds
        log("Pausing execution for 2 seconds.")
        time.sleep(2)

        # Create a new thread for getting the access token
        log("Creating a new thread for getting the access token.")
        self.thread1 = AccessTokenThread()

        # Start the access token thread
        log("Starting the access token thread.")
        self.thread1.start()

        # Open the token dialog
        log("Opening the token dialog.")
        self.open_token_dialog_event()

        # Wait for the access token thread to finish
        log("Waiting for the access token thread to finish.")
        self.thread1.join()
        log("Access token thread finished.")

    def month_button_clicked(self):
        """
        This method is called when the month button is clicked.

        It opens an input dialog for the user to enter the number of months. If the
        user input is a digit, it updates the number of months in the configuration
        and saves it. If the configuration is not found, it shows an error message
        and updates the terminal. If the user input is not a digit, it shows an error
        message and updates the terminal.
        """
        while True:
            # Open an input dialog for the number of months
            log("Opening input dialog for the number of months.")
            months = customtkinter.CTkInputDialog(
                text="Type in the Number of Months:", title="Months"
            )
            months_value = months.get_input()
            log(f"Number of months input: {months_value}")

            # If the user input is a digit
            if months_value.isdigit():
                # Load the configuration
                log("Loading configuration.")
                config = load_config(config_path)
                if config is not None:
                    # Update the number of months in the configuration and save it
                    log("Updating number of months in configuration and saving it.")
                    config["MONTHS"] = months_value
                    save_config(config, config_path)
                    log("Configuration saved.")
                    break

                # If the configuration is not found, show an error message
                log("No configuration file found. Showing error message.")
                messagebox.showerror(
                    "Error",
                    "No config file found. Please set the API values first.",
                )
                self.update_terminal(
                    "No config file found. Please set the API values first."
                )
                log("Updated terminal with error message.")
                break
            # If the user input is not a digit, show an error message
            log("User input is not a digit. Showing error message.")
            messagebox.showerror("Error", "Canceled")
            self.update_terminal("Canceled")
            log("Updated terminal with cancellation message.")

    def start_button_clicked(self):
        """
        This method is called when the start button is clicked.

        It checks if the program thread is already running. If it is, it returns
        immediately. If the program thread is not running, it creates a new thread
        for the program, starts the program thread, sets the start time to the
        current time, updates the time taken label, updates the progress bar,
        and resets the progress to 0.
        """
        global progress  # pylint: disable=W0603
        global program_thread  # pylint: disable=W0601

        # Check if the thread is already running
        log("Checking if the program thread is already running.")
        if program_thread is not None and program_thread.is_alive():
            log("Program thread is already running. Returning immediately.")
            return

        # Import the Program class
        log("Importing the Program class.")
        from Main.Program import Program  # pylint: disable=C0415, E0611

        # Create a new thread for the program
        log("Creating a new thread for the program.")
        program_thread = threading.Thread(target=Program, args=(self,))

        # Start the program thread
        log("Starting the program thread.")
        program_thread.start()

        log("Setting the start time to the current time.")
        self.start_time = time.time()

        log("Updating the time taken label.")
        self.time_taken_label.configure(text="Time Taken: 0:00:00")

        log("Updating the progress bar.")
        self.update_progress_bar()

        log("Resetting the progress to 0.")
        progress = 0

    def private_button_clicked(self):
        """
        This method is called when the private button is clicked.

        It opens an input dialog for the user to enter the private value. If the user
        input is "yes" or "no", it updates the private value in the configuration and
        saves it. If the configuration is not found, it shows an error message and
        updates the terminal. If the user input is not "yes" or "no", it shows an error
        message and updates the terminal. If the user cancels the dialog, it shows an
        error message and updates the terminal.
        """
        while True:
            # Open an input dialog for the private value
            log("Opening input dialog for the private value.")
            private = customtkinter.CTkInputDialog(
                text="Type in the Private Value (Yes/No):", title="Private"
            )
            private_value = private.get_input()
            log(f"Private value input: {private_value}")

            try:
                # If the user input is "yes" or "no"
                if private_value.lower() in ["yes", "no"]:
                    # Load the configuration
                    log("Loading configuration.")
                    config = load_config(config_path)
                    if config is not None:
                        # Update the private value in the configuration and save it
                        log("Updating private value in configuration and saving it.")
                        config["PRIVATE"] = private_value
                        save_config(config, config_path)
                        log("Configuration saved.")
                        break
                    # If the configuration is not found, show an error message
                    log("No configuration file found. Showing error message.")
                    messagebox.showerror(
                        "Error",
                        "No config file found. Please set the API values first.",
                    )
                    self.update_terminal(
                        "No config file found. Please set the API values first."
                    )
                    log("Updated terminal with error message.")
                    break
                # If the user input is not "yes" or "no", show an error message
                log("User input is not 'yes' or 'no'. Showing error message.")
                messagebox.showerror("Error", "Invalid input. Please enter Yes or No.")
                self.update_terminal("Invalid input. Please enter Yes or No.")
                log("Updated terminal with error message.")
            except AttributeError:
                # If the user cancels the dialog, show an error message
                log("User cancelled the input dialog. Showing error message.")
                messagebox.showerror("Error", "Canceled")
                self.update_terminal("Canceled")
                log("Updated terminal with cancellation message.")

    def on_close(self):
        """
        This method is called when the application is closed.

        It exits the application.
        """
        # Log the application closing
        log("Closing the application.")

        # Exit the application
        sys.exit(0)


if __name__ == "__main__":
    # Log the start of the application
    log("Starting the application.")

    # Create an instance of the App class
    log("Creating an instance of the App class.")
    app = App()

    # Start the main loop
    log("Starting the main loop.")
    app.mainloop()

    # Log the end of the application
    log("Application ended.")
