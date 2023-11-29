# Import necessary modules
import pandas as pd
from WriteToFile import Get_Alt_Titles_From_File

# Initialize an empty dictionary to store the manga names and chapters
manga_names_chapters = {}

# Initialize the dictionary to store the alternative titles
alternative_titles_dict = {
   "The Part Time Nation of the Gods" : "The Part-Time Land of the Gods",
   "Baek Clan’s Terminally Ill Young Master" : "The Terminally Ill Young Master of the Baek Clan",
   "Yuiitsu Muni No Saikyou Tamer" : "Yuiitsu Muni no Saikyou Tamer: Kuni no Subete no Guild de Monzembaraisareta kara, Takoku ni Itte Slow-Life Shimasu",
   "The God of War Who Regressed to Level 2" : "The Martial God who Regressed Back to Level 2",
   "Auto-Hunting With Clones" : "Auto Hunting With My Clones",
   "Prince Hero" : "Skipping Title",
   "Gendai no Saikyou Heishi, Isekai Dungeon o Kouryaku Suru" : "Gendai no Saikyou Heishi, Isekai Dungeon wo Kouryaku Suru",
   'Ryuu Kusari no Ori: Kokoro no Naka no "Kokoro"' : 'Ryuusa no Ori: Kokoro no Naka no "Kokoro"',
   "Sobiwaku Zero no Saikyou Kenshi Demo, Noroi no Soubi (kawaii) Nara 9999 ko Tsuke hodai" : "Sobiwaku Zero no Saikyou Kenshi: demo, Noroi no Sobi (Kawaii) nara 9999-ko Tsuke Hodai",
   "Tensei Ryoushu no Yuuryou Kaitaku: Zensei no Kioku o Ikashite White ni Tsutometara, Yuunou na Jinzai ga Atsumari Sugimashita" : "Tensei Ryoushu no Yuuryou Kaitaku: Zense no Kioku wo Ikashite White ni Tsutometara, Yuunou na Jinzai ga Atsumari Sugimashita",
   "Jigoku no Gouka de Yaka re Tsuzuketa Shounen. Saikyou no Honou Tsukai to Natte Fukkatsu Suru." : "Jigoku no Gouka de Yakare Tsuzuketa Shounen. Saikyou no Honou Tsuka to Natte Fukkatsu Suru",
   "Dungeon Athlete" : "Dungeon Athelete",
   "It's My Destiny to Be Hero's Savior" : "It’s My Destiny To Be The Hero’s Saviour",
   "Kuro no Senki: Isekai Ten`i Shita Boku ga Saikyou na no wa Bed no Ue dake no You desu" : "Kuro no Senki: Isekai Teni shita Boku ga Saikyou nano wa Bed no Ue dake no you desu",
   "Shikkaku Mon no Saikyou Kenja   Sekai Saikyou no Kenja ga Sara ni Tsuyoku naru Tame ni Tensei Shimashita" : "Shikkakumon no Saikyou Kenja: Sekai Saikyou no Kenja ga Sarani Tsuyoku Naru Tame ni Tensei Shimashita",
   "Maseki Gurume: Mamono no Chikara wo Tabeta Ore wa Saikyou!" : "Maseki Gourmet: Mamono no Chikara wo Tabeta Ore wa Saikyou!",
   "Class goto Shuudan Teni Shimashita ga, ichiban Tsuyoi Ore wa Saijaku no Shounin ni Gisouchuu" : "Class-goto to Shuudan Teni Shimashita ga, Ichiban Tsuyoi Ore ha Saijaku no Shounin ni Gisouchuu Desu.",
   "Roku hime wa Kami Goei ni Koi wo Suru: Saikyou no Shugo Kishi, Tenseishite Mahou Gakuen ni Iku" : "Roku Hime wa Kami Goei ni Koi wo Suru: Saikyou no Shugo Kishi, Tensei Shite Mahou Gakuen ni Iku",
   "Boukensha License wo Hakudatsu Sareta Ossan Dakedo, Manamusume ga Dekita no de Nonbiri Jinsei wo Oukasuru" : "Boukensha License wo Hakudatsu Sareta Ossan Dakedo, Manamusume ga Dekita no de Nonbiri Jinsei wo Ouka Suru",
   "Regina Rena – To the Unforgiven" : "Regina Rena: To the Unforgiven",
   "I Was Dismissed from the Hero`s Party Because They Don't Need My Training Skills, so I Strengthened My [Fief] Which I Got as a Replacement for My Retirement Money" : '"Kukuku....... He Is the Weakest of the Four Heavenly Monarchs." I Was Dismissed From My Job, but Somehow I Became the Master of a Hero and a Holy Maiden',
   "The Millennium Alchemist" : "The Millenium Alchemist",
   "Skill Lender`s Retrieving (Tale) ～I Told You It`s 10% Per 10 Days at First, Didn`t I?~" : "Skill Lender no Torikaeshi: Toichi tte Saisho ni Itta yo na?",
   "Ochikobore Datta Ani ga Jitsuha Saikyou" : "Ochikobore Datta Ani ga Jitsu wa Saikyou: Shijou Saikyou no Yuusha wa Tenseishi, Gakuen de Mujikaku ni Musou suru",
   "Tensei Shitara Dragon no Tamago Datta   Ibara no Dragon Road" : "Tensei Shitara Dragon no Tamago Datta: Saikyou Igai Mezasa Nee",
   "Netoge no Yome ga Ninki Idol datta ken ~Cool kei no kanojo wa genjitsu demo yome no tsumori de iru~" : "Netoge no Yome ga Ninki Idol Datta: Cool kei no Kanojo wa Genjitsu demo Yome no Tsumori de Iru",
   "Tsuihou no Kenja, Sekai wo Shiru ~Osanajimi Yuusha no Atsuryoku kara Nigete Jiyuu ni Natta Ore~" : "Tsuihou no Kenja, Sekai wo Shiru: Osananajimi Yuusha no Atsuryoku kara Nigete Jiyuu ni Natta Ore",
   "S Rank Monster no Behemoth Dakedo, Neko to Machigawarete Erufu Musume no Kishi (Pet) Toshite Kurashitemasu" : 'S-Rank Monster no "Behemoth" Dakedo, Neko to Machigawarete Elf Musume no Pet to Shite Kurashitemasu',
   "Ore wa Seikan Kokka no Akutoku Ryoshu" : "Ore wa Seikan Kokka no Akutoku Ryoushu!",
   "Hazure Skill “Gacha” de Tsuihou Sareta Ore wa, Wagamama Osananajimi wo Zetsuen Shi Kakusei Suru" : "Hazure Skill “Gacha” de Tsuihou Sareta Ore wa, Wagamama Osananajimi wo Zetsuen Shi Kakusei Suru: Bannou Cheat Skill wo Getto Shite, Mezase Rakuraku Saikyou Slow Life!",
   "Ansatsu Skill de Isekai Saikyou: Renkinjutsu to Ansatsujutsu o Kiwameta Ore wa, Sekai o Kage kara Shihai suru" : "Ansatsu Skill de Isekai Saikyou: Renkinjutsu to Ansatsujutsu wo Kiwameta Ore wa, Sekai wo Kage kara Shihai suru",
   "I Will Become the Hero's Mother" : "Seducing the Monster Duke",
   "Genjitsushugi Yuusha no Oukoku Saikenki" : "Genjitsu Shugi Yuusha no Oukoku Saikenki",
   "Ore no Ie ga Maryoku Spot datta Ken – Sundeiru dake de Sekai Saikyou" : "Ore no Ie ga Maryoku Spot Datta Ken: Sundeiru dake de Sekai Saikyou",
   "Neta Chara Tensei Toka Anmarida!" : "Neta Character Tensei toka Anmarida! THE COMIC",
}

