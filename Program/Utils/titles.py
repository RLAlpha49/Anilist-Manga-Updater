"""
This is the titles module. This module is responsible for the list of alternative titles.
"""

# pylint: disable=C0301
# flake8: noqa: E501
# Initialize the dictionary to store the alternative titles
alternative_titles_dict = {
    "The Part Time Nation of the Gods": "The Part-Time Land of the Gods",
    "Baek Clan’s Terminally Ill Young Master": "The Terminally Ill Young Master of the Baek Clan",
    "Yuiitsu Muni No Saikyou Tamer": "Yuiitsu Muni no Saikyou Tamer: Kuni no Subete no Guild de Monzembaraisareta kara, Takoku ni Itte Slow-Life Shimasu",
    "The God of War Who Regressed to Level 2": "The Martial God who Regressed Back to Level 2",
    "Auto-Hunting With Clones": "Auto Hunting With My Clones",
    "Gendai no Saikyou Heishi, Isekai Dungeon o Kouryaku Suru": "Gendai no Saikyou Heishi, Isekai Dungeon wo Kouryaku Suru",
    'Ryuu Kusari no Ori: Kokoro no Naka no "Kokoro"': 'Ryuusa no Ori: Kokoro no Naka no "Kokoro"',
    "Sobiwaku Zero no Saikyou Kenshi Demo, Noroi no Soubi (kawaii) Nara 9999-ko Tsuke-hodai": "Sobiwaku Zero no Saikyou Kenshi: demo, Noroi no Sobi (Kawaii) nara 9999-ko Tsuke Hodai",
    "Tensei Ryoushu no Yuuryou Kaitaku: Zensei no Kioku o Ikashite White ni Tsutometara, Yuunou na Jinzai ga Atsumari Sugimashita": "Tensei Ryoushu no Yuuryou Kaitaku: Zense no Kioku wo Ikashite White ni Tsutometara, Yuunou na Jinzai ga Atsumari Sugimashita",
    "Jigoku no Gouka de Yaka re Tsuzuketa Shounen. Saikyou no Honou Tsukai to Natte Fukkatsu Suru.": "Jigoku no Gouka de Yakare Tsuzuketa Shounen. Saikyou no Honou Tsuka to Natte Fukkatsu Suru",
    "Dungeon Athlete": "Dungeon Athelete",
    "It's My Destiny to Be Hero's Savior": "It’s My Destiny To Be The Hero’s Saviour",
    "Kuro no Senki: Isekai Ten’i Shita Boku ga Saikyou na no wa Bed no Ue dake no You desu": "Record of Kurono's War",
    "Shikkaku Mon no Saikyou Kenja   Sekai Saikyou no Kenja ga Sara ni Tsuyoku naru Tame ni Tensei Shimashita": "Shikkakumon no Saikyou Kenja: Sekai Saikyou no Kenja ga Sarani Tsuyoku Naru Tame ni Tensei Shimashita",
    "Maseki Gurume: Mamono no Chikara wo Tabeta Ore wa Saikyou!": "Maseki Gourmet: Mamono no Chikara wo Tabeta Ore wa Saikyou!",
    "Class-goto Shuudan Teni Shimashita ga, ichiban Tsuyoi Ore wa Saijaku no Shounin ni Gisouchuu": "Class-goto to Shuudan Teni Shimashita ga, Ichiban Tsuyoi Ore ha Saijaku no Shounin ni Gisouchuu Desu.",
    "Roku-hime wa Kami Goei ni Koi wo Suru: Saikyou no Shugo Kishi, Tenseishite Mahou Gakuen ni Iku": "Roku Hime wa Kami Goei ni Koi wo Suru: Saikyou no Shugo Kishi, Tensei Shite Mahou Gakuen ni Iku",
    "Boukensha License wo Hakudatsu Sareta Ossan Dakedo, Manamusume ga Dekita no de Nonbiri Jinsei wo Oukasuru": "Boukensha License wo Hakudatsu Sareta Ossan Dakedo, Manamusume ga Dekita no de Nonbiri Jinsei wo Ouka Suru",
    "Regina Rena – To the Unforgiven": "Regina Rena: To the Unforgiven",
    "The Millennium Alchemist": "The Millenium Alchemist",
    "Skill Lender`s Retrieving (Tale) ～I Told You It`s 10% Per 10 Days at First, Didn`t I?~": "Skill Lender no Torikaeshi: Toichi tte Saisho ni Itta yo na?",
    "Ochikobore Datta Ani ga Jitsuha Saikyou": "Ochikobore Datta Ani ga Jitsu wa Saikyou: Shijou Saikyou no Yuusha wa Tenseishi, Gakuen de Mujikaku ni Musou suru",
    "Tensei Shitara Dragon no Tamago Datta - Ibara no Dragon Road": "Reincarnated as a Dragon Hatchling",
    "Netoge no Yome ga Ninki Idol datta ken ~Cool-kei no kanojo wa genjitsu demo yome no tsumori de iru~": "My Wife in The Web Game is a Popular Idol",
    "Tsuihou no Kenja, Sekai wo Shiru ~Osanajimi Yuusha no Atsuryoku kara Nigete Jiyuu ni Natta Ore~": "Tsuihou no Kenja, Sekai wo Shiru: Osananajimi Yuusha no Atsuryoku kara Nigete Jiyuu ni Natta Ore",
    "S-Rank Monster no Behemoth Dakedo, Neko to Machigawarete Erufu Musume no Kishi (Pet) Toshite Kurashitemasu": "Ich bin ein mächtiger Behemoth und lebe als Kätzchen bei einer Elfe",
    "Ore wa Seikan Kokka no Akutoku Ryoshu": "Ore wa Seikan Kokka no Akutoku Ryoushu!",
    "Hazure Skill “Gacha” de Tsuihou Sareta Ore wa, Wagamama Osananajimi wo Zetsuen Shi Kakusei Suru": "Hazure Skill “Gacha”",
    "Ansatsu Skill de Isekai Saikyou: Renkinjutsu to Ansatsujutsu o Kiwameta Ore wa, Sekai o Kage kara Shihai suru": "Ansatsu Skill de Isekai Saikyou: Renkinjutsu to Ansatsujutsu wo Kiwameta Ore wa, Sekai wo Kage kara Shihai suru",
    "I Will Become the Hero's Mother": "Seducing the Monster Duke",
    "Genjitsushugi Yuusha no Oukoku Saikenki": "Genjitsu Shugi Yuusha no Oukoku Saikenki",
    "Ore no Ie ga Maryoku Spot datta Ken – Sundeiru dake de Sekai Saikyou": "Ore no Ie ga Maryoku Spot Datta Ken: Sundeiru dake de Sekai Saikyou",
    "Neta Chara Tensei Toka Anmarida!": "Neta Character Tensei toka Anmarida! THE COMIC",
    "Tou no Kanri o Shite Miyou": "Tou no Kanri wo Shite Miyou",
    "Houseki Shoujo wa Namida o Nagasanai": "Houseki Shoujo wa Namida wo Nagasanai",
    "Moto Shogun no Undead Knight": "Moto Shоugun no Undead Knight @comic",
    "Warrior High School – Dungeon Raid Department": "Warrior High School - Dungeon Raid Department",
    "Magan to Dangan o Tsukatte Isekai o Buchinuku!": "Magan to Dangan wo Tsukatte Isekai wo Buchinuku!",
    "Wan Gu Shen Wang": "Wangu Shen Wang",
    "Yondome wa Iya na Shizokusei Majutsushi": "Yondome wa Iyana Shi Zokusei Majutsushi",
    "Isekai Tensei... Sareteneee!": "Isekai Tensei... Saretenee!",
    "Tensei Nanajou de Hajimeru Isekai Life": "Tensei Nanajo de Hajimeru Isekai Life: Bannou Maryoku ga Areba Kizoku Shakai mo Yoyuu de Ikirareru to Kiita no desu ga?!",
    "Campus Flower Guard": "Campus Flower Guards",
    "Inverse Scale": "A Dragon in the Abyss",
    "The Hierarch Can’t Resist His Mistresses": "This Godfather Body Can't Leave the Women",
    "Risou no Musume Nara Sekai Saikyou Demo Kawaigatte Kuremasuka": "Risou no Musume Nara Sekai Saikyou Demo Kawaigatte Kuremasu ka?",
    "Kimi janakya Dame na Dorei Shoujo": "Kimi ja Nakya Dame na Dorei Shoujo",
    "Kyuuseishu ≪MESHIA≫~Isekai wo sukutta moto yuusha ga mamono no afureru genjitsu sekai wo musou suru~": "Isekai wo Sukutta Moto Yuusha ga Mamono no Afureru Genjitsu Sekai wo Musou Suru",
    "Ryoumin 0-nin Start no Henkyou Ryoushusama": "Ryoumin 0-Nin Start no Henkyou Ryoushu-sama",
    "Academy Genius Swordsman": "The Academy's Genius Swordsman",
    "Reborn Ranker – Gravity User": "Reborn Ranker - Gravity User",
    "Tensei Shitara Slime Datta Ken": "That Time I Got Reincarnated as a Slime",
    "The Emperor's Sword": "Hwangjeui Geom",
    "Existence": "Jonjae",
    "The Return of the Disaster Class Hero": "A Disaster-Class Hero Has Returned",
    "Mr. Zombie": "Jiang Si Xiansheng",
    "Shi Shen Zhi Lu": "The Path of Murder God",
    "Sword Dance Online": "Jian Wu",
    "Unbreakable": "Unbleakable",
    "Ane Naru Mono": "The Demon Who Became My Sister",
    "Immortal, Invincible": "Bulsamujeok",
    "Legend": "Legend (Masaharu Takano)",
    "Past Life Returner": "Past Life Regressor (2022)",
    "Manager Kim": "Kim Bujang",
    "Isekai Nonbiri Nouka": "Farming Life in Another World",
    "Record of Ragnarok": "Valkyrie of the End",
    "Returned from Hell": "Jiogeseo Doraon Handaeseong",
    "The Legendary Return": "Hoegwiui Jeonseol",
    "Max Level Player": "The Maxed-out Player",
    "Pick Me Up": "Pick Me Up, Infinite Gacha",
    "Tensei Shitara Ken Deshita": "I Was a Sword When I Reincarnated",
    "Beast Tamer": "Yuusha Party wo Tsuihou Sareta Beast Tamer, Saikyoushu no Nekomimi Shoujo to Deau",
    "Kuro no Shoukanshi": "Black Summoner: A combat maniac's ascension",
    "Survive as a Bastard Princess": "Surviving as the Illegitimate Princess",
    "Level 1 no Saikyou Kenja - Noroi de Saikakyuu Mahou Shika Tsukaenai kedo, Kami no Kanchigai no Mugen no Maryoku o Te ni Ire Saikyou ni": "Level 1 no Saikyou Kenja: Noroi de Saikakyuu Mahou shika Tsukaenaikedo, Kami no Kanchigai de Mugen no Maryoku o Te ni Ire Saikyou ni",
    "Ochikobore kuni o deru ~ jitsuwa sekai de 4 hitome no fuyo-jutsu-shidatta kudan ni tsuite ~": "Ochikobore Kuni wo Deru: Jitsu wa Sekai de 4-hitome no Fuyojutsushi Datta Ken Nitsuite",
    "Shikkaku Mon no Saikyou Kenja - Sekai Saikyou no Kenja ga Sara ni Tsuyoku naru Tame ni Tensei Shimashita": "Shikkakumon no Saikyou Kenja: Sekai Saikyou no Kenja ga Sarani Tsuyoku Naru Tame ni Tensei Shimashita",
    "Class goto Shuudan Teni Shimashita ga, ichiban Tsuyoi Ore wa Saijaku no Shounin ni Gisouchuu": "Class-goto to Shuudan Teni Shimashita ga, Ichiban Tsuyoi Ore ha Saijaku no Shounin ni Gisouchuu Desu.",
    "Roku hime wa Kami Goei ni Koi wo Suru: Saikyou no Shugo Kishi, Tenseishite Mahou Gakuen ni Iku": "The God-Tier Guardian and the Love of Six Princesses",
    "Saikyou Onmyouji no Isekai Tenseiki ~Geboku no Youkaidomo ni Kurabete Monster ga Yowaisugirundaga~": "Saikyou Onmyouji no Isekai Tenseiki: Geboku no Youkaidomo ni Kurabete Monster ga Yowai Sugirundaga @comic",
    "I Was Dismissed from the Hero’s Party Because They Don't Need My Training Skills, so I Strengthened My [Fief] Which I Got as a Replacement for My Retirement Money": "From Leveling Up the Hero to Leveling Up a Nation",
    "Tensei Inja wa Hokusoemu": "Tensei Inja wa Hokuso Emu",
    "Skill Lender’s Retrieving (Tale) ～I Told You It’s 10% Per 10 Days at First, Didn’t I?~": "Skill Lender no Torikaeshi: Toichi tte Saisho ni Itta yo na?",
    "Shinmai Ossan Bouken-sha, Saikyou paati ni shinu hodo kitae rarete Muteki ni naru": "Shinmai Ossan Bouken-sha, Saikyou Party ni Shinu Hodo Kitaerarete Muteki ni Naru.",
    "Maken Tsukai no Moto Shounen Hei wa, Moto Teki Kanbu no Onee-san to Issho ni Ikitai": "Maken Tsukai no Moto Shounenhei wa, Moto Tekikanbu no Onee-san to Issho ni Ikitai",
    "Yuusha Party wo Tsuihosareta Ore daga, Ore kara Sudattekureta you de Ureshii. ......nanode Dai Seijo, Omae ni Ottekorarete wa Komaru no daga?": "I’m Glad They Kicked Me From The Hero’s Party... But Why’re you following me, Great Saintess?",
    """Even Given the Worthless "Appraiser" Class, I'm Actually the Strongest - Unsurpassed with the Strongest [Divine Eye] Trained in the Abyss""": """Even Given the Worthless "Appraiser" Class, I'm Actually the Strongest""",
    "Gaming Stream of the Genius": "Cheonjaeui Game-bangsong",
    "Mikata ga Yowasugite Hojo Mahou ni Tesshiteita Kyuutei Mahoushi, Tsuihou Sarete Saikyou wo Mezashimasu": "Mikata ga Yowa Sugite Hojo Mahou ni Toushite Ita Kyuutei Mahoushi, Tsuihou Sarete Saikyou wo Mezasu",
    "The Strongest Female Masters, Who Are Trying to Raise Me Up, Are in Shambles Over Their Training Policy": "Training Regimes of the World’s Strongest Women",
    "S Rank Boukensha de aru Ore no Musume-tachi wa Juudo no Father Con deshita": "S-Rank Boukensha de Aru Ore no Musumetachi wa Juudo no Father-con Deshita",
    "Mahou Shoujo Gakuen no Suketto Kyoushi": "Mahou Joshi Gakuen no Suketto Kyoushi",
    "A Skeleton Who Was The Brave": "Mukashi Yuusha de Ima wa Hone",
    "Sono Mono. Nochi ni... ~Kigatsuitara S-kyuu Saikyou!? Yuusha Wazu no Daibouken~": "Sono Mono. Nochi ni...",
    "I Have Countless Legendary Swords": "I Own Infinite Legendary Blades",
    "100-nin no Eiyuu o Sodateta Saikyou Yogensha wa, Boukensha ni Natte mo Sekaijuu no Deshi kara Shitawarete Masu": "100-nin no Eiyuu wo Sodateta Saikyou Yogensha wa, Boukensha ni Natte mo Sekaijuu no Deshi kara Shitawaretemasu @comic",
    "Ultimate Abandoned": "Jue Ding Qi Shao",
    "Supreme Mad Emperor System": "Zhizun Kuang Di Xitong",
    "Return From the World of Immortals": "Returning from the Immortal World",
    "Saikyou no Maou ni Kitaerareta Yuusha Isekai Kikanshatati no Gakuen de Musou Suru": "Saikyou no Maou ni Kitaerareta Yuusha, Isekai Kikansha-tachi no Gakuen de Musou Suru",
    "Ichizu Bitch-Chan (Web)": "Ichizu Bitch-chan",
    "If the Villainess and the Villain Were to Meet and Fall in Love ~It Seems the Shunned Heroine Who Formed a Contract With an Unnamed Spirit Is Fighting With the Nobleman Yet Again~": "If the Villainess and Villain Met and Fell in Love",
    "REAL PLAY: BERSEKER": "Ripple: Berserker",
    "The Game's Greatest Troll": "World's Strongest Troll",
    "Isekai ni Teni Shitara Yama no Naka datta. Handou de Tsuyo Sayori mo Kaitekisa o Erabi Mashita": "Isekai ni Teni shitara Yama no Naka datta. Handou de Tsuyosa yori mo Kaitekisa wo Erabimashita.",
    "Since My Previous Life Was A Wise Man I Can Afford To Live": "Umareta Chokugo ni Suterareta kedo, Zensei ga Taikensha datta node Yoyuu de Ikitemasu",
    "Tsuihousareru Tabi ni Skill wo Te ni Ireta Ore ga, 100 no Isekai de 2-shuume Musou": "Tsuihou Sareru Tabini Sukiru wo te ni Ireta Ore ga, 100 no Isekai de 2-shuume Musou",
    "Isekai Apocalypse MYNOGHRA ~The Conquest of the World Starts With the Civilisation of Ruin~": "Isekai Mokushiroku Mynoghra: Hametsu no Bunmei de Hajimeru Sekai Seifuku",
    "The Time Mage’s Strong New Game ～I Returned to the Past To Rewrite It as the World’s Strongest": "Toki Majutsushi no Tsuyokute New Game: Kako ni Modotte Sekai Saikyou Kara Yarinaosu",
    "Tonari No Kuuderera O Amayakashitara, Uchi No Aikagi O Watasu Koto Ni Natta": "Tonari no Quderella wo Amayakashitara, Uchi no Aikagi wo Watasu Koto ni Natta",
    "Hachinan tte, Sore wa Nai Deshou!": "The 8th Son? Are You Kidding Me?",
    "Prince Hero": "Skipping Title",  # Not on site and assosiates it with a different manga name
    # Titles i personally skip, most of them are not on Anilist in general
    #    "My Cells Kingdom" : "Skipping Title",
    #    "Point Gifter Keikenchi Bunpai Nouryokusha no Isekai Saikyou Solo Life" : "Skipping Title",
    #    "Gods' Gambit" : "Skipping Title",
    #    "Control Player" : "Skipping Title",
    #    "Level Drain" : "Skipping Title",
    #    '"Heh heh heh....... He Is the Weakest of the Four Heavenly Kings." I Was Dismissed From My Job, but Somehow I Became the Master of a Hero and a Priestess' : "Skipping Title",
    #    "Is the Demon King a Healer?" : "Skipping Title",
    #    "Kiwameta Renkinjutsu ni, Fukanou wa nai." : "Skipping Title",
    #    "Level 596 no Tanya Minarai" : "Skipping Title",
    #    "I'm Really Not the Villain" : "Skipping Title",
    #    "Magica Technica" : "Skipping Title",
    #    "I Am the Main Characters' Child" : "Skipping Title",
    #    "SSS Rank Dungeon de Knife Ippon Tewatasare Tsuihou Sareta Shiro Madoushi: Yggdrasil no Noroi ni yori Jakuten de aru Maryoku Fusoku wo Kokufuku-shi Sekai Saikyou e to Itaru" : "Skipping Title",
    #    "The Beginning After the End" : "Skipping Title",
    #    "Deck Hitotsu de Isekai Tanbou" : "Skipping Title",
    #    "I Became an Evolving Space Monster" : "Skipping Title",
    #    "Ark The Legend" : "Skipping Title",
    #    "The Count's Youngest Son is A Player" : "Skipping Title",
    #    "Under the Black Fog" : "Skipping Title",
    #    "Isekai Shokan Ojisan No Ju Muso Life Sabage Suki Salary Man Ha Kaisha Owari Ni Isekai He Chokuki Suru" : "Skipping Title",
    #    "Tensei Shitara Kozakana datta kedo Ryuu ni Nareru Rashii node Ganbarimasu" : "Skipping Title",
    #    "Rebirth: Back to 1983 to Be a Millionaire" : "Skipping Title",
    #    "Invincible After 100 Years of Seclusion" : "Skipping Title",
    #    "Rebirth of God Level Prodigal System" : "Skipping Title",
    #    "The Strongest Golden Kidney System" : "Skipping Title",
    #    "My Apocalyptic Miss" : "Skipping Title",
    #    "The Great Devil Emperor Development System" : "Skipping Title",
    #    "Nation's Hunk is Hooked on Me" : "Skipping Title",
    #    "I Have Million Skill Points" : "Skipping Title",
    #    "Gods reborn" : "Skipping Title",
    #    "Invincible Xueba System" : "Skipping Title",
    #    "Berserk Boost" : "Skipping Title",
    #    "Campus Martial God" : "Skipping Title",
    #    "Infinite Skill Getter!" : "Skipping Title",
    #    "Sovereign of Judgement" : "Skipping Title",
    #    "God's Webnovel" : "Skipping Title",
    #    "I Attained the Legendary Profession But Now I’m Being Hunted Down by the Whole Server?!" : "Skipping Title",
    #    "The Last Immortal’s Theorem" : "Skipping Title",
    #    "I Killed an Academy Player" : "Skipping Title",
    #    "We Started A So Sweet Newlywed Life" : "Skipping Title",
    #    "【Sekai Saikyou no Shitsuji】Black Shokuba wo Tsuihousareta Ore, Koori no Reijou ni Hirowareru" : "Skipping Title",
    #    "I Quit the Hero's Party" : "Skipping Title",
    #    "Bloodhound's Regression Instinct" : "Skipping Title",
    #    "Ore wa EX-Kyuu Hunter da" : "Skipping Title",
    #    "Damn Demonic Swords" : "Skipping Title",
    #    "The Heavenly Demon’s Descendant" : "Skipping Title",
    #    "The Genius Assassin Who Takes it All" : "Skipping Title",
    #    "World's Strongest Invalid Swordsman" : "Skipping Title"
}
# pylint: enable=C0301
