const path                       = require("path");
const fs                         = require("fs");
const Discord                    = require("discord.js");
const auth                       = require(path.resolve("auth.json"));
const config                     = require(path.resolve("configure.json"));
const UTIL                       = require(path.resolve("utils.js"));
const client                     = new Discord.Client();
const default_metrics            = require("prom-client").collectDefaultMetrics;
const {register, Summary, Gauge} = require("prom-client");
const express                    = require("express");

global.servers          = {};
global.commandTypes     = ["admin", "fun", "misc", "music"];
global.commandTypeDesc  = {
	"admin": "Admin controls to assist in maintaining the bot.",
	"fun"  : "Random shit that lets you express yourself.",
	"misc" : "Random shit that may or may not be worth using",
	"music": "Lets you play music and interact with music things"
};
global.commandTypeColor = {
	"admin": 13632027,
	"fun"  : 12390624,
	"misc" : 1,
	"music": 5301186
};
global.audio_dirs       = {
	"tmp"     : path.resolve("audio", "tmp"),
	"hashed"  : path.resolve("audio", "hashed"),
	"stored"  : path.resolve("audio", "stored"),
	"uploaded": path.resolve("audio", "uploaded")
};

global.image_dirs = {
	"tmp"   : path.resolve("images", "tmp"),
	"hashed": path.resolve("images", "hashed"),
	"trash" : path.resolve("images", "trash")
};

global.metrics = {
	registry : default_metrics({
		prefix : "sexual_",
		timeout: 10000
	}),
	summaries: new Summary({
		name      : "sexual_command_usage",
		help      : "Summary of the usage of the commands in the bot",
		labelNames: ["command"]
	}),
	uptime   : new Gauge({
		name: "sexual_uptime",
		help: "The uptime of the bot"
	})
};

global.img_resp_to_tag         = {};
global.img_resp_to_tag_order   = [];
global.img_resp_to_tag_max_len = 100;
global.clip_length             = 30;

//Array of directories required for bot to operate, make sure all parent directories appear before sub directories in list. IE: make sure audio exists, before trying to make audio/hashed
let required_folders = [
	path.resolve("audio"),
	path.resolve("audio", "tmp"),
	path.resolve("audio", "hashed"),
	path.resolve("audio", "stored"),
	path.resolve("audio", "uploaded"),
	path.resolve("images"),
	path.resolve("images", "tmp"),
	path.resolve("images", "hashed"),
	path.resolve("images", "trash")
];
//Loop the array of required folders and create any missing ones.
required_folders.forEach(function (dir) {
	if (!fs.existsSync(dir)) {
		console.log(`Created missing directory: ${dir}`);
		fs.mkdirSync(dir);
	}
});

//Update the command table incase any new commands were added or a default access has been changed.
//UTIL.updateCommandList();

client.on("ready", () => {
	console.log("I am ready!");
	client.user.setActivity("pick up sticks.");

	//Init servers array
	client.guilds.cache.keyArray().forEach(server_id => {
		global.servers[server_id] = {
			repeat           : false,
			current_song     : {},
			maintain_presence: false,
			connectionPromise: null,
			dispatcher       : null,
			default_volume   : .125,
			volume           : .125,
			max_volume       : 1,
			clip_volume      : .75,
			super_admins     : ["231574835694796801", "183388696207294465", "231606224909500418"],
			song_queue       : [],
			shuffle          : false
		};
	});
});

client.commands = new Discord.Collection();
client.aliases  = new Discord.Collection();

function verifyCommandObject(file_path) {
	let command  = require(`./${file_path}`);
	let errors   = "";
	let is_valid = true;

	if (command.name === undefined || command.name === null || command.name.trim() === "") {
		errors += `name cant not equal ${command.name}\n`;
		is_valid = false;
	}
	if (command.description === undefined || command.description === null || command.description.trim() === "") {
		errors += `description cant not equal ${command.name}\n`;
		is_valid = false;
	}
	if (command.default_access === undefined || command.default_access === null) {
		errors += `default_access cant not equal ${command.name}\n`;
		is_valid = false;
	}
	if (command.args !== true && command.args !== false) {
		errors += `args cant not equal ${command.name}\n`;
		is_valid = false;
	}
	if (!is_valid) {
		console.log(`The command defined in, ${file_path} is invalid and will not be loaded for the following reason:`);
		console.log(errors);
	}

	return is_valid ? command : undefined;
}

function walk(dir, callback) {
	fs.readdir(dir, function (err, files) {
		if (err) throw err;

		files.forEach(file => {
			let file_path = path.join(dir, file);
			fs.stat(file_path, (err, stats) => {
				if (stats.isDirectory()) {
					walk(file_path, callback);
				} else if (stats.isFile() && file.endsWith(".js")) {
					let command = verifyCommandObject(file_path);

					if (command) {
						let full_command_str = `${command.parent} ${command.name}`.trim();
						client.commands.set(full_command_str, command);

						command.aliases.forEach(alias => {
							if (client.aliases.has(alias)) {
								let existing_command          = client.aliases.get(alias);
								let existing_full_command_str = `${existing_command.parent} ${existing_command.name}`.trim();
								throw new Error(`Two commands have the same alias. *${existing_full_command_str}* and *${full_command_str}* both specify an Alias: ${alias}.`);
							}
							client.aliases.set(alias, command);
						});
					}
				}
			});
		});
	});
}

//Load up all the commands
walk("./commands/");

function determineCommand(message, max_length) {
	let args = message.content.slice(config.prefix.length).split(/ +/);

	let command_parts,
		remaining_args = [];

	if (args.length > max_length) {
		command_parts  = args.slice(0, max_length);
		remaining_args = args.slice(max_length);
	} else {
		command_parts = args;
	}

	let command;
	do {
		let command_name = command_parts.join(" ");
		command          = client.commands.get(command_name) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(command_name));
		if (!command) {
			remaining_args.unshift(command_parts.pop());
		}
	} while (!command && command_parts.length);

	return {command: command, args: remaining_args};
}

client.on("message", message => {
	if (!message.content.startsWith(config.prefix) || message.author.bot) return;

	let {command, args} = determineCommand(message, 2);

	if (command.args && !args.length) {
		return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
	}

	try {
		let isAllowed = UTIL.isUserActionAllowed(message.author, command);

		if (isAllowed) {
			command.execute(client, message, args);
		} else {
			message.channel.send(`${user}, you do not have permission to use this command.`);
		}


	} catch (error) {
		console.error(error);
		message.reply("there was an error trying to execute that command!");
	}
});

// Create an event listener for new guild members
client.on("guildMemberAdd", member => {
	// Send the message to a designated channel on a server:
	const channel = member.guild.channels.find("name", "general");
	// Do nothing if the channel wasn't found on this server
	if (!channel) return;
	// Send the message, mentioning the member
	channel.send(`Welcome to the server, ${member}`);
});

client.login(auth.token);

const server = express();
server.get("/metrics", (req, res) => {
	res.set("Content-Type", register.contentType);
	res.end(register.metrics());
});
const port = process.env.PORT || 3001;
console.log(
	`Server listening to ${port}, metrics exposed on /metrics endpoint`
);
server.listen(port);

setInterval(() => {
	global.metrics.uptime.set(client.uptime);
}, 10000);