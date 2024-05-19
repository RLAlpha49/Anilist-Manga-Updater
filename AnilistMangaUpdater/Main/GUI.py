#!/user/bin/env python
"""
This module contains the implementation of the main GUI for the application.

It includes classes for the main window, buttons, and other GUI components,
as well as methods for handling user input and updating the GUI.
"""

# pylint: disable=C0103, W0604, E0401, C0413, C0302, W0603
# Import necessary modules
import datetime
import os
import platform
import sys
import threading
import time
import tkinter
from tkinter import filedialog, messagebox, simpledialog
from typing import Optional, Union

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
from Utils.log import Logger  # noqa: E402
from Utils.WriteToFile import (  # noqa: E402
    Get_Alt_Titles_From_File,
    Save_Alt_Titles_To_File,
)

# Define a global variable for the progress
global progress, progress_status, program_thread
progress: float = 0
progress_status = "Waiting..."
program_thread: Union[threading.Thread, None] = None

# Set the appearance mode and color theme for the custom tkinter library
if platform.system() == "Linux":
    customtkinter.set_appearance_mode("Dark")
else:
    customtkinter.set_appearance_mode("System")
customtkinter.set_default_color_theme("blue")

# Define the path for the configuration file
config_path: str = "config.json"

# Define the base path and image directory for the application
base_path = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
base_path = os.path.dirname(os.path.dirname(base_path))

image_directory: str = os.path.join(base_path, "Resources")
image1dir: str = os.path.join(image_directory, "Anilist-Manga-Updater-Logo2.png")


# Define a class for the access token thread
class AccessTokenThread(threading.Thread):
    """
    A class that extends the threading.Thread class in Python. This class is used to create a separate thread for
    obtaining the access token from the Anilist API.

    Attributes:
        stop : bool
            A flag used to stop the thread. It is initially set to False.

    Methods:
        __init__():
            Initializes the AccessTokenThread. Sets the stop flag to False.

        run():
            Overrides the run method of threading.Thread. It checks if the global 'app' variable is None. If it is,
            it logs an error and returns. Otherwise, it calls the Get_Access_Token function with 'app' as the argument.

        stop_thread():
            Sets the stop flag to True, indicating that the thread should stop running.
    """

    def __init__(self) -> None:
        """
        Initialize the thread and define a stop flag for the thread.

        The stop flag is initially set to False, indicating that the thread should not be stopped.
        """
        super().__init__()
        self.stop: bool = False
        Logger.DEBUG("AccessTokenThread initialized.")

    def run(self) -> None:
        """
        Run the Get_Access_Token function in the thread.

        This method is called when the thread's start() method is invoked.
        It checks if the global 'app' variable is None. If it is, it logs an error and returns.
        Otherwise, it calls the Get_Access_Token function with 'app' as the argument.
        """
        if app is None:  # pylint: disable=E0606
            Logger.ERROR("App object not found.")
            return
        Logger.INFO("AccessTokenThread started.")
        Get_Access_Token(app)  # pylint: disable=E0601, E0606
        Logger.INFO("AccessTokenThread finished.")

    def stop_thread(self) -> None:
        """
        Set the stop flag to True to stop the thread.

        This method can be called to stop the thread. It sets the stop flag to True,
        which indicates that the thread should stop running.
        """
        self.stop = True
        Logger.INFO("AccessTokenThread stopped.")


def edit_alternative_title(alt_titles_dict, original_title) -> None:
    """
    Edits an alternative title in the alternative titles dictionary.

    This function prompts the user to input a new alternative title for a given original title.
    If the user provides a valid new alternative title, it updates the alternative titles dictionary
    and saves it to a file.

    Parameters:
        alt_titles_dict (dict): The dictionary containing the original titles as keys and alternative titles as values.
        original_title (str): The original title for which the alternative title is to be edited.

    Returns:
        None
    """
    Logger.INFO("Prompting user for new alternative title.")
    new_alternative_title = simpledialog.askstring(
        "Edit Alternative Title", "Enter the new alternative title:"
    )
    if new_alternative_title is None or new_alternative_title == "":
        Logger.WARNING("No new alternative title provided. Exiting edit.")
        return
    Logger.INFO(f"New alternative title provided: {new_alternative_title}")
    alt_titles_dict[original_title] = new_alternative_title
    Save_Alt_Titles_To_File(alt_titles_dict)
    Logger.INFO("Saved alternative titles to file.")


def delete_alternative_title(alt_titles_dict, original_title) -> None:
    """
    Deletes an alternative title from the alternative titles dictionary.

    This function removes the alternative title associated with the given original title
    from the alternative titles dictionary and saves the updated dictionary to a file.

    Parameters:
        alt_titles_dict (dict): The dictionary containing the original titles as keys and alternative titles as values.
        original_title (str): The original title for which the alternative title is to be deleted.

    Returns:
        None
    """
    Logger.INFO(f"Deleting alternative title: {original_title}")
    alt_titles_dict.pop(original_title, None)
    Save_Alt_Titles_To_File(alt_titles_dict)
    Logger.INFO("Saved alternative titles to file.")


