# Anilist-Manga-Updater

<!-- GETTING STARTED -->
## Getting Started

Download the latest release and run the .exe file given. 

### Prerequisites

#### Getting list from [Kenmei](https://www.kenmei.co)
1. In settings under the dashboard you can export your list as a .csv file.
   ![Screenshot 2023-11-12 000629](https://github.com/RLAlpha49/Anilist-Manga-Updater/assets/75044176/07e7da8e-8e6c-44c7-85a8-4117fab05afb)

3. Place this file in the same directory as the script.

### Installation

1. You will need to set up an API in anilist connected to your account. (In Settings under the developer tab)
    - Name the new client whatever you would like, personally I chose "MangaUpdater"
    - Set the redirect URL to "https://anilist.co/api/v2/oauth/pin"
    - A benefit to each person making their own api client is that as long as none of the authentication information is shared, you are the sole person that has access to the account with that authentication
2. When running the program it will ask you for the following client id and secret values generated from the api client. (They are saved to the config.json file)
    - DO NOT share the ID or Secret values, it is possible for someone to get full access to your account.
3. The script will have you authenticate your account everytime you run it.

![Screenshot 2023-11-12 000956](https://github.com/RLAlpha49/Anilist-Manga-Updater/assets/75044176/fda82a15-f14e-42bf-a2c7-215b916ce863)

<!-- USAGE EXAMPLES -->
## Usage

Currently i use this script to update my manga list from my [Kenmei](https://www.kenmei.co) account.
I plan to later to grab manga lists from certain manga websites. If you have any you would like me to look into please let me know.

<!-- CONTACT -->
## Contact

Discord - alpha49
