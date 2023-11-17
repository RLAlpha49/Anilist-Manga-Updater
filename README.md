<!-- PROJECT LOGO -->
<br />
<div align="center">
   
![Anilist-Manga-Updater-Logo2](https://github.com/RLAlpha49/Anilist-Manga-Updater/assets/75044176/80dad30b-982d-4bbe-a66c-72f351757701)

<h1 align="center">Anilist-Manga-Updater</h3>
</div>

<!-- GETTING STARTED -->
## Getting Started

Download the latest release and run the .exe file given. 

P.S. Due to compiling Python files using pyinstaller, certain anti-virus programs give a false positive. You may need to exclude the exe file in your anti-virus.\
You could also run the files yourself. Just download the zip file of the source code, extract it, make sure you have all the Python packages installed, and run the main.py file.

### Prerequisites

#### Getting list from [Kenmei](https://www.kenmei.co)
1. In settings under the dashboard you can export your list as a .csv file.
   ![Screenshot 2023-11-12 000629](https://github.com/RLAlpha49/Anilist-Manga-Updater/assets/75044176/07e7da8e-8e6c-44c7-85a8-4117fab05afb)

3. Place this file in the same directory as the script.

### Installation

1. You will need to set up an API in Anilist connected to your account. (In Settings under the developer tab)
    - Name the new client whatever you would like, I chose "MangaUpdater"
    - Set the redirect URL to "https://anilist.co/api/v2/oauth/pin"
    - A benefit to each person making their API client is that as long as none of the authentication information is shared, you are the sole person who has access to the account with that authentication
2. When running the program it will ask you for the following client ID and secret values generated from the API client. (They are saved to the config.json file)
    - DO NOT share the ID or Secret values, someone can get full access to your account.
3. The script will have you authenticate your account every time you run it.

![Screenshot 2023-11-15 165937](https://github.com/RLAlpha49/Anilist-Manga-Updater/assets/75044176/4b69cf6f-a98c-4dbc-ad03-bab83c9a8d35)

<!-- USAGE EXAMPLES -->
## Usage

Currently, I use this script to update my manga list from my [Kenmei](https://www.kenmei.co) account.
I plan later to grab manga lists from certain manga websites. If you have any you would like me to look into please let me know.

The script outputs 3 different text files when finished.
   - One which has manga that was found to have multiple different IDs associated with it. (usually due to the name being found as a direct match in English or Romaji and others which has matches in synonyms)
      - This file also gives the Anilist links to the manga so that they can be individually checked.
   - The second one is manga which was found to not have any English, Romaji, or synonym name matches. (Most times this is due to translations of titles being different from the input sources and Anilist)
      - You can then search these names separately on Anilist to see if you can get any results.
   - The third is in a sub directory which keeps track of how many chapters are updated each time you run the program.

<!-- CONTACT -->
## Contact

[Discord - alpha49](https://discordid.netlify.app/?id=251479989378220044)\
[Anilist - Alpha49](https://anilist.co/user/Alpha49/)
