import { exec } from "child_process";
import { GuildMember, Message, Permissions, User, VoiceChannel } from "discord.js";
import { readFileSync, rename, statSync, unlink, writeFile } from "fs";
import md5 from "md5";
import probe from "node-ffprobe";
import { basename, extname, resolve } from "path";
import * as DAL from "./dal";
import { Command } from "./types/Command";
import { CustomNodeJsGlobal } from "./types/CustomNodeJsGlobal";
import { Server } from "./types/Server";

declare const global: CustomNodeJsGlobal;

export function isInt(value: string): boolean {
	const er = /^-?[0-9]+$/;
	return er.test(value);
}

export function isAdmin(member: GuildMember): boolean {
	return member.hasPermission(Permissions.FLAGS.ADMINISTRATOR);
}

export async function playAudio(voice_channel: VoiceChannel) {
	const server_id = voice_channel.guild.id;
	const server = global.servers[server_id];

	server.connectionPromise = voice_channel.join();

	//If there is a song playing, replay it. If not grab the first one off the list.

	if (!server.repeat || !server.current_song) {
		server.current_song = server.song_queue.shift();
	} else {
		//A song is already playing, just leave current song alone, it will repeat.
	}

	const volume = server.current_song && server.current_song.is_clip ? server.clip_volume : server.volume;

	server.connectionPromise
		.then((connection) => {
			const dispatcher = connection.play(resolve(global.audio_dirs["hashed"], `${server.current_song.hash_id}.mp3`), { volume: 1 });

			dispatcher.setVolume(volume);

			dispatcher.on("start", () => {
				DAL.incrementNumPlays(server.current_song.song_id);
			});

			dispatcher.on("finish", () => {
				if (server.song_queue.length !== 0 || server.repeat) {
					playAudio(voice_channel);
				} else if (!server.maintain_presence) {
					server.current_song = undefined;
					connection.disconnect();
				}
			});
		})
		.catch((reason) => {
			console.log(reason);
		});
}

export function playUrl(url: string, voice_channel: VoiceChannel) {
	const server: Server = global.servers[voice_channel.guild.id];
	server.connectionPromise
		.then((connection) => {
			const dispatcher = connection.play(url, { volume: 1 });
			dispatcher.setVolume(server.clip_volume);

			dispatcher.on("finish", () => {
				if (!server.maintain_presence) {
					server.current_song = undefined;
					connection.disconnect();
				}
			});
		})
		.catch((reason) => {
			console.log(reason);
		});
}

export function processAudioFileTask(t_obj: any, cb: any): void {
	return processAudioFile(t_obj.file_path, t_obj.url, t_obj.message, cb);
}
export function deleteFile(file_path: string): void {
	unlink(file_path, function(err) {
		if (err) {
			console.log(`Failed to delete file. ${file_path}`);
			console.log(err);
		}
	});
}
export function processAudioFile(file_path: string, url: string, message: Message, cb: any): void {
	const hashed_audio_path = global.audio_dirs["hashed"];
	const stored_audio_path = global.audio_dirs["stored"];
	console.log(`FP: ${file_path})`);

	const file_name = basename(file_path);

	console.log(`Started Processing file, ${file_name}`);
	message.channel.send(`Starting to process file: ${file_name}, I'll let you know when its ready.`);

	const file_hash = md5(readFileSync(file_path));
	const cleaned_file_name = file_name
		.replace(/\.[^/.]+$/, "")
		.replace(/[_-]/g, " ")
		.replace(/ +/g, " "); //Strip off extention, replace underscore and hypen with space, reduce more than 2 spaces to 1
	const new_file_name = file_hash + ".mp3";

	const hashed_file_path = resolve(hashed_audio_path, new_file_name);
	const stored_file_path = resolve(stored_audio_path, `${cleaned_file_name}-${file_hash}`);

	const { err, song } = DAL.findSongByHashId(file_hash);

	if (err) {
		console.log("Oops?");
		console.log(err);
	} else if (song !== undefined) {
		deleteFile(file_path);
		cb(new Error(`The given file already exists on the server by name, ${song.name}`), undefined);
		return;
	}

	exec(`nice ffmpeg-normalize "${file_path}" -c:a libmp3lame -ofmt mp3 -ext mp3 -o ${hashed_file_path} -f -t -20`, (err, stdout, stderr) => {
		if (err) {
			// node couldn't execute the command
			if (err.message.indexOf("Invalid data found") == -1) {
				//Only output error if we dont know why it happened.
				console.log("Couldnt run command");
				console.log(err);
			}
			deleteFile(file_path);
			cb(new Error(`Failed to run ffmpeg-normalize. ${err.message}`), undefined);
		} else {
			const { err, info } = DAL.insertIntoSongs(file_hash, cleaned_file_name, stored_file_path, url, message.author.id);

			if (err) {
				console.log(err);
				cb(new Error(`Failed to run insert song into DB. ${err.message}`), undefined);
			} else {
				probe_audio_file(file_hash);

				const err = generateAudioList();
				if (err) {
					message.channel.send("Failed to update audio list after adding a new song.");
					message.channel.send(err.err.message);
				}
				rename(file_path, stored_file_path, (err) => {
					if (err) {
						console.log(`Failed to move file, ${file_path} to ${stored_file_path}`);
						console.log(err);
					}
				});
				cb(undefined, `The song ID: ${info.lastInsertRowid}  Name: ${cleaned_file_name} has been added, You're the DJ ${message.author.username}!`);
			}
		}
	});
}

