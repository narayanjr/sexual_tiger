const path = require("path");
const DAL  = require(path.resolve("dal.js"));
const UTIL = require(path.resolve("utils.js"));

module.exports = {
	name          : "retag",
	aliases       : [],
	description   : "Retag an image in the database.  This will remove the tag that triggered the image in the first place, and add the new tags in its place.",
	default_access: 0,
	args          : true,
	usage         : "[message_id] [...tag_name tag_name tag_name]",
	parent        : "image",
	category      : ["Image", "Image"],
	execute(client, message, args) {
		let end = global.metrics.summaries.labels("image_retag").startTimer();

		if (args.length <= 1) {
			message.channel.send("Must send message id. EX: $image retag [MESSAGE_ID] pout\nTo get message_id, Go to Discord Settings -> Appearance -> Toggle Developer Mode on.\nThen right click image/post and click 'Copy Id'");
		} else {
			const [message_id, ...tag_names] = args;

			//Check if the tags passed in exist.
			let {err: v_err, tags} = UTIL.verifyTags(tag_names);
			if (v_err && tags === undefined) {
				console.log(v_err);
				return v_err;
			} else if (v_err && tags !== undefined) { //At least one of the tags didnt exist.
				return new Error(`The following tags do not exist. ${tags.join(", ")}`);
			} //All tags are valid, lets just move on.

			message.channel.fetchMessage(message_id).then(target_message => {
				let attachment_arr = target_message.attachments.array();
				if (attachment_arr.length === 0) {
					return message.channel.send("That message didnt have any images attached.");
				} else {
					let file_hash    = attachment_arr[0].filename.replace(/\.[^/.]+$/, "");
					let {err, image} = DAL.findImageByHashId(file_hash);

					if (err) {
						message.channel.send("Crashed finding image.");
					} else if (image === undefined) { //No error, but no image, most likely it got deleted but is still in chat.
						message.channel.send("Looks like that image has been deleted.");
					} else {
						let tag                 = global.img_resp_to_tag[message_id];
						let {err: it_err, info} = DAL.deleteFromImageTag(image.image_id, tag.tag_id);

						if (it_err) {
							return message.channel.send("Crashed removing tag from image.");
						} else if (info.changes === 0) {
							return message.channel.send("You can only retag an image once per appearance.  The original tag on that post has already been changed.");
						} else {
							let tag_ids             = tags.map(function (tag) { return tag["tag_id"]; });
							let tag_names           = tags.map(function (tag) { return tag["name"]; });
							let {err: it_err, info} = DAL.insertIntoImageTag([image.image_id], tag_ids);

							if (it_err) {
								return message.channel.send("Crashed adding tags to image.");
							} else {
								return message.channel.send(`${tag.name} removed, ${tag_names.join(", ")} added.`);
							}
						}
					}
				}
			}).catch(console.error);
		}

		end();
	}
};