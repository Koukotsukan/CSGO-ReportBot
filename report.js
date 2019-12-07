const sqlite = require("sqlite");
const ChildProcess = require("child_process");
const path = require("path");
const SteamUser = require("steam-user");
const fs = require("fs");
const Target = require("./helpers/Target.js");
const Helper = require("./helpers/Helper.js");
const Account = require("./helpers/account.js");
const config = require("./config.json");
var opn = require('opn');

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const colors = {
	reset: "\x1b[0m",
	black: "\x1b[90m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m"
};
const helper = new Helper(config.steamWebAPIKey);
let totalNeeded = 0;
if (config.type && config.type.toUpperCase() === "REPORT") {
	totalNeeded = Math.max(config.report.aimbot, config.report.wallhack, config.report.speedhack, config.report.teamharm, config.report.textabuse, config.report.voiceabuse);
} else {
	totalNeeded = Math.max(config.commend.friendly, config.commend.teaching, config.commend.leader);
}
let db = undefined;
let isNewVersion = false;
let totalSuccess = 0;
let totalFail = 0;
let _consolelog = console.log;
console.log = (color, ...args) => {
	args.unshift(colors[color] ? colors[color] : color);
	args.push(colors.reset);
	_consolelog(...args);
}

(async () => {
	if (typeof config.type === "undefined") {
		config.type = "COMMEND";
	}

	if (!["LOGIN", "SERVER"].includes(config.method.toUpperCase())) {
		console.log("red", "The \"method\" option only allows for \"LOGIN\" or \"SERVER\" value. Please refer to the README for more information.");
		return;
	}

	if (!["REPORT", "COMMEND"].includes(config.type.toUpperCase())) {
		console.log("red", "The \"type\" option only allows for \"REPORT\" or \"COMMEND\" value. Please refer to the README for more information.");
		return;
	}

	if (config.method.toUpperCase() === "LOGIN" && config.type.toUpperCase() === "REPORT") {
		console.log("red", "You cannot use the \"REPORT\" type and \"LOGIN\" method at the same time. You wouldn't want to report yourself?");
		return;
	}
	console.log("magenta", "\n   _   ___         _                        _      _       _   ");
	    console.log("magenta", " | |_|_  |  ___ _| |   ___ ___ ___ ___ ___| |_   | |_ ___| |_ ");
	    console.log("magenta", " | . |_| |_|  _| . |  |  _| -_| . | . |  _|  _|  | . | . |  _|");
	    console.log("magenta", " |___|_____|_| |___|  |_| |___|  _|___|_| |_|    |___|___|_|  ");
	    console.log("magenta", "                              |_|                             ");
	    console.log("white", " ᴠᴇʀsɪᴏɴ 2.4.0    @ᴄᴏᴅsᴇᴄ    ʟᴀᴛᴇsᴛ ᴜᴘᴅᴀᴛᴇ: 12/07/2019");
	console.log("white", "\n [!] Loading...");
	try {
		let package = require("./package.json");



		let res = await helper.GetLatestVersion().catch(console.error);

		if (package.version !== res) {
			let repoURL = package.repository.url.split(".");
			repoURL.pop();
			await new Promise(p => setTimeout(p, 8000));
		} else {
			console.log("green", "[!] online");
		}
	} catch (err) {
		console.error(err);
		console.log("red", "Failed to check for updates");
	}

	let foundProtobufs = helper.verifyProtobufs();
	if (foundProtobufs && !isNewVersion) {
	} else {
		await helper.downloadProtobufs(__dirname);
	}

	console.log("yellow", "[!] Getting data...");
	db = await sqlite.open("./accounts.sqlite");

	await Promise.all([
		db.run("CREATE TABLE IF NOT EXISTS \"accounts\" (\"username\" TEXT NOT NULL UNIQUE, \"password\" TEXT NOT NULL, \"sharedSecret\" TEXT, \"lastCommend\" INTEGER NOT NULL DEFAULT -1, \"operational\" NUMERIC NOT NULL DEFAULT 1, PRIMARY KEY(\"username\"))"),
		db.run("CREATE TABLE IF NOT EXISTS \"commended\" (\"username\" TEXT NOT NULL REFERENCES accounts(username), \"commended\" INTEGER NOT NULL, \"timestamp\" INTEGER NOT NULL)")
	]);

	let amount = await db.get("SELECT COUNT(*) FROM accounts WHERE operational = 1;");
	
	if (amount["COUNT(*)"] < totalNeeded) {
		console.log("red", "[!] Not enough accounts available, got " + amount["COUNT(*)"] + "/" + totalNeeded);
		return;
	}

	let targetAcc = undefined;
	let serverToUse = undefined;
	let matchID = config.matchID;

	if (config.method.toUpperCase() === "LOGIN") {
		serverToUse = (await helper.GetActiveServer()).shift().steamid;

		targetAcc = new Target(config.account.username, config.account.password, config.account.sharedSecret);
		await targetAcc.login();
	} else if (config.method.toUpperCase() === "SERVER") {

		targetAcc = (await helper.parseSteamID(config.target)).accountid;
	}

	let accountsToUse = await db.all("SELECT accounts.username, accounts.password, accounts.sharedSecret FROM accounts LEFT JOIN commended ON commended.username = accounts.username WHERE accounts.username NOT IN (SELECT username FROM commended WHERE commended = " + (typeof targetAcc === "object" ? targetAcc.accountid : targetAcc) + " OR commended.username IS NULL) AND (" + Date.now() + " - accounts.lastCommend) >= " + config.cooldown + " AND accounts.operational = 1 GROUP BY accounts.username LIMIT " + totalNeeded);
	if (accountsToUse.length < totalNeeded) {
		console.log("red", "Not enough accounts available, got " + accountsToUse.length + "/" + totalNeeded);

		if (targetAcc instanceof Target) {
			targetAcc.logOff();
		}

		await db.close();
		return;
	}

	// Inject what to commend with in our accounts
	if (config.type.toUpperCase() === "REPORT") {
		for (let i = 0; i < accountsToUse.length; i++) {
			let chosen = accountsToUse.filter(a => typeof a.report === "object").length;

			accountsToUse[i].report = {
				rpt_aimbot: config.report.aimbot > chosen ? true : false,
				rpt_wallhack: config.report.wallhack > chosen ? true : false,
				rpt_speedhack: config.report.speedhack > chosen ? true : false,
				rpt_teamharm: config.report.teamharm > chosen ? true : false,
				rpt_textabuse: config.report.textabuse > chosen ? true : false,
				rpt_voiceabuse: config.report.voiceabuse > chosen ? true : false
			}
		}
	} else {
		for (let i = 0; i < accountsToUse.length; i++) {
			let chosen = accountsToUse.filter(a => typeof a.commend === "object").length;

			accountsToUse[i].commend = {
				friendly: config.commend.friendly > chosen ? true : false,
				teaching: config.commend.teaching > chosen ? true : false,
				leader: config.commend.leader > chosen ? true : false
			}
		}
	}

	
	let chunks = helper.chunkArray(accountsToUse, config.perChunk);

	if (config.method.toUpperCase() === "LOGIN") {

		serverToUse = (await helper.GetActiveServer()).shift().steamid;

		targetAcc.setGamesPlayed(serverToUse);
	} else if (config.method.toUpperCase() === "SERVER") {

		if (config.serverID.toUpperCase() !== "AUTO") {
			serverToUse = await helper.parseServerID(config.serverID).catch(console.error);
			if (!serverToUse) {

				if (targetAcc instanceof Target) {
					targetAcc.logOff();
				}

				await db.close();
				return;
			}

			console.log(colors.cyan + " [" + colors.white + "!" + colors.cyan + "]" + colors.white + " Targeted Server is: " + colors.cyan + serverToUse);
		}

		if (config.serverID.toUpperCase() === "AUTO" || config.matchID.toUpperCase() === "AUTO") {
			let fetcher = new Account(config.fetcher.askSteamGuard);
			await fetcher.login(config.fetcher.username, config.fetcher.password, config.fetcher.sharedSecret);

			console.log("blue", "Trying to fetch target " + config.fetcher.maxTries + " time" + (config.fetcher.maxTries === 1 ? "" : "s") + " with a delay of " + config.fetcher.tryDelay + "ms");

			let tries = 0;
			if (config.serverID.toUpperCase() === "AUTO") {
				while (!serverToUse) {
					tries++;

					if (tries > config.fetcher.maxTries) {
						console.log("red", "Failed to find server after " + tries + " tr" + (tries === 1 ? "y" : "ies"));
						break;
					}

					serverToUse = await fetcher.getTargetServer(targetAcc).catch((err) => {
						if (err.message) {
							console.log("red", err.message);
						} else {
							console.error(err);
						}
					});

					if (!serverToUse) {
						/*serverToUse = await fetcher.getTargetServerValve(targetAcc).catch((err) => {
							if (err.message) {
								console.log("red", err.message);
							} else {
								console.error(err);
							}
						});*/

						await new Promise(p => setTimeout(p, config.fetcher.tryDelay));
					}
				}

				if (!serverToUse) {
					await db.close();
					return;
				}

				console.log("green", "Found target on " + (serverToUse.isValve ? "Valve" : "Community") + " server " + serverToUse.serverID + " after " + tries + " tr" + (tries === 1 ? "y" : "ies") + " " + (serverToUse.isValve ? "" : ("(" + serverToUse.serverIP + ")")));
				serverToUse = serverToUse.serverID;
			}

			tries = 0;
			let matchIDFind = null;
			if (config.matchID.toUpperCase() === "AUTO") {
				while (!matchIDFind) {
					tries++;

					if (tries > config.fetcher.maxTries) {
						console.log("red", "Failed to find server after " + tries + " tr" + (tries === 1 ? "y" : "ies"));
						break;
					}

					matchIDFind = await fetcher.getTargetServerValve(targetAcc).catch((err) => {
						if (err.message) {
							console.log("red", err.message);
						} else {
							console.error(err);
						}
					});

					if (!matchIDFind) {
						await new Promise(p => setTimeout(p, config.fetcher.tryDelay));
					}
				}

				if (!matchIDFind) {
					await db.close();
					return;
				}

				matchID = matchIDFind.matchID || matchID;
				console.log("green", "Found target on match " + matchID);
			}

			fetcher.logOff();
		}
	}

	let info = await helper.getServerInfo(serverToUse).catch((err) => {
		console.log("red", err.message === "Invalid Server" ? "Server is no longer available" : err);
	});
	if (!info) {
		if (targetAcc instanceof Target) {
			targetAcc.logOff();
		}

		await db.close();
		return;
	}

	for (let i = 0; i < chunks.length; i++) {
		console.log("white", "\n[!] Wait this may take a few seconds...");
        await new Promise(p => setTimeout(p, 3000));
        console.log("white", "\n[!] Please Wait, signing In to Steam and Connecting to GC...\n");
        // opens the url in the default browser 
		opn('https://discord.gg/X7DfSsm');
		// Do commends
		let result = await handleChunk(chunks[i], (targetAcc instanceof Target ? targetAcc.accountid : targetAcc), serverToUse, matchID);

		totalSuccess += result.success.length;
		totalFail += result.error.length;

		console.log(colors.yellow + "[!]" + colors.white + " FINISHED");

		// Wait a little bit and relog target if needed
		if ((i + 1) < chunks.length) {
			console.log("yellow", "Waiting " + config.betweenChunks + "ms...");
			await new Promise(r => setTimeout(r, config.betweenChunks));
		}
	}

	// We are done here!
	if (targetAcc instanceof Target) {
		targetAcc.logOff();
	}

	await db.close();
	console.log(colors.green + "Successful: " + totalSuccess + colors.white + " // " + colors.red + "Failed: " + totalFail);

	// Force exit the process if it doesn't happen automatically within 15 seconds
	setTimeout(process.exit, 15000, 1).unref();
})();