export function processImageFile(file_path, tag_names, user_id) {
	let hashed_image_path = global.image_dirs.hashed;
	let ext = extname(file_path).replace(/\?.*$/, "");
	let tag_id = -1;

	if (ext === "" || ext === "." || ext.length > 5) ext = ".gif";

	let file_hash = md5(readFileSync(file_path));
	let new_file_name = file_hash + ext;
	let hashed_file_path = resolve(hashed_image_path, new_file_name);

	//Check if the tags passed in exist.
	let { err: v_err, tags } = verifyTags(tag_names);
	if (v_err && tags === undefined) {
		console.log(v_err);
		return v_err;
	} else if (v_err && tags !== undefined) {
		//At least one of the tags didnt exist.
		return new Error(`The following tags do not exist. ${tags.join(", ")}`);
	} //All tags are valid, lets just move on.

	let image_id = undefined;
	let { err, image } = DAL.findImageByHashId(file_hash);

	if (err) {
		console.log(err);
	} else if (image !== undefined) {
		unlink(file_path, function(err3) {
			if (err3) {
				console.log("Failed to delete duplicate file.");
				console.log(err3);
			}
		});
		image_id = image.image_id;
	}

	if (image_id === undefined) {
		let { err: err_i, info } = DAL.insertIntoImages(file_hash, ext, user_id);

		if (err_i) {
			console.log(err_i);
			return new Error(`Error while inserting image.`);
		} else {
			rename(file_path, hashed_file_path, (err) => {
				if (err) {
					console.log(`Failed to move file, ${file_path} to ${hashed_file_path}`);
					console.log(err);
				}
			});
			image_id = info.lastInsertRowid;
		}
	}

	if (image_id === undefined) {
		return Error(`Failed to add image to DB.`);
	} else {
		let tag_ids = tags.map(function(tag) {
			return tag["tag_id"];
		});
		let { err: it_err, info: it_info } = DAL.insertIntoImageTag([image_id], tag_ids);
		if (it_err) {
			return Error(`Failed to create relationship between Image: ${it_info.lastInsertRowid} and Tag: ${tag_id}`);
		}
	}
}

export function verifyTags(tag_names) {
	let { err, tags } = DAL.findTagsByNames(tag_names);
	if (err) {
		console.log(err);
		return { err: new Error("Crashed while verifying tags."), tags: undefined };
	} else if (tag_names.length !== tags.length) {
		//At least one of the tags didnt exist.
		var found_tags = tags.map(function(tag) {
			return tag["name"];
		});

		let invalid_tags = tag_names.filter((tag) => !found_tags.includes(tag));
		return { err: new Error(`Invalid tags passed.`), tags: invalid_tags };
	} else {
		return { err: undefined, tags: tags };
	}
}

export function probe_audio_file(file_hash) {
	probe(resolve(global.audio_dirs.hashed, file_hash + ".mp3"), function(err, data) {
		let { err: s_err, song } = DAL.findSongByIdentifier(file_hash);
		if (s_err) {
			console.log("Probe Audio File: Uh oh...");
			console.log(file_hash);
		} else {
			song.duration = Math.ceil(data.streams[0].duration);
			if (song.duration <= global.clip_length) {
				song.is_clip = 1;
			} else {
				song.is_clip = 0;
			}

			DAL.updateSong(song);
		}
	});
}

export function getFileSizeInMegaBytes(file) {
	const stats = statSync(file);
	const file_size_in_bytes = stats.size;
	return file_size_in_bytes / 1000000.0;
}

