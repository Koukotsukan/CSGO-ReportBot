# CSGO ReportBot Sirystes

This is a simple reportbot made in JavaScript! just download and be happy banishing cheaters !!

# Joins with us on Discord

- Join discord : https://discord.gg/AcCKXyw


# Features of Sirystes

Only report bot!! [NOT COMMEND BOT]


## Report Bot:

- The `MatchID` is optional, just leave it empty (`""`) if you do not want to use it
- Report cooldown is 12 hours per report
- Command to report : `node sirystesrbot.js <Account> <Amount> [MatchID]`

# Screenshot

## Console Log:

(https://i.imgur.com/eB6cZqL.gif)

(https://i.imgur.com/eB6cZqL.gif)

# Requirements

- [NodeJS](https://nodejs.org/)
- [SteamWebAPIKey](https://steamcommunity.com/dev/apikey)

# Installation

1. Download this repository
2. Put it all in a folder(desktop recommended)
3. Open a the folder go to `sirystes_config` and `config`
4. Put your steam API key in the line 2 and save
5. Open `setup.txt` put your accounts in `username: password` and save
6. Open the command prompt of node.js run the following commands : `node setup.js`
7. DONE!!!


# Account Setup

Open the text document `setup.txt` paste your accounts in the username:password format, so you will run the command prompt node and run
`node setup.js` and then your accounts will be set to sirystes-rbot (remembering that you must do setup every time you add a new accounts but you can do the process of adding manually if you just need to open `accounts.json`)


#Account Manager

Account manager helper to clean duplicate accounts and remove empty spaces and non existing accounts, it is also possible to know how many accounts are available and remove 1 or more at one time if you need ...

`node accmanager.js [--clean] [--available] [--delete]`

commands :

~ `--clean` - Will clean the `accounts.json` file by removing duplicate entries and removing entries with empty username/password
~ `--accounts` - Will show the number of accounts available to report
~ `--remove <usernames>` - This command will remove accounts from the list of accounts. You can remove multiple accounts at one time by placing user names separated by space