function handleChunk(chunk, toCommend, serverSteamID, matchID) {
	return new Promise(async (resolve, reject) => {
		let child = ChildProcess.fork("./Bots.js", [], {
			cwd: path.join(__dirname, "helpers"),
			execArgv: process.execArgv.join(" ").includes("--inspect") ? ["--inspect=0"] : []
		});

		child.on("error", console.error);

		let res = {
			success: [],
			error: []
		};

		child.on("message", async (msg) => {
			if (msg.type === "ready") {
				if (config.type.toUpperCase() === "COMMEND") {
					child.send({
						isCommend: true,
						isReport: false,

						chunk: chunk,
						toCommend: toCommend,
						serverSteamID: serverSteamID,
						matchID: matchID
					});
				} else {
					child.send({
						isCommend: false,
						isReport: true,

						chunk: chunk,
						toReport: toCommend /* Variable is named "toCommend" but its just the account ID so whatever */,
						serverSteamID: serverSteamID,
						matchID: matchID
					});
				}
				return;
			}

			if (msg.type === "error") {
				console.error("The child has exited due to an error", msg.error);
				return;
			}


			if (msg.type === "commended" || msg.type === "reported") {
				await db.run("UPDATE accounts SET lastCommend = " + Date.now() + " WHERE username = \"" + msg.username + "\"").catch(() => { });

				if (msg.response.response_result === 2 && msg.type === "commended") {
					// Already commended
					res.error.push(msg.response);

					console.log("red", "[" + msg.username + "] Got response code " + msg.response.response_result + ", already commended target (" + (res.error.length + res.success.length) + "/" + chunk.length + ")");

					await db.run("INSERT INTO commended (username, commended, timestamp) VALUES (\"" + msg.username + "\", " + toCommend + ", " + Date.now() + ")").catch(() => { });
					return;
				}

				if (msg.response.response_result === 1) {
					// Success commend
					res.success.push(msg.response);

					if (msg.type === "commended") {
						console.log("green", "[" + msg.username + "] Successfully sent a commend with response code " + msg.response.response_result + " - Remaining Commends: " + msg.response.tokens + " (" + (res.error.length + res.success.length) + "/" + chunk.length + ")");
					} else {
						console.log(colors.white + "[" + colors.magenta + "b1rd-rbot" + colors.white + "] " + colors.white + msg.username + colors.black + " Report submitted successfully" + colors.black + " - " + colors.green + msg.confirmation + colors.black + " - " + colors.green + (res.error.length + res.success.length) + colors.black +"/" + colors.green + chunk.length + "");
					}
					
					await db.run("INSERT INTO commended (username, commended, timestamp) VALUES (\"" + msg.username + "\", " + toCommend + ", " + Date.now() + ")").catch(() => { });

					return;
				}

				// Unknown response code
				res.error.push(msg.response);

				console.log("red", "[" + msg.username + "] " + (config.type.toUpperCase() === "REPORT" ? "Reported" : "Commended") + " but got invalid success code " + msg.response.response_result + " (" + (res.error.length + res.success.length) + "/" + chunk.length + ")");
				return;
			}

			if (msg.type === "commendErr" || msg.type === "reportErr") {
				res.error.push(msg.error);

				console.log("red", "[" + msg.username + "] Failed to " + (config.type.toUpperCase() === "REPORT" ? "report" : "commend") + " (" + (res.error.length + res.success.length) + "/" + chunk.length + ")");

				await db.run("UPDATE accounts SET lastCommend = " + Date.now() + " WHERE username = \"" + msg.username + "\"").catch(() => { });
				return;
			}

			if (msg.type === "failLogin") {
				res.error.push(msg.error);

				let ignoreCodes = [
					SteamUser.EResult.Fail,
					SteamUser.EResult.InvalidPassword,
					SteamUser.EResult.AccessDenied,
					SteamUser.EResult.Banned,
					SteamUser.EResult.AccountNotFound,
					SteamUser.EResult.Suspended,
					SteamUser.EResult.AccountLockedDown,
					SteamUser.EResult.IPBanned
				];

				if (typeof msg.error.eresult === "number" && !ignoreCodes.includes(msg.error.eresult)) {
					console.log("red", "[" + msg.username + "] Failed to login (" + (res.error.length + res.success.length) + "/" + chunk.length + ")", msg.error);
				} else if (msg.error && msg.error.message === "Steam Guard required") {
					console.log("red", "[" + msg.username + "] Requires a Steam Guard code and has been marked as invalid (" + (res.error.length + res.success.length) + "/" + chunk.length + ")", msg.error);
					await db.run("UPDATE accounts SET operational = 0 WHERE \"username\" = \"" + msg.username + "\"");
				} else if (msg.error && msg.error.message === "VAC Banned") {
					console.log("red", "[" + msg.username + "] Has been VAC banned in CSGO and has been marked as invalid (" + (res.error.length + res.success.length) + "/" + chunk.length + ")", msg.error);
					await db.run("UPDATE accounts SET operational = 0 WHERE \"username\" = \"" + msg.username + "\"");
				} else {
					console.log("red", "[" + msg.username + "] Failed to login and has been marked as invalid (" + (res.error.length + res.success.length) + "/" + chunk.length + ")", msg.error);
					await db.run("UPDATE accounts SET operational = 0 WHERE \"username\" = \"" + msg.username + "\"");
				}
				return;
			}
		});

		child.on("exit", () => {
			resolve(res);
		});
	});
}