export function postRandomImageByTag(message, tag_name) {
	const time = process.hrtime();
	const NS_PER_SEC = 1e9;

	let { err: t_err, tag } = DAL.findTagByName(tag_name);
	if (t_err) {
		return message.channel.send("Crashed while finding tag.");
	} else if (tag === undefined) {
		return message.channel.send(`There is no tag with the name. ${tag_name}.`);
	} //Valid tag.

	let { err, image } = DAL.getRandomImageByTag(tag.tag_id);
	if (err) {
		console.log(err);
		message.channel.send("Crashed finding image");
	} else if (image === undefined) {
		message.channel.send(`Couldnt find any images for ${tag.name}.`);
	} else {
		let file = resolve(global.image_dirs.hashed, image.hash_id + image.extension);
		message.channel
			.send("", { files: [file] })
			.then((post) => {
				const diff = process.hrtime(time);
				console.log(`Posted ${(diff[0] * NS_PER_SEC + diff[1]) / 1000000} ms`);
				//Store the posted image message_id to the tag/cmd that was called.  For use in untagging/retagging
				global.img_resp_to_tag[post.id] = tag;
				global.img_resp_to_tag_order.push(post.id);

				if (global.img_resp_to_tag_order.length > global.img_resp_to_tag_max_len) {
					let old_id = global.img_resp_to_tag_order.shift();
					delete global.img_resp_to_tag[old_id];
				}

				const filter = (reaction, user) => {
					return reaction.emoji.name === "❌" && isAdmin(message.guild.members.get(user.id));
				};

				const collector = post.createReactionCollector(filter, { time: 30000 });
				collector.on("collect", (r) => {
					console.log(`Collected ${r.emoji.name}`);

					let attachments = post.attachments.array();
					let hash = attachments[0].filename.replace(/\.[^/.]+$/, ""); //Strip off extention
					let { err, image } = deleteImageByHash(hash);
					if (err) {
						message.channel.send(err.message);
					} else if (image === undefined) {
						message.channel.send("No image to delete");
					} else {
						message.channel.send(`Image: ${image.hash_id}${image.extension}  has been removed.`);
						post.delete();
					}
				});
			})
			.catch(console.error);
	}
}

//{err: Error, image: {}}
export function deleteImageByHash(hash) {
	let { err, image } = DAL.findImageByHashId(hash);
	if (err) {
		console.log(err);
		return { err: new Error("Crashed while finding image."), image: undefined };
	} else if (image === undefined) {
		return { err: undefined, image: undefined }; //no image
	} else {
		let { err: d_err, info } = DAL.deleteImageById(image.image_id);
		if (d_err) {
			console.log(d_err);
			return { err: new Error("Crashed while deleting image."), image: undefined }; //no image
		} else if (info.changes === 0) {
			return { err: new Error("There was no image with that hash."), image: undefined }; //no image
		} else {
			let file_path = resolve(global.image_dirs.hashed, image.hash_id + image.extension);
			let trash_path = resolve(global.image_dirs.trash, image.hash_id + image.extension);
			rename(file_path, trash_path, (err) => {
				if (err) {
					console.log(`Failed to move deleted image, ${file_path} to ${trash_path}`);
					console.log(err);
				}
			});
			return { err: undefined, image: image };
		}
	}
}

export function isUserActionAllowed(user: User, command: Command, server_id: string): boolean {
	let server = global.servers[server_id];
	if (server.super_admins.includes(user.id)) {
		//Super admin, dont bother checking table....
		return true;
	}

	let { _, access } = DAL.findAccessByUserIdAndCommand(user.id, (command.parent + " " + command.name).trim());

	if (access === undefined) {
		//This user is missing permissions, lets set them.
		DAL.initUserAccess(user.id);
	}

	if (access) {
		//User has an access entry for this command.
		return access.is_allowed === 1;
	} else {
		// User has no access entry, rely on default restriction.
		return command.defaultAccess === 1; //Return true if command is not restricted
	}
}

export function generateAudioList() {
	let { err, songs } = DAL.getSongListData();

	if (err) {
		console.log(err);
		return { err: new Error("Crashed while finding image."), image: undefined };
	} else {
		try {
			writeFile("/var/www/html/data.json", JSON.stringify(songs), function(err) {
				if (err) {
					console.log(err);
					return { err: new Error("Failed to write updated songs json to website/data.json."), image: undefined };
				}
			});
		} catch (err) {
			console.error(err);
		}
	}
}

export function updateMembersList(members) {
	let members_list = Array();
	members.forEach((val, key) => {
		members_list.push({ member_id: val.id, username: val.user.username });
	});

	DAL.updateMembersList(members_list);
}