alternative_titles_dict = Get_Alt_Titles_From_File(alternative_titles_dict)

# Function to print the manga found in the CSV file
def Manga_Found_In_CSV(app):
    # Get the manga with the last chapter from the CSV file
    manga_with_last_chapter = Get_Manga_Names(app, alternative_titles_dict)
    
    try:
        # Print the manga found in the CSV file
        app.update_terminal("Manga found in CSV:")
        for title, details in manga_with_last_chapter.items():
            app.update_terminal(f"Title: {title}, Last Chapter Read: {details.get('last_chapter_read')}, Last Read At: {details.get('last_read_at')}")
    except AttributeError:
        return None
    
def get_alternative_title(title, alternative_titles_dict):
    # Check if the title is in the dictionary
    if title in alternative_titles_dict:
        # If it is, return the alternative title
        return alternative_titles_dict[title]
    # If it's not, return the original title
    return title

# Function to get manga names from a file
def Get_Manga_Names(app, alternative_titles_dict):
    global manga_names_chapters
    # Get the difference between the current and previous file
    file = Get_File_Diff(app)
    try:
        # Iterate through each row in the file
        for index, row in file.iterrows():
            # Get the title, last chapter read, status, and last read at from the row
            title = row['title']
            # Get the alternative title
            alt_title = get_alternative_title(title, alternative_titles_dict)
            last_chapter_read = row['last_chapter_read']
            status = row['status']
            last_read_at = row['last_read_at']

            try:
                # Add the alternative title and its details to the manga_names_chapters dictionary
                manga_names_chapters[alt_title] = {'last_chapter_read': int(last_chapter_read), 'status': status, 'last_read_at': last_read_at}
            except (ValueError, AttributeError):
                # If there is no last chapter read, print a message and add the alternative title and its status to the dictionary
                app.update_terminal(f"Title: {alt_title}, Has no Last Chapter Read")
                app.update_terminal(status)
                if status == 'plan_to_read':
                    manga_names_chapters[alt_title] = {'status': status}
    except AttributeError:
        return None

    # Return the manga_names_chapters dictionary
    return manga_names_chapters

# Function to get the difference between the current and previous file
def Get_File_Diff(app):
    global manga_names_chapters
    try:
        manga_names_chapters = {}
        # Read the current file
        df = pd.read_csv(app.file_path)
        # Check if there is a previous file
        has_previous_file = app.previous_file_path != ''
        if has_previous_file:
            # If there is a previous file, read it
            df_previous = pd.read_csv(app.previous_file_path)
    except FileNotFoundError:
        # If the file is not found, print an error message
        app.update_terminal("Error: Please browse for a kenmei export file. (Previous is Optional)")
        return None

    if has_previous_file:
        # If there is a previous file, get the difference between the current and previous file
        df_diff = pd.merge(df, df_previous, how='outer', indicator=True, on=['title', 'status', 'last_chapter_read', 'last_read_at'])
        df_diff = df_diff[df_diff['_merge'] == 'left_only']
        return df_diff
    return df