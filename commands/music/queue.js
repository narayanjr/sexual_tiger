const path       = require("path");
const DAL        = require(path.resolve("dal.js"));
const asciitable = require("asciitable");

let options = {
	skinny               : true,
	intersectionCharacter: "+",
	columns              : [
		{field: "song_id", name: "ID"},
		{field: "name", name: "Name"},
		{field: "num_plays", name: "plays"}
	]
};

module.exports = {
	name          : "queue",
	aliases       : [],
	description   : "Queue a song by name or ID.  If a number is specified an ID lookup is assumed.  Otherwise a search is performed for the entered value.  If an exact match or only 1 close match is found the clip is played.  Otherwise a list of options is displayed.",
	default_access: 1,
	args          : false,
	usage         : "",
	parent        : "",
	category      : ["Music", "General"],
	execute(message, args) {
		let end    = global.metrics.summaries.labels("queue").startTimer();
		let server = global.servers[message.guild.id];
		let vc     = message.member.voice.channel;

		if (vc === null) {
			return message.channel.send("You must be in a Voice Channel, I'm not gonna play this shit for no one.");
		}

		if (args.length <= 0) {
			if (server.song_queue.length) {
				message.channel.send(asciitable(options, server.song_queue), {code: true});
				return message.channel.send("If you wish to add a song to the queue, add the name or id after the queue command.");
			} else {
				return message.channel.send("There are no songs in the queue.");
			}
		}

		let song_identifier = args.join(" ");
		let found_song      = undefined;
		let {err, song}     = DAL.findSongByIdentifier(song_identifier);

		if (err) {
			return message.channel.send("An error occured while searching for song.");
		} else if (song === undefined) {
			let {err: err_s, songs} = DAL.searchForSongs(song_identifier, 15);
			if (err_s) {
				return message.channel.send("We crashed while searching for similar songs.");
			} else if (songs === undefined || songs.length === 0) {
				return message.channel.send("There is no song by that name/id, and couldnt find any close matches.");
			} else if (songs.length === 1) {
				message.channel.send(`Playing closest match. ID: ${songs[0].song_id}  Name: ${songs[0].name}`);
				found_song = songs[0];
			} else {
				message.channel.send("That song didnt exist and we found several close matches. Pick one to play.");
				return message.channel.send(asciitable(options, songs), {code: true, split: true});
			}
		} else {
			found_song = song;
		}

		server.song_queue.push(found_song);
		end();
	}
};