def add_alternative_title(alt_titles_dict) -> None:
    """
    Adds an alternative title to the alternative titles dictionary.

    This function prompts the user to input an original title and its corresponding alternative title.
    If the user provides valid inputs, it updates the alternative titles dictionary with the new pair
    and saves it to a file.

    Parameters:
        alt_titles_dict (dict): The dictionary containing the original titles as keys and alternative titles as values.

    Returns:
        None
    """
    Logger.INFO("Prompting user for original title.")
    original_title = simpledialog.askstring(
        "Add Alternative Title", "Enter the original title:"
    )
    if original_title is None or original_title == "":
        Logger.WARNING("No original title provided. Exiting add.")
        return
    Logger.INFO(f"Original title provided: {original_title}")
    Logger.INFO("Prompting user for alternative title.")
    alternative_title = simpledialog.askstring(
        "Add Alternative Title", "Enter the alternative title:"
    )
    if alternative_title is None or alternative_title == "":
        Logger.WARNING("No alternative title provided. Exiting add.")
        return
    Logger.INFO(f"Alternative title provided: {alternative_title}")
    alt_titles_dict[original_title] = alternative_title
    Save_Alt_Titles_To_File(alt_titles_dict)
    Logger.INFO("Saved alternative titles to file.")


def change_appearance_mode_event(new_appearance_mode: str) -> None:
    """
    Changes the appearance mode of the application.

    This function changes the appearance mode of the application based on the input parameter.
    It logs the new appearance mode and the successful change of the appearance mode.

    Parameters:
        new_appearance_mode (str): The new appearance mode to be set. This should be a string representing
        the desired appearance mode.

    Returns:
        None
    """
    Logger.INFO(f"Changing appearance mode to: {new_appearance_mode}")
    customtkinter.set_appearance_mode(new_appearance_mode)
    Logger.INFO("Appearance mode changed successfully.")


def change_scaling_event(new_scaling: str) -> None:
    """
    Changes the UI scaling of the application.

    This function changes the UI scaling of the application based on the input parameter.
    It logs the new UI scaling and the successful change of the UI scaling.

    Parameters:
        new_scaling (str): The new UI scaling to be set. This should be a string representing the desired UI
        scaling in percentage format (e.g., "100%").

    Returns:
        None
    """
    Logger.INFO(f"Changing UI scaling to: {new_scaling}")
    new_scaling_float = int(new_scaling.replace("%", "")) / 100
    customtkinter.set_widget_scaling(new_scaling_float)
    Logger.INFO("UI scaling changed successfully.")


def on_close() -> None:
    """
    Handles the event when the application is closed.

    This function is triggered when the application is being closed. It logs the closing event and then terminates
    the application.

    Parameters:
        None

    Returns:
        None
    """
    # Log the application closing
    Logger.INFO("Closing the application.")

    # Exit the application
    sys.exit(0)


