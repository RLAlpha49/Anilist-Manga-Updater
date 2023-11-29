# Import necessary modules
import tkinter as tk
from tkinter import messagebox, filedialog, simpledialog
import customtkinter
import CTkToolTip
import os
import sys
import threading
import time
import platform
from PIL import Image
# Import custom functions
from Config import create_config, save_config, Get_Config, load_config
from WriteToFile import Save_Alt_Titles_To_File, Get_Alt_Titles_From_File
from GetFromFile import alternative_titles_dict
from GetAccessToken import Get_Access_Token
from AccessAPI import Set_Access_Token

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
config_path = 'config.json'

# Define the base path and image directory for the application
base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
image_directory = os.path.join(base_path, "Resources")
image1dir = os.path.join(image_directory, "Anilist-Manga-Updater-Logo2.png")

# Define a class for the access token thread
class AccessTokenThread(threading.Thread):
    def __init__(self):
        # Initialize the thread
        super(AccessTokenThread, self).__init__()
        # Define a stop flag for the thread
        self.stop = False

    def run(self):
        # Run the Get_Access_Token function in the thread
        Get_Access_Token(self, app)

    def stop_thread(self):
        # Set the stop flag to True to stop the thread
        self.stop = True

class App(customtkinter.CTk):
    def __init__(self):
        super().__init__()
        
        global program_thread
        program_thread = None

        # Load the application logo
        logo = customtkinter.CTkImage(light_image=Image.open(image1dir), size=(100,100))
        
        # Set the window title and size
        self.title("Anilist Manga Updater")
        self.geometry(f"{1100}x{700}")

        # Configure the grid layout for the window
        self.grid_columnconfigure(1, weight=1)
        self.grid_columnconfigure((2, 3), weight=0)
        self.grid_rowconfigure((0, 1, 2), weight=1)

        # Create a sidebar frame for the window
        self.sidebar_frame = customtkinter.CTkFrame(self, width=140, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, rowspan=9, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(7, weight=1)
        
        # Add the application logo and title to the sidebar
        self.logo_label = customtkinter.CTkLabel(self.sidebar_frame, image=logo, text="")  # display image with a CTkLabel
        self.logo_label.grid(row=0, column=0, padx=20, pady=(10, 10))
        self.title_label = customtkinter.CTkLabel(self.sidebar_frame, text="Anilist Manga\nUpdater", font=customtkinter.CTkFont(size=22, weight="bold"))
        self.title_label.grid(row=1, column=0, padx=20, pady=(0, 10))
        
        # Add buttons to the sidebar for various actions
        self.start_button = customtkinter.CTkButton(self.sidebar_frame, command=self.start_button_clicked, text="Start", font=customtkinter.CTkFont(size=18))
        self.start_button.grid(row=2, column=0, padx=20, pady=5)
        self.api_button = customtkinter.CTkButton(self.sidebar_frame, command=self.open_input_dialog_event, text="Set API Values")
        self.api_button.grid(row=3, column=0, padx=20, pady=5)
        self.access_token_button = customtkinter.CTkButton(self.sidebar_frame, command=self.access_token_button_clicked, text="Get Access Token")
        self.access_token_button.grid(row=4, column=0, padx=20, pady=5)
        self.month_button = customtkinter.CTkButton(self.sidebar_frame, command=self.month_button_clicked, text="Set Months")
        self.month_button.grid(row=5, column=0, padx=20, pady=5)
        self.private_button = customtkinter.CTkButton(self.sidebar_frame, command=self.private_button_clicked, text="Private Value")
        self.private_button.grid(row=6, column=0, padx=20, pady=5)
        self.alt_titles_button = customtkinter.CTkButton(self.sidebar_frame, command=lambda: self.manage_alternative_titles(), text="Manage Alt Titles")
        self.alt_titles_button.grid(row=7, column=0, padx=20, pady=5)
        
        # Create a label and option menu for the appearance mode
        self.appearance_mode_label = customtkinter.CTkLabel(self.sidebar_frame, text="Appearance Mode:", anchor="w")
        self.appearance_mode_label.grid(row=8, column=0, padx=20, pady=(10, 0))
        self.appearance_mode_optionemenu = customtkinter.CTkOptionMenu(self.sidebar_frame, values=["Light", "Dark", "System"], command=self.change_appearance_mode_event)
        self.appearance_mode_optionemenu.grid(row=9, column=0, padx=20, pady=(10, 0))

        # Create a label and option menu for the UI scaling
        self.scaling_label = customtkinter.CTkLabel(self.sidebar_frame, text="UI Scaling:", anchor="w")
        self.scaling_label.grid(row=10, column=0, padx=20, pady=(5, 0))
        self.scaling_optionemenu = customtkinter.CTkOptionMenu(self.sidebar_frame, values=["80%", "90%", "100%", "110%", "120%"], command=self.change_scaling_event)
        self.scaling_optionemenu.grid(row=11, column=0, padx=20, pady=(10, 15))

        # Create an exit button
        self.exit_button = customtkinter.CTkButton(self.sidebar_frame, command=self.on_close, text="Exit")
        self.exit_button.grid(row=12, column=0, padx=20, pady=(5, 15))

        # Create a terminal textbox
        self.terminal = customtkinter.CTkTextbox(self, width=250)
        self.terminal.grid(row=0, column=1, columnspan=3, rowspan=3, padx=(20, 20), pady=(20, 0), sticky="nsew")
        
        # Create time remaining label
        self.time_remaining_label = customtkinter.CTkLabel(self, text="Estimated Time Remaining: NaN", anchor="w")
        self.time_remaining_label.grid(row=3, column=1, padx=(20, 20), pady=(5, 5), sticky="nsew")
        
        # Create time taken label
        self.time_taken_label = customtkinter.CTkLabel(self, text="Time Taken: 0:00:00", anchor="e")
        self.time_taken_label.grid(row=3, column=3, padx=(20, 20), pady=(5, 5), sticky="nsew")
        
        # Create a progress bar
        self.progress_bar = customtkinter.CTkProgressBar(self, width=200, height=20)
        self.progress_bar.grid(row=4, column=1, columnspan=3, padx=(20, 20), sticky="nsew")
        self.progress_bar.set(0)
        
        # Create a percent label under the progress bar
        self.percent_label = customtkinter.CTkLabel(self, text="0%", anchor="center")
        self.percent_label.grid(row=5, column=1, columnspan=3, padx=(20, 20), sticky="nsew")

        # Create a status label under the progress bar
        self.status_label = customtkinter.CTkLabel(self, text=f"Status: {progress_status}")
        self.status_label.grid(row=6, column=1, columnspan=3, padx=(20, 20), sticky="nsew")

        # Create an entry field and browse button for the previous Kenmei export file path
        self.previous_file_path_textbox = customtkinter.CTkEntry(self, placeholder_text="Previous Kenmei Export File Path")
        self.previous_file_path_textbox.grid(row=7, column=1, columnspan=2, padx=(20, 0), pady=(15, 15), sticky="nsew")
        self.previous_browse_button = customtkinter.CTkButton(master=self, fg_color="transparent", border_width=2, text_color=("gray10", "#DCE4EE"), text="Browse", command=lambda: self.browse_file(self.previous_file_path_textbox, True))
        self.previous_browse_button.grid(row=7, column=3, padx=(20, 20), pady=(15, 15), sticky="nsew")

        # Create an entry field and browse button for the Kenmei export file path
        self.file_path_textbox = customtkinter.CTkEntry(self, placeholder_text="Kenmei Export File Path")
        self.file_path_textbox.grid(row=8, column=1, columnspan=2, padx=(20, 0), pady=(5, 15), sticky="nsew")
        self.browse_button = customtkinter.CTkButton(master=self, fg_color="transparent", border_width=2, text_color=("gray10", "#DCE4EE"), text="Browse", command=lambda: self.browse_file(self.file_path_textbox, False))
        self.browse_button.grid(row=8, column=3, padx=(20, 20), pady=(5, 15), sticky="nsew")

        # Set default values for the appearance mode, UI scaling, and file path textboxes
        self.appearance_mode_optionemenu.set("Dark")
        self.scaling_optionemenu.set("100%")
        self.previous_file_path_textbox.configure(state="disabled")
        self.file_path_textbox.configure(state="disabled")

        # Add a welcome message to the terminal
        self.terminal.insert("end", "Welcome to Anilist Manga Updater!\n\nPlease make sure to set all values with the buttons on the left side.\n\n")
        self.terminal.configure(state="disabled")

        # Set the protocol for the window close button to call the on_close function
        self.protocol("WM_DELETE_WINDOW", self.on_close)

        # Initialize the file path variables
        self.file_path = ""
        self.previous_file_path = ""

        # Create tooltips for the buttons and option menus
        self.start_button_tooltip = CTkToolTip.CTkToolTip(self.start_button, "Starts the program.\nThe only way to stop this is to exit the Program with the exit button.")
        self.api_button_tooltip = CTkToolTip.CTkToolTip(self.api_button, "Opens a dialog to set the API values.\nThis is for the API's Client and Secret ID's")
        self.access_token_button_tooltip = CTkToolTip.CTkToolTip(self.access_token_button, "Opens a dialog to get the access token.\nThis may need to be refreshed in the future.")
        self.month_button_tooltip = CTkToolTip.CTkToolTip(self.month_button, "Opens a dialog to set the number of months.\nThis checks when the last time you read a chapter was and if it was after the number of months you set, it will change the status to Paused.\nIf you want the program to ignore this set this to 0")
        self.private_button_tooltip = CTkToolTip.CTkToolTip(self.private_button, "Opens a dialog to set the private value.\nThis is for if you want to set the manga that you update on here to private on Anilist.\nMeaning it will not show up as activity or on your list for other users.")
        self.appearance_mode_optionemenu_tooltip = CTkToolTip.CTkToolTip(self.appearance_mode_optionemenu, "Changes the appearance mode of the application.")
        self.scaling_optionemenu_tooltip = CTkToolTip.CTkToolTip(self.scaling_optionemenu, "Changes the UI scaling of the application.\nYou may need to resize winodw to fit the new scaling.")
        self.exit_button_tooltip = CTkToolTip.CTkToolTip(self.exit_button, "Exits the application.\nPlease use this to exit program.\nIt is possible that the application will still run if you just close the window rather than use this button.")
        self.previous_file_path_textbox_tooltip = CTkToolTip.CTkToolTip(self.previous_file_path_textbox, "Displays the path of the previous Kenmei export file. (Optional)")
        self.previous_browse_button_tooltip = CTkToolTip.CTkToolTip(self.previous_browse_button, "Opens a file dialog to select the previous Kenmei export file. (Optional))")
        self.file_path_textbox_tooltip = CTkToolTip.CTkToolTip(self.file_path_textbox, "Displays the path of the Kenmei export file.")
        self.browse_button_tooltip = CTkToolTip.CTkToolTip(self.browse_button, "Opens a file dialog to select the Kenmei export file.")
        self.progress_bar_tooltip = CTkToolTip.CTkToolTip(self.progress_bar, f"{round((progress * 100), 1)}%")
    
    def manage_alternative_titles(self):
        alt_titles_dict = Get_Alt_Titles_From_File(alternative_titles_dict)
        # Create a new Tkinter window
        root = tk.Tk()
        # Hide the root window
        root.withdraw()

        # Display a numbered list of options in the terminal
        options = ['add', 'edit', 'delete']
        self.update_terminal("Manage Alternative Titles")
        for i, option in enumerate(options, 1):
            self.update_terminal(f"{i}. {option}")
        self.update_terminal("")

        # Ask the user to enter the number of the option they want to select
        action_index = simpledialog.askinteger("Manage Alternative Titles", "Enter the number of the option you want to select:")
        if action_index == 0:
            messagebox.showerror("Error", "Index out of range")
            self.update_terminal("Out of range\n")
            return
        try:
            action = options[action_index - 1]
        except TypeError:
            messagebox.showerror("Error", "Canceled")
            self.update_terminal("Canceled\n")
            return
        except IndexError:
            messagebox.showerror("Error", "Index out of range")
            self.update_terminal("\nIndex out of range\n")
            return

        if action in ['edit', 'delete']:
            # Display a numbered list of the keys and values in the dictionary in the terminal
            titles = list(alt_titles_dict.items())
            self.update_terminal("\nSelect a title")
            for i, (title, alt_title) in enumerate(titles, 1):
                self.update_terminal(f"{i}. {title} ==> {alt_title}")

            # Ask the user to enter the number of the key they want to select
            title_index = simpledialog.askinteger("Select a title", "Enter the number of the title you want to select:")
            if title_index == 0:
                messagebox.showerror("Error", "Index out of range")
                self.update_terminal("\nOut of range\n")
                return
            try:
                original_title, _ = titles[title_index - 1]
            except IndexError:
                messagebox.showerror("Error", "Index out of range")
                self.update_terminal("\nIndex out of range\n")
                return
            except TypeError:
                messagebox.showerror("Error", "Canceled")
                self.update_terminal("\nCanceled\n")
                return

            if action == 'edit':
                # Ask the user for the new alternative title
                new_alternative_title = simpledialog.askstring("Edit Alternative Title", "Enter the new alternative title:")
                if new_alternative_title is None:
                    # If the user cancels the dialog, show an error message and update the terminal with a cancellation message
                    messagebox.showerror("Error", "Canceled")
                    self.update_terminal("\nCanceled\n")
                    return
                elif new_alternative_title == '':
                    # If the user enters an empty string, show an error message and update the terminal
                    messagebox.showerror("Error", "No Title Entered")
                    self.update_terminal("\nNo Title Entered\n")
                    return
                # Update the alternative title in the dictionary
                alt_titles_dict[original_title] = new_alternative_title
                Save_Alt_Titles_To_File(alt_titles_dict)
                # Show a message box to confirm that the alternative title has been updated
                messagebox.showinfo("Edit Alternative Title", f"The alternative title for '{original_title}' has been updated to '{new_alternative_title}'.")
                self.update_terminal(f"The alternative title for '{original_title}' has been updated to '{new_alternative_title}'.")
            elif action == 'delete':
                # Delete the alternative title from the dictionary
                alt_titles_dict.pop(original_title, None)
                Save_Alt_Titles_To_File(alt_titles_dict)
                # Show a message box to confirm that the alternative title has been deleted
                messagebox.showinfo("Delete Alternative Title", f"The alternative title for '{original_title}' has been deleted.")
                self.update_terminal(f"The alternative title for '{original_title}' has been deleted.")
        elif action == 'add':
            # Ask the user for the original title and the alternative title
            try:
                original_title = simpledialog.askstring("Add Alternative Title", "Enter the original title:")
            except TypeError:
                # If the user cancels the dialog, show an error message and update the terminal with a cancellation message
                messagebox.showerror("Error", "Canceled")
                self.update_terminal("\nCanceled\n")
                return
            if original_title == "" or None:
                # If the user cancels the dialog, show an error message and update the terminal with a cancellation message
                messagebox.showerror("Error", "No Title Entered")
                self.update_terminal("\nNo Title Entered\n")
                return
            try:
                alternative_title = simpledialog.askstring("Add Alternative Title", "Enter the alternative title:")
            except TypeError:
                # If the user cancels the dialog, show an error message and update the terminal with a cancellation message
                messagebox.showerror("Error", "Canceled")
                self.update_terminal("\nCanceled\n")
                return
            if alternative_title == "" or None:
                # If the user cancels the dialog, show an error message and update the terminal with a cancellation message
                messagebox.showerror("Error", "No Title Entered")
                self.update_terminal("\nNo Title Entered\n")
                return
            # Add the alternative title to the dictionary
            alt_titles_dict[original_title] = alternative_title
            Save_Alt_Titles_To_File(alt_titles_dict)
            # Show a message box to confirm that the alternative title has been added
            messagebox.showinfo("Add Alternative Title", f"The alternative title '{alternative_title}' has been added for '{original_title}'.")
            self.update_terminal(f"The alternative title '{alternative_title}' has been added for '{original_title}'.")
        
    def update_progress_bar(self):
        if program_thread.is_alive():
            # If the thread is running, update the progress and status
            self.progress_bar.set(progress)
            self.status_label.configure(text=f"Status: {progress_status}")
            
            # Update the time taken
            time_taken = time.time() - self.start_time
            minutes, seconds = divmod(time_taken, 60)
            hours, minutes = divmod(minutes, 60)
            self.time_taken_label.configure(text=f'Time Taken: {int(hours):01d}:{int(minutes):02d}:{int(seconds):02d}')
            self.update_idletasks()
        else:
            # If the thread is not running, set progress to 0 and stop the function
            return
        self.after(100, self.update_progress_bar)  # Update every second
    
    def update_progress_and_status(self, status, program_progress=progress):
        # Update the global variables that were updated in the Program.py file
        global progress, progress_status
        if program_progress != progress:
            # If progress is different update objects associated with it
            progress = program_progress
            progress_status = status
            self.percent_label.configure(text=f"{round((progress * 100), 1)}%")
            self.progress_bar_tooltip.configure(message=f"{str(round((progress * 100), 1))}%")
    
    def update_terminal(self, text: str):
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
        # Store the current text of the entry widget
        current_text = entry_widget.get()

        # Open a file dialog and get the selected file path
        file_path = filedialog.askopenfilename()

        # Enable the entry widget and clear its current text
        entry_widget.configure(state="normal")
        entry_widget.delete(0, 'end')

        # If the user cancels the file dialog, restore the text of the entry widget
        if file_path == '':
            if current_text == '':
                # If the entry widget was empty, insert the placeholder text
                if entry_widget == self.previous_file_path_textbox:
                    entry_widget.insert(0, "Previous Kenmei Export File Path")
                else:
                    entry_widget.insert(0, "Kenmei Export File Path")
            else:
                # If the entry widget had text, restore it
                entry_widget.insert(0, current_text)
        else:
            # If the user selected a file, insert the file path into the entry widget
            entry_widget.insert(0, file_path)
            # And store the file path in the appropriate variable
            if is_previous:
                self.previous_file_path = file_path
            else:
                self.file_path = file_path

        # Disable the entry widget
        entry_widget.configure(state="disabled")

    def open_input_dialog_event(self):
        # Open input dialogs for the client ID and secret ID
        client_id = customtkinter.CTkInputDialog(text="Type in the Client ID:", title="Client ID")
        client_id_value = client_id.get_input()
        secret_id = customtkinter.CTkInputDialog(text="Type in the Secret ID:", title="Secret ID")
        secret_id_value = secret_id.get_input()

        # If the user cancels either dialog, update the terminal with a cancellation message
        if client_id_value is None or secret_id_value is None:
            self.update_terminal("Canceled")
        else:
            # If the user enters both IDs, create a configuration file and save it
            config = create_config(client_id_value, secret_id_value)
            self.update_terminal("Configuration file created and saved.")
            save_config(config, config_path)

    def open_token_dialog_event(self):
        # Open an input dialog for the access token
        token = customtkinter.CTkInputDialog(text="Type in the Access Token:", title="Access Token")
        token_value = token.get_input()

        try:
            # Load the configuration file and add the access token
            config = load_config(config_path)
            config['ACCESS_TOKEN'] = token_value
            save_config(config, config_path)
            self.update_terminal("Access Token set.")
            Set_Access_Token(app)
            self.thread1.stop_thread()
        except TypeError:
            # If the user cancels the dialog, show an error message and update the terminal with a cancellation message
            messagebox.showerror("Error", "Canceled")
            self.update_terminal("Canceled")
            self.thread1.stop_thread()

    def change_appearance_mode_event(self, new_appearance_mode: str):
        # Change the appearance mode of the application
        customtkinter.set_appearance_mode(new_appearance_mode)

    def change_scaling_event(self, new_scaling: str):
        # Change the UI scaling of the application
        new_scaling_float = int(new_scaling.replace("%", "")) / 100
        customtkinter.set_widget_scaling(new_scaling_float)

    def access_token_button_clicked(self):
        # Get the configuration
        Get_Config(app)
        # Pause execution for 2 seconds
        time.sleep(2)
        
        # Create a new thread for getting the access token
        self.thread1 = AccessTokenThread()
        
        # Start the access token thread
        self.thread1.start()

        # Open the token dialog
        self.open_token_dialog_event()
        
        # Wait for the access token thread to finish
        self.thread1.join()

    def month_button_clicked(self):
        while True:
            # Open an input dialog for the number of months
            months = customtkinter.CTkInputDialog(text="Type in the Number of Months:", title="Months")
            months_value = months.get_input()

            # If the user input is a digit
            if months_value.isdigit():
                # Load the configuration
                config = load_config(config_path)
                if config is not None:
                    # Update the number of months in the configuration and save it
                    config['MONTHS'] = months_value
                    save_config(config, config_path)
                    break
                else:
                    # If the configuration is not found, show an error message and update the terminal
                    messagebox.showerror("Error", "No config file found. Please set the API values first.")
                    self.update_terminal("No config file found. Please set the API values first.")
                    break
            else:
                # If the user input is not a digit, show an error message and update the terminal
                messagebox.showerror("Error", "Canceled")
                self.update_terminal("Canceled")

    def start_button_clicked(self):
        global progress
        global program_thread

        # Check if the thread is already running
        if program_thread is not None and program_thread.is_alive():
            return

        # Import the Program class
        from Program import Program
        # Create a new thread for the program
        program_thread = threading.Thread(target=Program, args=(self,))
        # Start the program thread
        program_thread.start()
        
        self.start_time = time.time()
        self.time_taken_label.configure(text=f"Time Taken: 0:00:00")
        
        self.update_progress_bar()
        progress = 0

    def private_button_clicked(self):
        while True:
            # Open an input dialog for the private value
            private = customtkinter.CTkInputDialog(text="Type in the Private Value (Yes/No):", title="Private")
            private_value = private.get_input()

            try:
                # If the user input is "yes" or "no"
                if private_value.lower() in ["yes", "no"]:
                    # Load the configuration
                    config = load_config(config_path)
                    if config is not None:
                        # Update the private value in the configuration and save it
                        config['PRIVATE'] = private_value
                        save_config(config, config_path)
                        break
                    else:
                        # If the configuration is not found, show an error message and update the terminal
                        messagebox.showerror("Error", "No config file found. Please set the API values first.")
                        self.update_terminal("No config file found. Please set the API values first.")
                        break
                else:
                    # If the user input is not "yes" or "no", show an error message and update the terminal
                    messagebox.showerror("Error", "Invalid input. Please enter Yes or No.")
                    self.update_terminal("Invalid input. Please enter Yes or No.")
            except AttributeError:
                # If the user cancels the dialog, show an error message and update the terminal
                messagebox.showerror("Error", "Canceled")
                self.update_terminal("Canceled")
        
    def on_close(self):
        # Exit the application
        sys.exit(0)

if __name__ == "__main__":
    # Create an instance of the App class and start the main loop
    app = App()
    app.mainloop()
    
