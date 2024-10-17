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
    original_title = simpledialog.askstring("Add Alternative Title", "Enter the original title:")
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

    This function changes the UI scaling based on the user's selection.
    It adjusts the scaling factor and updates the GUI accordingly.

    Parameters:
        new_scaling (str): The new scaling factor selected by the user.

    Returns:
        None
    """
    scaling_factor = int(new_scaling.replace("%", "")) / 100
    Logger.INFO(f"Changing UI scaling to: {new_scaling}")
    customtkinter.set_widget_scaling(scaling_factor)
    Logger.INFO("UI scaling changed successfully.")


class SidebarFrame(customtkinter.CTkFrame):
    def __init__(self, parent: "App", *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        self.parent = parent
        self.configure(width=140, corner_radius=0)
        self.grid(row=0, column=0, rowspan=12, sticky="nsew")
        self.grid_rowconfigure(7, weight=1)
        Logger.DEBUG("Created sidebar frame for the window.")

        # Load the application logo
        logo = customtkinter.CTkImage(light_image=Image.open(image1dir), size=(100, 100))
        self.logo_label = customtkinter.CTkLabel(
            self, image=logo, text=""
        )  # display image with a CTkLabel
        self.logo_label.grid(row=0, column=0, padx=20, pady=(10, 10))

        # Add the application title to the sidebar
        self.title_label = customtkinter.CTkLabel(
            self,
            text="Anilist Manga\nUpdater",
            font=customtkinter.CTkFont(size=22, weight="bold"),
        )
        self.title_label.grid(row=1, column=0, padx=20, pady=(0, 10))

        # Add buttons to the sidebar for various actions
        self.start_button = customtkinter.CTkButton(
            self,
            command=self.parent.start_button_clicked,
            text="Start",
            font=customtkinter.CTkFont(size=18),
        )
        self.start_button.grid(row=2, column=0, padx=20, pady=5)

        self.access_token_button = customtkinter.CTkButton(
            self,
            command=self.parent.access_token_button_clicked,
            text="Get Access Token",
        )
        self.access_token_button.grid(row=3, column=0, padx=20, pady=5)

        self.settings_button = customtkinter.CTkButton(
            self,
            command=self.parent.open_settings_popup,
            text="Settings",
        )
        self.settings_button.grid(row=4, column=0, padx=20, pady=5)

        self.alt_titles_button = customtkinter.CTkButton(
            self,
            command=self.parent.manage_alternative_titles,
            text="Manage Alt Titles",
        )
        self.alt_titles_button.grid(row=5, column=0, padx=20, pady=5)

        # Create a label and option menu for the appearance mode
        self.appearance_mode_label = customtkinter.CTkLabel(
            self, text="Appearance Mode:", anchor="w"
        )
        self.appearance_mode_label.grid(row=8, column=0, padx=20, pady=(10, 0))

        self.appearance_mode_optionemenu = customtkinter.CTkOptionMenu(
            self,
            values=["Light", "Dark", "System"],
            command=change_appearance_mode_event,
        )
        self.appearance_mode_optionemenu.grid(row=9, column=0, padx=20, pady=(10, 0))

        # Create a label and option menu for the UI scaling
        self.scaling_label = customtkinter.CTkLabel(self, text="UI Scaling:", anchor="w")
        self.scaling_label.grid(row=10, column=0, padx=20, pady=(5, 0))

        self.scaling_optionemenu = customtkinter.CTkOptionMenu(
            self,
            values=["80%", "90%", "100%", "110%", "120%"],
            command=change_scaling_event,
        )
        self.scaling_optionemenu.grid(row=11, column=0, padx=20, pady=(10, 15))

        # Create an exit button
        self.exit_button = customtkinter.CTkButton(self, command=self.parent.on_close, text="Exit")
        self.exit_button.grid(row=12, column=0, padx=20, pady=(5, 15))

        # Set default values for the appearance mode and UI scaling
        self.appearance_mode_optionemenu.set("Dark")
        self.scaling_optionemenu.set("100%")

        # Create tooltips for the buttons and option menus
        CTkToolTip.CTkToolTip(
            self.start_button,
            (
                "Starts the program.\n"
                "The only way to stop this is to exit the AnilistMangaUpdater with the exit button."
            ),
        )
        CTkToolTip.CTkToolTip(
            self.access_token_button,
            "Opens a dialog to get the access token.\nThis may need to be refreshed in the future.",
        )
        CTkToolTip.CTkToolTip(
            self.settings_button,
            "Open settings to configure API values, access token, months, and privacy settings.",
        )
        CTkToolTip.CTkToolTip(
            self.alt_titles_button,
            "Manage alternative titles for your manga.",
        )
        CTkToolTip.CTkToolTip(
            self.appearance_mode_optionemenu,
            "Changes the appearance mode of the application.",
        )
        CTkToolTip.CTkToolTip(
            self.scaling_optionemenu,
            "Changes the UI scaling of the application.\n"
            "You may need to resize window to fit the new scaling.",
        )
        CTkToolTip.CTkToolTip(
            self.exit_button,
            (
                "Exits the application.\n"
                "Please use this to exit program.\n"
                "It is possible that the application will still run if you just "
                "close the window rather than use this button."
            ),
        )


class TerminalFrame(customtkinter.CTkFrame):
    def __init__(self, parent: "App", *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        self.configure(fg_color="transparent")
        self.parent = parent
        self.grid(
            row=0, column=1, columnspan=3, rowspan=3, padx=(20, 20), pady=(20, 0), sticky="nsew"
        )
        Logger.DEBUG("Created terminal frame for the window.")

        # Create a terminal textbox
        self.terminal = customtkinter.CTkTextbox(self, width=250, wrap="word")
        self.terminal.grid(row=0, column=0, sticky="nsew")
        Logger.INFO("Created terminal textbox in TerminalFrame.")

        # Configure grid
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

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


class StatusFrame(customtkinter.CTkFrame):
    def __init__(self, parent: "App", *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        self.configure(fg_color="transparent")
        self.parent = parent
        self.configure(height=100, corner_radius=0)
        self.grid(row=6, column=1, columnspan=3, padx=20, pady=(5, 5), sticky="nsew")
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure((0, 1, 2), weight=1)
        Logger.DEBUG("Created status frame for the window.")

        # Create estimated time remaining label
        self.estimated_time_label = customtkinter.CTkLabel(
            self, text="Estimated Time Remaining: NaN", anchor="w"
        )
        self.estimated_time_label.grid(row=0, column=0, padx=(0, 10), pady=(0, 5), sticky="w")
        Logger.INFO("Created 'Estimated Time Remaining' label.")

        # Create time taken label
        self.time_taken_label = customtkinter.CTkLabel(self, text="Time Taken: 0:00:00", anchor="e")
        self.time_taken_label.grid(row=0, column=3, padx=(10, 0), pady=(0, 5), sticky="e")
        Logger.INFO("Created 'Time Taken' label.")

        # Create a progress bar
        self.progress_bar = customtkinter.CTkProgressBar(self, width=200, height=20)
        self.progress_bar.grid(row=1, column=0, columnspan=4, sticky="ew")
        self.progress_bar.set(0)
        Logger.INFO("Created progress bar.")

        # Create a percent label under the progress bar
        self.percent_label = customtkinter.CTkLabel(self, text="0%", anchor="center")
        self.percent_label.grid(row=2, column=0, columnspan=4, sticky="ew")
        Logger.INFO("Created percent label under the progress bar.")

        # Create a status label under the progress bar
        self.status_label = customtkinter.CTkLabel(
            self,
            text=(
                f"Status: {progress_status[:37]}..."
                if len(progress_status) > 40
                else progress_status
            ),
            anchor="center",
        )
        self.status_label.grid(row=3, column=0, columnspan=4, sticky="ew")
        Logger.INFO("Created status label under the progress bar.")

        # Create tooltips for the progress bar and status label
        self.progress_bar_tooltip = CTkToolTip.CTkToolTip(
            self.progress_bar, f"{round((progress * 100), 1)}%"
        )
        CTkToolTip.CTkToolTip(
            self.status_label,
            "Displays the current status of the program.",
        )

    def update_progress(self, progress_value: float) -> None:
        """
        Updates the progress bar and percent label.

        Parameters:
            progress_value (float): The new progress value between 0 and 1.

        Returns:
            None
        """
        self.progress_bar.set(progress_value)
        self.percent_label.configure(text=f"{round((progress_value * 100), 1)}%")
        self.progress_bar_tooltip.configure(message=f"{str(round((progress_value * 100), 1))}%")
        Logger.INFO(f"Updated progress to: {progress_value * 100}%")

    def update_time_taken(self, time_taken: str) -> None:
        """
        Updates the time taken label.

        Parameters:
            time_taken (str): The time taken to display.

        Returns:
            None
        """
        self.time_taken_label.configure(text=f"Time Taken: {time_taken}")
        Logger.INFO(f"Updated time taken to: {time_taken}")

    def update_estimated_time_remaining(self, time_remaining: str) -> None:
        """
        Updates the estimated time remaining label.

        Parameters:
            time_remaining (str): The estimated time remaining to display.

        Returns:
            None
        """
        self.estimated_time_label.configure(text=f"Estimated Time Remaining: {time_remaining}")
        Logger.INFO(f"Updated estimated time remaining to: {time_remaining}")

    def update_status(self, status: str) -> None:
        """
        Updates the status label.

        Parameters:
            status (str): The new status to display.

        Returns:
            None
        """
        display_status = f"Status: {status[:37]}..." if len(status) > 40 else f"Status: {status}"
        self.status_label.configure(text=display_status)
        Logger.INFO(f"Updated status to: {display_status}")


class BrowseFrame(customtkinter.CTkFrame):
    """
    A class representing the Browse Frame which includes entry fields and browse buttons for file paths.
    """

    def __init__(self, parent: "App", *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        self.parent = parent
        self.configure(fg_color="transparent")
        self.grid(row=7, column=1, columnspan=3, padx=20, pady=(5, 5), sticky="nsew")
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure((0, 1, 2), weight=1)
        Logger.DEBUG("Created browse frame for the window.")

        # Create an entry field and browse button for the previous Kenmei export file path
        self.previous_file_path_textbox = customtkinter.CTkEntry(
            self, placeholder_text="Previous Kenmei Export File Path"
        )
        self.previous_file_path_textbox.grid(
            row=0, column=0, columnspan=3, pady=(15, 15), sticky="nsew"
        )
        Logger.INFO("Created entry field for the previous Kenmei export file path.")

        self.previous_browse_button = customtkinter.CTkButton(
            master=self,
            fg_color="transparent",
            border_width=2,
            text_color=("gray10", "#DCE4EE"),
            text="Browse",
            command=lambda: self.parent.browse_file(self.previous_file_path_textbox, True),
        )
        self.previous_browse_button.grid(
            row=0, column=3, padx=(20, 20), pady=(15, 15), sticky="nsew"
        )
        Logger.INFO("Created browse button for the previous Kenmei export file path.")

        # Create an entry field and browse button for the Kenmei export file path
        self.file_path_textbox = customtkinter.CTkEntry(
            self, placeholder_text="Kenmei Export File Path"
        )
        self.file_path_textbox.grid(row=1, column=0, columnspan=3, pady=(5, 15), sticky="nsew")
        Logger.INFO("Created entry field for the Kenmei export file path.")

        self.browse_button = customtkinter.CTkButton(
            master=self,
            fg_color="transparent",
            border_width=2,
            text_color=("gray10", "#DCE4EE"),
            text="Browse",
            command=lambda: self.parent.browse_file(self.file_path_textbox, False),
        )
        self.browse_button.grid(row=1, column=3, padx=(20, 20), pady=(5, 15), sticky="nsew")
        Logger.INFO("Created browse button for the Kenmei export file path.")

        # Disable file path textboxes initially
        self.previous_file_path_textbox.configure(state="disabled")
        Logger.INFO("Disabled previous file path textbox.")
        self.file_path_textbox.configure(state="disabled")
        Logger.INFO("Disabled file path textbox.")


class SettingsPopup(customtkinter.CTkToplevel):
    def __init__(self, parent: "App"):
        super().__init__(parent)
        self.title("Settings")
        self.geometry("400x400")
        self.parent = parent

        Logger.INFO("Initialized Settings popup.")

        # Configure grid
        self.grid_columnconfigure(1, weight=1)

        # API Client ID
        self.client_id_label = customtkinter.CTkLabel(self, text="Client ID:")
        self.client_id_label.grid(row=0, column=0, padx=10, pady=(10, 5), sticky="w")
        self.client_id_entry = customtkinter.CTkEntry(self, placeholder_text="Enter Client ID")
        self.client_id_entry.grid(row=0, column=1, padx=10, pady=(10, 5), sticky="ew")

        # API Secret ID
        self.secret_id_label = customtkinter.CTkLabel(self, text="Secret ID:")
        self.secret_id_label.grid(row=1, column=0, padx=10, pady=5, sticky="w")
        self.secret_id_entry = customtkinter.CTkEntry(self, placeholder_text="Enter Secret ID")
        self.secret_id_entry.grid(row=1, column=1, padx=10, pady=5, sticky="ew")

        # Number of Months
        self.months_label = customtkinter.CTkLabel(self, text="Number of Months:")
        self.months_label.grid(row=2, column=0, padx=10, pady=5, sticky="w")
        self.months_entry = customtkinter.CTkEntry(self, placeholder_text="Enter Number of Months")
        self.months_entry.grid(row=2, column=1, padx=10, pady=5, sticky="ew")

        # Private Value
        self.private_label = customtkinter.CTkLabel(self, text="Private Value (Yes/No):")
        self.private_label.grid(row=3, column=0, padx=10, pady=5, sticky="w")
        self.private_entry = customtkinter.CTkEntry(self, placeholder_text="Enter Yes or No")
        self.private_entry.grid(row=3, column=1, padx=10, pady=5, sticky="ew")

        # Save Button
        self.save_button = customtkinter.CTkButton(self, text="Save", command=self.save_settings)
        self.save_button.grid(row=4, column=0, columnspan=2, padx=10, pady=20)

        # Populate fields with existing config if available
        self.load_existing_settings()

    def load_existing_settings(self):
        config = load_config(config_path)
        if config:
            self.client_id_entry.insert(0, config.get("ANILIST_CLIENT_ID", ""))
            self.secret_id_entry.insert(0, config.get("ANILIST_CLIENT_SECRET", ""))
            self.months_entry.insert(0, config.get("MONTHS", ""))
            self.private_entry.insert(0, config.get("PRIVATE", ""))
            Logger.INFO("Loaded existing settings into Settings popup.")

    def save_settings(self):
        config = load_config(config_path)
        client_id = self.client_id_entry.get()
        secret_id = self.secret_id_entry.get()
        access_token = config.get("ACCESS_TOKEN", "") if config else ""
        months = self.months_entry.get()
        private = self.private_entry.get()

        # Validate inputs
        if not client_id or not secret_id:
            messagebox.showerror("Error", "Client ID and Secret ID cannot be empty.")
            Logger.ERROR("Client ID or Secret ID is empty.")
            return

        if private.lower() not in ["yes", "no"]:
            messagebox.showerror("Error", "Private Value must be 'Yes' or 'No'.")
            Logger.ERROR("Invalid Private Value input.")
            return

        if months and not months.isdigit():
            messagebox.showerror("Error", "Number of Months must be a number.")
            Logger.ERROR("Number of Months is not a digit.")
            return

        # Create or update config
        config = create_config(client_id, secret_id)
        config["ACCESS_TOKEN"] = access_token
        if months:
            config["MONTHS"] = months
        config["PRIVATE"] = private

        save_config(config, config_path)
        Logger.INFO("Settings saved to configuration file.")

        # Update terminal
        self.parent.terminal_frame.update_terminal("Settings have been saved.")
        Logger.INFO("Updated terminal with settings saved message.")

        # Update Access Token in app
        Set_Access_Token(self.parent)
        Logger.INFO("Set Access Token in app after saving settings.")

        self.destroy()
        Logger.INFO("Closed Settings popup.")


class App(customtkinter.CTk):  # pylint: disable=C0115, R0902
    def __init__(self) -> None:  # pylint: disable=R0915
        super().__init__()

        global program_thread  # pylint: disable=W0601
        program_thread = None
        self.after_id = None
        self.start_time: float = 0
        self.thread1: Union[AccessTokenThread, None] = None
        self.estimated_time_remaining: float = 0
        Logger.DEBUG("Initialized GUI.")

        # Initialize SidebarFrame
        self.sidebar_frame = SidebarFrame(self)
        Logger.DEBUG("Initialized SidebarFrame.")

        # Initialize TerminalFrame
        self.terminal_frame = TerminalFrame(self)
        Logger.DEBUG("Initialized TerminalFrame.")

        # Initialize StatusFrame
        self.status_frame = StatusFrame(self)
        Logger.DEBUG("Initialized StatusFrame.")

        # Initialize BrowseFrame
        self.browse_frame = BrowseFrame(self)
        Logger.DEBUG("Initialized BrowseFrame.")

        # Set the window title and size
        self.title("Anilist Manga Updater")
        self.geometry(f"{1100}x{700}")
        Logger.INFO("Set window title and size.")

        # Configure the grid layout for the window
        self.grid_columnconfigure(1, weight=1)
        self.grid_columnconfigure((2, 3), weight=0)
        self.grid_rowconfigure((0, 1, 2), weight=1)
        Logger.DEBUG("Configured grid layout for the window.")

        # Add a welcome message to the terminal
        self.terminal_frame.terminal.configure(state="normal")
        self.terminal_frame.terminal.insert(
            "end",
            "Welcome to Anilist Manga Updater!\n\n"
            "Please make sure to set all values with the buttons on the left side.\n\n",
        )
        Logger.INFO("Added welcome message to the terminal.")
        self.terminal_frame.terminal.configure(state="disabled")
        Logger.INFO("Disabled terminal.")

        # Set the protocol for the window close button to call the on_close function
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        Logger.INFO("Set window close button protocol to call 'on_close' function.")

        # Initialize the file path variables
        self.file_path = ""
        Logger.INFO("Initialized 'file_path' variable.")
        self.previous_file_path = ""
        Logger.INFO("Initialized 'previous_file_path' variable.")

    def browse_file(self, textbox: customtkinter.CTkEntry, is_previous: bool) -> None:
        """
        Opens a file dialog for the user to select a file and updates the corresponding textbox.

        Parameters:
            textbox (customtkinter.CTkEntry): The textbox to update with the selected file path.
            is_previous (bool): Flag to indicate if this is for the previous file path.

        Returns:
            None
        """
        file_path = filedialog.askopenfilename()
        if file_path:
            textbox.configure(state="normal")
            textbox.delete(0, "end")
            textbox.insert(0, file_path)
            textbox.configure(state="disabled")
            if is_previous:
                self.previous_file_path = file_path
                Logger.INFO(f"Set previous file path to: {file_path}")
            else:
                self.file_path = file_path
                Logger.INFO(f"Set file path to: {file_path}")

    def on_close(self) -> None:
        """
        Handles the window close event.

        Ensures that all threads are properly stopped before closing the application.

        Returns:
            None
        """
        Logger.INFO("Closing application.")
        if program_thread and program_thread.is_alive():
            Logger.INFO("Stopping program thread before closing.")
            program_thread.join()
        self.destroy()
        Logger.INFO("Application closed.")

    def start_button_clicked(self) -> None:
        """
        Handles the event when the start button is clicked.

        This method is triggered when the user clicks on the start button. It performs the following steps:

            1. Checks if the program thread is already running. If it is, it returns immediately.
            2. If the program thread is not running, it imports the AnilistMangaUpdater class.
            3. Creates a new thread for the program.
            4. Starts the newly created thread.
            5. Sets the start time to the current time.
            6. Updates the time taken label.
            7. Updates the progress bar.
            8. Resets the progress to 0.

        Returns:
            None
        """
        global progress  # pylint: disable=W0603
        global program_thread  # pylint: disable=W0601

        # Check if the thread is already running
        Logger.INFO("Checking if the program thread is already running.")
        if program_thread is not None and program_thread.is_alive():
            Logger.WARNING("AnilistMangaUpdater thread is already running. Returning immediately.")
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
        self.status_frame.update_time_taken("0:00:00")

        Logger.INFO("Updating the progress bar.")
        self.status_frame.update_progress(0)

        Logger.INFO("Resetting the progress to 0.")
        progress = 0

    def access_token_button_clicked(self) -> None:
        """
        Handles the event when the access token button is clicked.

        This method is triggered when the user clicks on the access token button. It performs the following steps:

            1. Retrieves the current configuration of the application.
            2. Pauses the execution for 2 seconds.
            3. Creates a new thread for obtaining the access token from the Anilist API.
            4. Starts the newly created thread.
            5. Opens an input dialog for the user to enter the access token.
            6. Waits for the access token thread to finish.

        Returns:
            None
        """
        # Get the configuration
        Logger.INFO("Getting the configuration.")
        Get_Config(self)

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

    def open_token_dialog_event(self) -> None:
        """
        Opens the token dialog event.

        This method should implement the dialog to input the access token.

        Returns:
            None
        """
        # Implementation of token dialog can be added here
        pass

    def update_terminal(self, text: str) -> None:
        """
        Updates the terminal in the GUI with the provided text.

        This method calls the update_terminal method of the TerminalFrame.

        Parameters:
            text (str): The text to be inserted into the terminal.

        Returns:
            None
        """
        self.terminal_frame.update_terminal(text)

    def open_settings_popup(self) -> None:
        """
        Opens the settings popup window where users can configure API values, access token, months, and privacy settings.

        Returns:
            None
        """
        Logger.INFO("Opening Settings popup.")
        SettingsPopup(self)

    def manage_alternative_titles(self) -> None:
        """
        Manages alternative titles in the application.

        This method allows the user to add, edit, or delete alternative titles. The user interacts with the method
        through a series of dialog boxes and terminal prompts. The method retrieves the current alternative titles
        from a file, prompts the user to select an action (add, edit, or delete), and performs the selected action.

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
                Logger.WARNING("No original title selected. Exiting manage alternative titles.")
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

    def update_progress_and_status(
        self, status: str, program_progress: Optional[Union[float, None]] = None
    ) -> None:
        """
        Updates the progress and status of the program.

        This method updates the global variables `progress` and `progress_status` that are used to track the progress
        and status of the program. If the `program_progress` parameter is provided and is different from the current
        `progress`, it updates the progress and status labels in the GUI.

        Parameters:
            status (str): The new status of the program.
            program_progress (float, optional): The new progress
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
            self.status_frame.update_progress(progress)
            self.status_frame.update_status(progress_status)
            Logger.INFO(f"Updated progress to: {progress} and status to: {status}")

    def update_estimated_time_remaining(
        self, new_estimated_time_remaining: Optional[float] = None, add_time: Optional[float] = None
    ) -> None:
        """
        Updates the estimated time remaining label in the GUI.

        This method converts the estimated time remaining from seconds to a time format (hours, minutes,
        and seconds), updates the time remaining label, and schedules itself to be called again after 1 second if
        there is still time remaining.

        If the estimated time remaining is less than 0, it is set to 0. If there is still time remaining,
        and the function is already scheduled, the scheduled function is cancelled. Then, this function is scheduled
        to be called again after 1 second.

        Parameters:
            new_estimated_time_remaining (float, optional): The new estimated time remaining in seconds. Defaults to None.
            add_time (float, optional): The time to add to the estimated time remaining in seconds. Defaults to None.

        Returns:
            None
        """
        if not hasattr(self, "estimated_time_remaining"):
            self.estimated_time_remaining = 0

        if new_estimated_time_remaining is not None:
            self.estimated_time_remaining = new_estimated_time_remaining

        if add_time is not None:
            self.estimated_time_remaining += add_time

        # If estimated_time_remaining is less than 0, set it to 0
        self.estimated_time_remaining = max(self.estimated_time_remaining, 0)

        # Convert the estimated time remaining to hours, minutes, and seconds
        time_remaining = str(datetime.timedelta(seconds=int(self.estimated_time_remaining)))

        # Update the time remaining label
        self.status_frame.update_estimated_time_remaining(time_remaining)

        # If there is still time remaining
        if self.estimated_time_remaining > 0:
            # If the function is already scheduled, cancel it
            if self.after_id is not None:
                self.after_cancel(self.after_id)

            # Schedule this function to be called again after 1 second and store the ID
            self.after_id = self.after(
                1000, self.update_estimated_time_remaining, self.estimated_time_remaining - 1
            )

    def update_time_taken(self, time_taken: str) -> None:
        """
        Updates the time taken in the status frame.

        Parameters:
            time_taken (str): The time taken to display.

        Returns:
            None
        """
        self.status_frame.update_time_taken(time_taken)
        Logger.INFO(f"Updated time taken to: {time_taken}")


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
