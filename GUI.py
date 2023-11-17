import tkinter
import tkinter.messagebox
import customtkinter
from PIL import Image

customtkinter.set_appearance_mode("System")  # Modes: "System" (standard), "Dark", "Light"
customtkinter.set_default_color_theme("blue")  # Themes: "blue" (standard), "green", "dark-blue"

logo = customtkinter.CTkImage(Image.open("Resources/Anilist-Manga-Updater-Logo2.png"), size=(100,100))

class App(customtkinter.CTk):
    def __init__(self):
        super().__init__()

        # configure window
        self.title("Anilist Manga Updater")
        self.geometry(f"{900}x{535}")

        # configure grid layout (4x4)
        self.grid_columnconfigure(1, weight=1)
        self.grid_columnconfigure((2, 3), weight=0)
        self.grid_rowconfigure((0, 1, 2), weight=1)

        # create sidebar frame with widgets
        self.sidebar_frame = customtkinter.CTkFrame(self, width=140, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, rowspan=4, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1)
        
        self.logo_label = customtkinter.CTkLabel(self.sidebar_frame, image=logo, text="")  # display image with a CTkLabel
        self.logo_label.grid(row=0, column=0, padx=20, pady=(10, 10))
        self.title_label = customtkinter.CTkLabel(self.sidebar_frame, text="Anilist Manga\nUpdater", font=customtkinter.CTkFont(size=20, weight="bold"))
        self.title_label.grid(row=1, column=0, padx=20, pady=(0, 10))
        self.api_button = customtkinter.CTkButton(self.sidebar_frame, command=self.open_input_dialog_event, text="Set API Values")
        self.api_button.grid(row=2, column=0, padx=20, pady=10)
        self.access_token_button = customtkinter.CTkButton(self.sidebar_frame, command=self.sidebar_button_event, text="Get Access Token")
        self.access_token_button.grid(row=3, column=0, padx=20, pady=10)
        
        self.appearance_mode_label = customtkinter.CTkLabel(self.sidebar_frame, text="Appearance Mode:", anchor="w")
        self.appearance_mode_label.grid(row=5, column=0, padx=20, pady=(10, 0))
        self.appearance_mode_optionemenu = customtkinter.CTkOptionMenu(self.sidebar_frame, values=["Light", "Dark", "System"],
                                                                       command=self.change_appearance_mode_event)
        self.appearance_mode_optionemenu.grid(row=6, column=0, padx=20, pady=(10, 10))
        
        self.scaling_label = customtkinter.CTkLabel(self.sidebar_frame, text="UI Scaling:", anchor="w")
        self.scaling_label.grid(row=7, column=0, padx=20, pady=(10, 0))
        self.scaling_optionemenu = customtkinter.CTkOptionMenu(self.sidebar_frame, values=["80%", "90%", "100%", "110%", "120%"],
                                                               command=self.change_scaling_event)
        self.scaling_optionemenu.grid(row=8, column=0, padx=20, pady=(10, 20))


        self.file_path_textbox = customtkinter.CTkEntry(self, placeholder_text="Kenmei Export File Path")
        self.file_path_textbox.grid(row=3, column=1, columnspan=2, padx=(20, 0), pady=(20, 20), sticky="nsew")

        self.browse_button = customtkinter.CTkButton(master=self, fg_color="transparent", border_width=2, text_color=("gray10", "#DCE4EE"), text="Browse")
        self.browse_button.grid(row=3, column=3, padx=(20, 20), pady=(20, 20), sticky="nsew")

        self.terminal = customtkinter.CTkTextbox(self, width=250)
        self.terminal.grid(row=0, column=1, columnspan=3, rowspan=3, padx=(20, 20), pady=(20, 0), sticky="nsew")

        # set default values
        self.appearance_mode_optionemenu.set("Dark")
        self.scaling_optionemenu.set("100%")
        self.file_path_textbox.configure(state="disabled")
        self.terminal.insert("0.0", "CTkTextbox\n\n" + "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.\n\n" * 20)
        self.terminal.configure(state="disabled")

    def open_input_dialog_event(self):
        client_id = customtkinter.CTkInputDialog(text="Type in the Client ID:", title="Client ID")
        print("CTkInputDialog:", client_id.get_input())
        secret_id = customtkinter.CTkInputDialog(text="Type in the Secret ID:", title="Secret ID")
        print("CTkInputDialog:", secret_id.get_input())

    def change_appearance_mode_event(self, new_appearance_mode: str):
        customtkinter.set_appearance_mode(new_appearance_mode)

    def change_scaling_event(self, new_scaling: str):
        new_scaling_float = int(new_scaling.replace("%", "")) / 100
        customtkinter.set_widget_scaling(new_scaling_float)

    def sidebar_button_event(self):
        print("Sidebar button clicked")
    
    def update_terminal(self, text: str):
        self.terminal.configure(state="normal")
        self.terminal.insert("end", text)
        self.terminal.configure(state="disabled")


if __name__ == "__main__":
    app = App()
    app.mainloop()