class App(customtkinter.CTk):  # pylint: disable=C0115, R0902
    def __init__(self) -> None:  # pylint: disable=R0915
        super().__init__()

        global program_thread  # pylint: disable=W0601
        program_thread = None
        self.after_id = None
        self.start_time: float = 0
        self.thread1: Union[AccessTokenThread, None] = None
        Logger.DEBUG("Initialized GUI.")

        # Load the application logo
        logo = customtkinter.CTkImage(
            light_image=Image.open(image1dir), size=(100, 100)
        )
        Logger.DEBUG("Loaded application logo.")

        # Set the window title and size
        self.title("Anilist Manga Updater")
        self.geometry(f"{1100}x{700}")
        Logger.INFO("Set window title and size.")

        # Configure the grid layout for the window
        self.grid_columnconfigure(1, weight=1)
        self.grid_columnconfigure((2, 3), weight=0)
        self.grid_rowconfigure((0, 1, 2), weight=1)
        Logger.DEBUG("Configured grid layout for the window.")

        # Create a sidebar frame for the window
        self.sidebar_frame = customtkinter.CTkFrame(self, width=140, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, rowspan=9, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(7, weight=1)
        Logger.DEBUG("Created sidebar frame for the window.")

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
        Logger.INFO("Added application logo and title to the sidebar.")

        # Add buttons to the sidebar for various actions
        self.start_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=self.start_button_clicked,
            text="Start",
            font=customtkinter.CTkFont(size=18),
        )
        self.start_button.grid(row=2, column=0, padx=20, pady=5)
        Logger.INFO("Added 'Start' button to the sidebar.")

        self.api_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=self.open_input_dialog_event,
            text="Set API Values",
        )
        self.api_button.grid(row=3, column=0, padx=20, pady=5)
        Logger.INFO("Added 'Set API Values' button to the sidebar.")

        self.access_token_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=self.access_token_button_clicked,
            text="Get Access Token",
        )
        self.access_token_button.grid(row=4, column=0, padx=20, pady=5)
        Logger.INFO("Added 'Get Access Token' button to the sidebar.")

        self.month_button = customtkinter.CTkButton(
            self.sidebar_frame, command=self.month_button_clicked, text="Set Months"
        )
        self.month_button.grid(row=5, column=0, padx=20, pady=5)
        Logger.INFO("Added 'Set Months' button to the sidebar.")

        self.private_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=self.private_button_clicked,
            text="Private Value",
        )
        self.private_button.grid(row=6, column=0, padx=20, pady=5)
        Logger.INFO("Added 'Private Value' button to the sidebar.")

        self.alt_titles_button = customtkinter.CTkButton(
            self.sidebar_frame,
            command=lambda: self.manage_alternative_titles(),  # pylint: disable=W0108
            text="Manage Alt Titles",
        )
        self.alt_titles_button.grid(row=7, column=0, padx=20, pady=5)
        Logger.INFO("Added 'Manage Alt Titles' button to the sidebar.")

        # Create a label and option menu for the appearance mode
        self.appearance_mode_label = customtkinter.CTkLabel(
            self.sidebar_frame, text="Appearance Mode:", anchor="w"
        )
        self.appearance_mode_label.grid(row=8, column=0, padx=20, pady=(10, 0))
        Logger.INFO("Created 'Appearance Mode' label.")

        self.appearance_mode_optionemenu = customtkinter.CTkOptionMenu(
            self.sidebar_frame,
            values=["Light", "Dark", "System"],
            command=change_appearance_mode_event,
        )
        self.appearance_mode_optionemenu.grid(row=9, column=0, padx=20, pady=(10, 0))
        Logger.INFO("Created 'Appearance Mode' option menu.")

        # Create a label and option menu for the UI scaling
        self.scaling_label = customtkinter.CTkLabel(
            self.sidebar_frame, text="UI Scaling:", anchor="w"
        )
        self.scaling_label.grid(row=10, column=0, padx=20, pady=(5, 0))
        Logger.INFO("Created 'UI Scaling' label.")

        self.scaling_optionemenu = customtkinter.CTkOptionMenu(
            self.sidebar_frame,
            values=["80%", "90%", "100%", "110%", "120%"],
            command=change_scaling_event,
        )
        self.scaling_optionemenu.grid(row=11, column=0, padx=20, pady=(10, 15))
        Logger.INFO("Created 'UI Scaling' option menu.")

        # Create an exit button
        self.exit_button = customtkinter.CTkButton(
            self.sidebar_frame, command=on_close, text="Exit"
        )
        self.exit_button.grid(row=12, column=0, padx=20, pady=(5, 15))
        Logger.INFO("Created 'Exit' button.")

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
        Logger.INFO("Created terminal textbox.")

        # Create time remaining label
        self.time_remaining_label = customtkinter.CTkLabel(
            self, text="Estimated Time Remaining: NaN", anchor="w"
        )
        self.time_remaining_label.grid(
            row=3, column=1, padx=(20, 20), pady=(5, 5), sticky="nsew"
        )
        Logger.INFO("Created 'Estimated Time Remaining' label.")

        # Create time taken label
        self.time_taken_label = customtkinter.CTkLabel(
            self, text="Time Taken: 0:00:00", anchor="e"
        )
        self.time_taken_label.grid(
            row=3, column=3, padx=(20, 20), pady=(5, 5), sticky="nsew"
        )
        Logger.INFO("Created 'Time Taken' label.")

        # Create a progress bar
        self.progress_bar = customtkinter.CTkProgressBar(self, width=200, height=20)
        self.progress_bar.grid(
            row=4, column=1, columnspan=3, padx=(20, 20), sticky="nsew"
        )
        self.progress_bar.set(0)
        Logger.INFO("Created progress bar.")

        # Create a percent label under the progress bar
        self.percent_label = customtkinter.CTkLabel(self, text="0%", anchor="center")
        self.percent_label.grid(
            row=5, column=1, columnspan=3, padx=(20, 20), sticky="nsew"
        )
        Logger.INFO("Created percent label under the progress bar.")

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
        Logger.INFO("Created status label under the progress bar.")

        # Create an entry field and browse button for the previous Kenmei export file path
        self.previous_file_path_textbox = customtkinter.CTkEntry(
            self, placeholder_text="Previous Kenmei Export File Path"
        )
        self.previous_file_path_textbox.grid(
            row=7, column=1, columnspan=2, padx=(20, 0), pady=(15, 15), sticky="nsew"
        )
        Logger.INFO("Created entry field for the previous Kenmei export file path.")

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
        Logger.INFO("Created browse button for the previous Kenmei export file path.")

        # Create an entry field and browse button for the Kenmei export file path
        self.file_path_textbox = customtkinter.CTkEntry(
            self, placeholder_text="Kenmei Export File Path"
        )
        self.file_path_textbox.grid(
            row=8, column=1, columnspan=2, padx=(20, 0), pady=(5, 15), sticky="nsew"
        )
        Logger.INFO("Created entry field for the Kenmei export file path.")

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
        Logger.INFO("Created browse button for the Kenmei export file path.")

        # Set default values for the appearance mode, UI scaling, and file path textboxes
        self.appearance_mode_optionemenu.set("Dark")
        Logger.INFO("Set default appearance mode to 'Dark'.")
        self.scaling_optionemenu.set("100%")
        Logger.INFO("Set default UI scaling to '100%'.")
        self.previous_file_path_textbox.configure(state="disabled")
        Logger.INFO("Disabled previous file path textbox.")
        self.file_path_textbox.configure(state="disabled")
        Logger.INFO("Disabled file path textbox.")

        # Add a welcome message to the terminal
        self.terminal.insert(
            "end",
            "Welcome to Anilist Manga Updater!\n\n"
            "Please make sure to set all values with the buttons on the left side.\n\n",
        )
        Logger.INFO("Added welcome message to the terminal.")
        self.terminal.configure(state="disabled")
        Logger.INFO("Disabled terminal.")

        # Set the protocol for the window close button to call the on_close function
        self.protocol("WM_DELETE_WINDOW", on_close)
        Logger.INFO("Set window close button protocol to call 'on_close' function.")

        # Initialize the file path variables
        self.file_path = ""
        Logger.INFO("Initialized 'file_path' variable.")
        self.previous_file_path = ""
        Logger.INFO("Initialized 'previous_file_path' variable.")

        # Create tooltips for the buttons and option menus
        self.start_button_tooltip = CTkToolTip.CTkToolTip(
            self.start_button,
            (
                "Starts the program.\n"
                "The only way to stop this is to exit the AnilistMangaUpdater with the exit button."
            ),
        )
        Logger.INFO("Created tooltip for 'Start' button.")
        self.api_button_tooltip = CTkToolTip.CTkToolTip(
            self.api_button,
            "Opens a dialog to set the API values.\nThis is for the API's Client and Secret ID's",
        )
        Logger.INFO("Created tooltip for 'API' button.")
        self.access_token_button_tooltip = CTkToolTip.CTkToolTip(
            self.access_token_button,
            "Opens a dialog to get the access token.\nThis may need to be refreshed in the future.",
        )
        Logger.INFO("Created tooltip for 'Access Token' button.")
        self.month_button_tooltip = CTkToolTip.CTkToolTip(
            self.month_button,
            (
                "Opens a dialog to set the number of months.\n"
                "This checks when the last time you read a chapter was and if it was "
                "after the number of months you set.\n"
                "It will change the status to Paused.\n"
                "If you want the program to ignore this set this to 0"
            ),
        )
        Logger.INFO("Created tooltip for 'Month' button.")
        self.private_button_tooltip = CTkToolTip.CTkToolTip(
            self.private_button,
            (
                "Opens a dialog to set the private value.\n"
                "This is for if you want to set the manga that you update on here "
                "to private on Anilist.\n"
                "Meaning it will not show up as activity or on your list for other users."
            ),
        )
        Logger.INFO("Created tooltip for 'Private' button.")

        self.appearance_mode_optionemenu_tooltip = CTkToolTip.CTkToolTip(
            self.appearance_mode_optionemenu,
            "Changes the appearance mode of the application.",
        )
        Logger.INFO("Created tooltip for 'Appearance Mode' option menu.")

        self.scaling_optionemenu_tooltip = CTkToolTip.CTkToolTip(
            self.scaling_optionemenu,
            (
                "Changes the UI scaling of the application.\n"
                "You may need to resize window to fit the new scaling."
            ),
        )
        Logger.INFO("Created tooltip for 'UI Scaling' option menu.")

        self.exit_button_tooltip = CTkToolTip.CTkToolTip(
            self.exit_button,
            (
                "Exits the application.\n"
                "Please use this to exit program.\n"
                "It is possible that the application will still run if you just "
                "close the window rather than use this button."
            ),
        )
        Logger.INFO("Created tooltip for 'Exit' button.")

        self.previous_file_path_textbox_tooltip = CTkToolTip.CTkToolTip(
            self.previous_file_path_textbox,
            "Displays the path of the previous Kenmei export file. (Optional)",
        )
        Logger.INFO("Created tooltip for 'Previous Kenmei Export File Path' textbox.")

        self.previous_browse_button_tooltip = CTkToolTip.CTkToolTip(
            self.previous_browse_button,
            "Opens a file dialog to select the previous Kenmei export file. (Optional)",
        )
        Logger.INFO(
            "Created tooltip for 'Previous Kenmei Export File Path' browse button."
        )

        self.file_path_textbox_tooltip = CTkToolTip.CTkToolTip(
            self.file_path_textbox, "Displays the path of the Kenmei export file."
        )
        Logger.INFO("Created tooltip for 'Kenmei Export File Path' textbox.")

        self.browse_button_tooltip = CTkToolTip.CTkToolTip(
            self.browse_button, "Opens a file dialog to select the Kenmei export file."
        )
        Logger.INFO("Created tooltip for 'Kenmei Export File Path' browse button.")

        self.progress_bar_tooltip = CTkToolTip.CTkToolTip(
            self.progress_bar, f"{round((progress * 100), 1)}%"
        )
        Logger.INFO("Created tooltip for progress bar.")

    def manage_alternative_titles(self) -> None:
        """
        Manages alternative titles in the application.

        This method allows the user to add, edit, or delete alternative titles. The user interacts with the method
        through a series of dialog boxes and terminal prompts. The method retrieves the current alternative titles
        from a file, prompts the user to select an action (add, edit, or delete), and performs the selected action.

        Parameters:
            None

        Returns:
            None
        """
        Logger.INFO("Starting to manage alternative titles.")
        alt_titles_dict = Get_Alt_Titles_From_File(alternative_titles_dict)
        Logger.INFO("Retrieved alternative titles from file.")
        action = self.get_action()
        if action is None:
            Logger.WARNING("No action selected. Exiting manage alternative titles.")
            return

        Logger.INFO(f"Action selected: {action}")
        if action in ["edit", "delete"]:
            original_title = self.get_original_title(alt_titles_dict)
            if original_title is None:
                Logger.WARNING(
                    "No original title selected. Exiting manage alternative titles."
                )
                return

            Logger.INFO(f"Original title selected: {original_title}")
            if action == "edit":
                Logger.INFO("Starting to edit alternative title.")
                edit_alternative_title(alt_titles_dict, original_title)
                Logger.INFO("Finished editing alternative title.")
            elif action == "delete":
                Logger.INFO("Starting to delete alternative title.")
                delete_alternative_title(alt_titles_dict, original_title)
                Logger.INFO("Finished deleting alternative title.")
        elif action == "add":
            Logger.INFO("Starting to add alternative title.")
            add_alternative_title(alt_titles_dict)
            Logger.INFO("Finished adding alternative title.")
        Logger.INFO("Finished managing alternative titles.")

    def get_action(self) -> Union[str, None]:
        """
        Get the action from the user.
        """
        options = ["add", "edit", "delete"]
        for i, option in enumerate(options, 1):
            self.update_terminal(f"{i}. {option}")
        self.update_terminal("")

        Logger.INFO("Prompting user for action selection.")
        action_index = simpledialog.askinteger(
            "Manage Alternative Titles",
            "Enter the number of the option you want to select:",
        )
        if action_index is None or action_index == 0 or action_index > len(options):
            Logger.WARNING("Invalid or no action selected by user.")
            return None
        Logger.INFO(f"User selected action: {options[action_index - 1]}")
        return options[action_index - 1]

    def get_original_title(self, alt_titles_dict) -> Union[str, None]:
        """
        Prompts the user to select an original title from the alternative titles dictionary.

        This method displays a list of original titles to the user and prompts them to select one.
        The user's selection is returned. If the user cancels the dialog or enters an invalid selection,
        the method returns None.

        Parameters:
            alt_titles_dict (dict): The dictionary containing the original titles as keys and alternative
            titles as values.

        Returns:
            str: The original title selected by the user, if a valid selection was made.
            None: If the user cancelled the dialog or made an invalid selection.
        """
        titles = list(alt_titles_dict.items())
        for i, (title, _) in enumerate(titles, 1):
            self.update_terminal(f"{i}. {title}")

        Logger.INFO("Prompting user for title selection.")
        title_index = simpledialog.askinteger(
            "Select a title", "Enter the number of the title you want to select:"
        )
        if title_index is None or title_index == 0 or title_index > len(titles):
            Logger.WARNING("Invalid or no title selected by user.")
            return None
        Logger.INFO(f"User selected title: {titles[title_index - 1][0]}")
        return titles[title_index - 1][0]

    def update_estimated_time_remaining(self, estimated_time_remaining: float) -> None:
        """
        Updates the estimated time remaining label in the GUI.

        This method converts the estimated time remaining from seconds to a time format (hours, minutes,
        and seconds), updates the time remaining label, and schedules itself to be called again after 1 second if
        there is still time remaining.

        If the estimated time remaining is less than 0, it is set to 0. If there is still time remaining,
        and the function is already scheduled, the scheduled function is cancelled. Then, this function is scheduled
        to be called again after 1 second.

        Parameters:
            estimated_time_remaining (float): The estimated time remaining in seconds.

        Returns:
            None
        """
        # If estimated_time_remaining is less than 0, set it to 0
        estimated_time_remaining = max(estimated_time_remaining, 0)

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

    def update_progress_bar(self) -> None:
        """
        Updates the progress bar, status label, and time taken label in the GUI.

        This method is scheduled to be called every 100 milliseconds. If the program thread is running,
        it updates the progress and status, as well as the time taken label. If the program thread is not running,
        it logs a warning and stops the function.

        Parameters:
            None

        Returns:
            None
        """
        if program_thread is not None and program_thread.is_alive():
            # If the thread is running, update the progress and status
            self.progress_bar.set(progress)
            self.status_label.configure(text=f"Status: {progress_status}")

            # Update the time taken
            time_taken: float = time.time() - self.start_time
            minutes, seconds = divmod(time_taken, 60)
            hours, minutes = divmod(minutes, 60)
            self.time_taken_label.configure(
                text=f"Time Taken: {int(hours):01d}:{int(minutes):02d}:{int(seconds):02d}"
            )
            self.update_idletasks()
        else:
            # If the thread is not running, log a warning and stop the function
            Logger.WARNING(
                "AnilistMangaUpdater thread is not running. Stopping progress bar update."
            )
            return
        self.after(50, self.update_progress_bar)

    def update_progress_and_status(
            self, status: str, program_progress: Optional[Union[float, None]] = None
    ) -> None:
        """
        Updates the progress and status of the program.

        This method updates the global variables `progress` and `progress_status` that are used to track the progress
        and status of the program. If the `program_progress` parameter is provided and is different from the current
        `progress`, it updates the progress and status labels in the GUI.

        Parameters:
            status (str): The new status of the program. program_progress (float, optional): The new progress
            of the program. If not provided, the current global progress is used.

        Returns:
            None
        """
        # Update the global variables that were updated in the AnilistMangaUpdater.py file
        global progress, progress_status  # pylint: disable=W0603
        if program_progress is None:
            Logger.INFO("No program progress provided. Using global progress.")
            program_progress = progress
        if program_progress != progress:
            # If progress is different update objects associated with it
            Logger.INFO(
                "AnilistMangaUpdater progress is different from global progress. Updating progress and status."
            )
            progress = program_progress
            progress_status = status
            self.percent_label.configure(text=f"{round((progress * 100), 1)}%")
            self.progress_bar_tooltip.configure(
                message=f"{str(round((progress * 100), 1))}%"
            )
            Logger.INFO(f"Updated progress to: {progress} and status to: {status}")

    def update_terminal(self, text: str) -> None:
        """
        Updates the terminal in the GUI with the provided text.

        This method first checks if the scrollbar is at the bottom of the terminal. If it is, the method will
        automatically scroll to the end after inserting the text. The terminal is temporarily enabled for the insertion
        of the text and then disabled again to prevent manual edits.

        Parameters:
            text (str): The text to be inserted into the terminal.

        Returns:
            None
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

    def browse_file(
        self,
        entry_widget: Union[tkinter.Entry, customtkinter.CTkEntry],
        is_previous: bool,
    ) -> None:
        """
        Opens a file dialog for the user to select a file, and updates the entry widget with the selected file path.

        This method prompts the user to select a file through a file dialog. The selected file path is then inserted
        into the provided entry widget and stored in the appropriate variable. If the user cancels the file dialog,
        the text of the entry widget is restored to its previous state.

        Parameters:
            entry_widget (Union[tkinter.Entry, customtkinter.CTkEntry]): The entry widget to be updated with
            the selected file path.
            is_previous (bool): A flag indicating whether the selected file is a previous Kenmei
            export file. If True, the selected file path is stored in the 'previous_file_path' variable. If False,
            it is stored in the 'file_path' variable.

        Returns:
            None
        """
        # Store the current text of the entry widget
        current_text = entry_widget.get()
        Logger.INFO(f"Current text in the entry widget: {current_text}")

        # Open a file dialog and get the selected file path
        file_path = filedialog.askopenfilename()
        Logger.INFO(f"File path selected by the user: {file_path}")

        # Enable the entry widget and clear its current text
        entry_widget.configure(state="normal")
        entry_widget.delete(0, "end")

        # If the user cancels the file dialog, restore the text of the entry widget
        if file_path == "":
            Logger.WARNING("User cancelled the file dialog.")
            if current_text == "":
                # If the entry widget was empty, insert the placeholder text
                if entry_widget == self.previous_file_path_textbox:
                    entry_widget.insert(0, "Previous Kenmei Export File Path")
                else:
                    entry_widget.insert(0, "Kenmei Export File Path")
                Logger.INFO("Entry widget was empty. Inserted placeholder text.")
            else:
                # If the entry widget had text, restore it
                entry_widget.insert(0, current_text)
                Logger.INFO("Restored the text in the entry widget.")
        else:
            # If the user selected a file, insert the file path into the entry widget
            entry_widget.insert(0, file_path)
            Logger.INFO("Inserted the selected file path into the entry widget.")
            # And store the file path in the appropriate variable
            if is_previous:
                self.previous_file_path = file_path
                Logger.INFO(
                    "Stored the selected file path in the previous_file_path variable."
                )
            else:
                self.file_path = file_path
                Logger.INFO("Stored the selected file path in the file_path variable.")

        # Disable the entry widget
        entry_widget.configure(state="disabled")
        Logger.INFO("Disabled the entry widget.")

    def open_input_dialog_event(self) -> None:
        """
        Opens input dialogs for the client ID and secret ID.

        This method prompts the user to input the client ID and secret ID through input dialogs. If the user cancels
        either dialog, a cancellation message is updated in the terminal. If the user enters both IDs,
        a configuration file is created and saved.

        Parameters:
            None

        Returns:
            None
        """
        # Open input dialogs for the client ID and secret ID
        Logger.INFO("Opening input dialog for the Client ID.")
        client_id = customtkinter.CTkInputDialog(
            text="Type in the Client ID:", title="Client ID"
        )
        client_id_value = client_id.get_input()
        Logger.INFO(f"Client ID input: {client_id_value}")

        Logger.INFO("Opening input dialog for the Secret ID.")
        secret_id = customtkinter.CTkInputDialog(
            text="Type in the Secret ID:", title="Secret ID"
        )
        secret_id_value = secret_id.get_input()
        Logger.INFO(f"Secret ID input: {secret_id_value}")

        # If the user cancels either dialog, update the terminal with a cancellation message
        if client_id_value is None or secret_id_value is None:
            Logger.WARNING("User cancelled the input dialog.")
            self.update_terminal("Canceled")
        else:
            # If the user enters both IDs, create a configuration file and save it
            Logger.INFO(
                "User entered both IDs. Creating and saving configuration file."
            )
            config = create_config(client_id_value, secret_id_value)
            self.update_terminal("Configuration file created and saved.")
            save_config(config, config_path)
            Logger.INFO("Configuration file saved.")

    def open_token_dialog_event(self) -> None:
        """
        Opens an input dialog for the user to enter the access token.

        This method prompts the user to input the access token through an input dialog. If the user cancels the dialog,
        an error message is displayed and the terminal is updated with a cancellation message. If the user enters the
        access token, the method loads the configuration file, adds the access token to it, and saves the updated
        configuration file. If the thread for obtaining the access token is running, it is stopped.

        Parameters:
            None

        Returns:
            None

        Raises:
            TypeError: If the user cancels the input dialog.
        """
        # Open an input dialog for the access token
        Logger.INFO("Opening input dialog for the Access Token.")
        token = customtkinter.CTkInputDialog(
            text="Type in the Access Token:", title="Access Token"
        )
        token_value = token.get_input()
        Logger.INFO(f"Access Token input: {token_value}")

        try:
            # Load the configuration file and add the access token
            Logger.INFO("Loading configuration file.")
            config = load_config(config_path)
            Logger.INFO("Adding Access Token to configuration file.")
            if config is not None and isinstance(config, dict):
                config["ACCESS_TOKEN"] = token_value
            Logger.INFO("Saving configuration file.")
            save_config(config, config_path)
            Logger.INFO("Configuration file saved.")
            self.update_terminal("Access Token set.")
            Logger.INFO("Access Token set.")
            Set_Access_Token(app)
            Logger.INFO("Set Access Token in app.")
            if self.thread1 is not None:
                self.thread1.stop_thread()
            Logger.INFO("Stopped thread1.")
        except TypeError:
            # If the user cancels the dialog, show an error message
            Logger.WARNING("User cancelled the input dialog.")
            messagebox.showerror("Error", "Canceled")
            self.update_terminal("Canceled")
            Logger.INFO("Updated terminal with cancellation message.")
            if self.thread1 is not None:
                self.thread1.stop_thread()
            Logger.INFO("Stopped thread1.")

    def access_token_button_clicked(self) -> None:
        """
        Handles the event when the access token button is clicked.

        This method is triggered when the user clicks on the access token button. It performs the following steps:\n
        1. Retrieves the current configuration of the application.
        2. Pauses the execution for 2 seconds.
        3. Creates a new thread for obtaining the access token from the Anilist API.
        4. Starts the newly created thread.
        5. Opens an input dialog for the user to enter the access token.
        6. Waits for the access token thread to finish.

        Parameters:
            None

        Returns:
            None
        """
        # Get the configuration
        Logger.INFO("Getting the configuration.")
        Get_Config(app)

        # Pause execution for 2 seconds
        Logger.INFO("Pausing execution for 2 seconds.")
        time.sleep(2)

        # Create a new thread for getting the access token
        Logger.INFO("Creating a new thread for getting the access token.")
        self.thread1 = AccessTokenThread()

        # Start the access token thread
        Logger.INFO("Starting the access token thread.")
        self.thread1.start()

        # Open the token dialog
        Logger.INFO("Opening the token dialog.")
        self.open_token_dialog_event()

        # Wait for the access token thread to finish
        Logger.INFO("Waiting for the access token thread to finish.")
        self.thread1.join()
        Logger.INFO("Access token thread finished.")

    def month_button_clicked(self) -> None:
        """
        Handles the event when the month button is clicked.

        This method is triggered when the user clicks on the month button. It performs the following steps:\n
        1. Opens an input dialog for the user to enter the number of months.
        2. If the user input is a digit, it loads the configuration, updates the number of months in the
            configuration, and saves it.
        3. If the configuration is not found, it displays an error message and updates the terminal.
        4. If the user input is not a digit, it displays an error message and updates the terminal.

        Parameters:
        None

        Returns:
        None
        """
        while True:
            # Open an input dialog for the number of months
            Logger.INFO("Opening input dialog for the number of months.")
            months = customtkinter.CTkInputDialog(
                text="Type in the Number of Months:", title="Months"
            )
            months_value = months.get_input()
            Logger.INFO(f"Number of months input: {months_value}")

            # If the user input is a digit
            if months_value.isdigit():
                # Load the configuration
                Logger.INFO("Loading configuration.")
                config = load_config(config_path)
                if config is not None:
                    # Update the number of months in the configuration and save it
                    Logger.INFO(
                        "Updating number of months in configuration and saving it."
                    )
                    config["MONTHS"] = months_value
                    save_config(config, config_path)
                    Logger.INFO("Configuration saved.")
                    break

                # If the configuration is not found, show an error message
                Logger.ERROR("No configuration file found. Showing error message.")
                messagebox.showerror(
                    "Error",
                    "No config file found. Please set the API values first.",
                )
                self.update_terminal(
                    "No config file found. Please set the API values first."
                )
                Logger.INFO("Updated terminal with error message.")
                break
            # If the user input is not a digit, show an error message
            Logger.WARNING("User input is not a digit. Showing error message.")
            messagebox.showerror("Error", "Canceled")
            self.update_terminal("Canceled")
            Logger.INFO("Updated terminal with cancellation message.")

    def start_button_clicked(self) -> None:
        """
        Handles the event when the start button is clicked.

        This method is triggered when the user clicks on the start button. It performs the following steps:\n
            1. Checks if the program thread is already running. If it is, it returns immediately.
            2. If the program thread is not running, it imports the AnilistMangaUpdater class.
            3. Creates a new thread for the program.
            4. Starts the newly created thread.
            5. Sets the start time to the current time.
            6. Updates the time taken label.
            7. Updates the progress bar.
            8. Resets the progress to 0.

        Parameters:
            None

        Returns:
            None
        """
        global progress  # pylint: disable=W0603
        global program_thread  # pylint: disable=W0601

        # Check if the thread is already running
        Logger.INFO("Checking if the program thread is already running.")
        if program_thread is not None and program_thread.is_alive():
            Logger.WARNING(
                "AnilistMangaUpdater thread is already running. Returning immediately."
            )
            return

        # Import the AnilistMangaUpdater class
        Logger.INFO("Importing the AnilistMangaUpdater class.")
        from Main.Program import Program  # pylint: disable=C0415, E0611

        # Create a new thread for the program
        Logger.INFO("Creating a new thread for the program.")
        program_thread = threading.Thread(target=Program, args=(self,))

        # Start the program thread
        Logger.INFO("Starting the program thread.")
        program_thread.start()

        Logger.INFO("Setting the start time to the current time.")
        self.start_time = time.time()

        Logger.INFO("Updating the time taken label.")
        self.time_taken_label.configure(text="Time Taken: 0:00:00")

        Logger.INFO("Updating the progress bar.")
        self.update_progress_bar()

        Logger.INFO("Resetting the progress to 0.")
        progress = 0

    def private_button_clicked(self) -> None:
        """
        Handles the event when the private button is clicked.

        This method is triggered when the user clicks on the private button. It performs the following steps:\n
        1. Opens an input dialog for the user to enter the private value.
        2. If the user input is "yes" or "no", it loads the configuration, updates the private value in the
            configuration, and saves it.
        3. If the configuration is not found, it displays an error message and updates the terminal.
        4. If the user input is not "yes" or "no", it displays an error message and updates the terminal.
        5. If the user cancels the dialog, it displays an error message and updates the terminal.

        Parameters:
            None

        Returns:
            None
        """
        while True:
            # Open an input dialog for the private value
            Logger.INFO("Opening input dialog for the private value.")
            private = customtkinter.CTkInputDialog(
                text="Type in the Private Value (Yes/No):", title="Private"
            )
            private_value = private.get_input()
            Logger.INFO(f"Private value input: {private_value}")

            try:
                # If the user input is "yes" or "no"
                if private_value.lower() in ["yes", "no"]:
                    # Load the configuration
                    Logger.INFO("Loading configuration.")
                    config = load_config(config_path)
                    if config is not None:
                        # Update the private value in the configuration and save it
                        Logger.INFO(
                            "Updating private value in configuration and saving it."
                        )
                        config["PRIVATE"] = private_value
                        save_config(config, config_path)
                        Logger.INFO("Configuration saved.")
                        break
                    # If the configuration is not found, show an error message
                    Logger.ERROR("No configuration file found. Showing error message.")
                    messagebox.showerror(
                        "Error",
                        "No config file found. Please set the API values first.",
                    )
                    self.update_terminal(
                        "No config file found. Please set the API values first."
                    )
                    Logger.INFO("Updated terminal with error message.")
                    break
                # If the user input is not "yes" or "no", show an error message
                Logger.WARNING(
                    "User input is not 'yes' or 'no'. Showing error message."
                )
                messagebox.showerror("Error", "Invalid input. Please enter Yes or No.")
                self.update_terminal("Invalid input. Please enter Yes or No.")
                Logger.INFO("Updated terminal with error message.")
            except AttributeError:
                # If the user cancels the dialog, show an error message
                Logger.WARNING(
                    "User cancelled the input dialog. Showing error message."
                )
                messagebox.showerror("Error", "Canceled")
                self.update_terminal("Canceled")
                Logger.INFO("Updated terminal with cancellation message.")


if __name__ == "__main__":
    # Log the start of the application
    Logger.INFO("Starting the application.")

    # Create an instance of the App class
    Logger.INFO("Creating an instance of the App class.")
    app = App()

    # Start the main loop
    Logger.INFO("Starting the main loop.")
    app.mainloop()

    # Log the end of the application
    Logger.INFO("Application ended.")
