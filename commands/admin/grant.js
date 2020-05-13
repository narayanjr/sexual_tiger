const path = require("path");
const DAL  = require(path.resolve("dal.js"));

module.exports = {
	name          : "grant",
	aliases       : [],
	description   : "Grant a user access to a specific command.",
	default_access: 0,
	args          : true,
	usage         : "[@User] [Command]",
	parent        : "",
	category      : ["Admin", "Auth"],
	execute(message, args) {
		let end             = global.metrics.summaries.labels("admin_grant").startTimer();
		let server          = global.servers[message.guild.id];
		let secure_commands = ["revoke", "grant"];

		let arg_string  = message.content.slice(6).trim(); //Chop off $grant
		let user        = arg_string.substr(0, arg_string.indexOf(" ")).slice(3, -1);
		let str_command = arg_string.substr(arg_string.indexOf(" ") + 1);

		if (!arg_string || !user || !str_command) {
			end();
			return message.channel.send("You must provide a user and command.");
		}

		let {err, command} = DAL.findCommandByName(str_command);

		if (command === undefined) {
			end();
			return message.channel.send(`${str_command} is not a valid command.`);
		} else {
			let user_is_super_admin = server.super_admins.includes(user);

			if (secure_commands.includes(command.command) && !user_is_super_admin) {
				end();
				return message.channel.send("You are not allowed to grant/revoke as a non super admin.");
			}

			let {find_err, access} = DAL.findAccessByUserIdAndCommand(user, command.command);

			if (find_err) {
				console.log("Failed to find access for a command during grant, oops");
				console.log(find_err);
			}
			if (access && access.is_allowed) {
				end();
				return message.channel.send(`That user already has access to the command, ${command.command}`);
			}
			let {grant_err, result} = DAL.grantAccessByUserIdAndCommand(user, command.command, message.author.id);

			if (grant_err) {
				console.log(grant_err);
				end();
				return message.channel.send(`Something went wrong Error: ${grant_err}`);
			} else {
				end();
				return message.channel.send(`That user has been granted access to the command, ${command.command}`);
			}
		}
	}
};