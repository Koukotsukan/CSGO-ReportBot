# UPDATE FIX! 12/07/2019 ✔️

# CSGO ReportBot b1rd(old sirystes)

This is a simple reportbot! just download and be happy banishing cheaters!!

# Features of Sirystes
Reporting Cheats / Trolls / griefers

## Report Bot:

- It is still possible to report by `MatchID` but for better performance you need to specify the `ServerID` 
- Report cooldown is 12 hours per report
- There are no more commands, you, because this version use the same commendbot bypass just modified to report

# Screenshot

## Console Log:

![Console Screenshot](./eB6cZqL.gif)

# Requirements

- [NodeJS](https://nodejs.org/)
- [SteamWebAPIKey](https://steamcommunity.com/dev/apikey)

# Installation

1. Download this git
2. Put it all in a folder
3. Open the folder and click `install.bat`
4. Put your steam API key inside de `config.js` and save
5. Open `Start DBmanager.bat` put your accounts in `db` and save
6. Open the `Start report` run the following commands : `node setup.js`
7. DONE!!!


# Account Setup

Open the text document `setup.txt` paste your accounts in the username:password format, so you will run the command prompt node and run
`node setup.js` and then your accounts will be set to sirystes-rbot (remembering that you must do setup every time you add a new accounts but you can do the process of adding manually if you want, just need to open `accounts.json`)


# Account Manager

Account manager helper to clean duplicate accounts and remove empty spaces and non existing accounts, it is also possible to know how many accounts are available and remove 1 or more at one time if you need ...

`node accmanager.js [--clean] [--available] [--delete]`

commands :

~ `--clean` - Will clean the `accounts.json` file by removing duplicate entries and removing entries with empty username/password.

~ `--accounts` - Will show the number of accounts available to report.

~ `--remove <usernames>` - This command will remove accounts from the list of accounts. You can remove multiple accounts at one time by placing user names separated by space.
