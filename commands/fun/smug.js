const path = require("path");
const UTIL = require(path.resolve("utils.js"));

module.exports = {
	name          : "smug",
	aliases       : [],
	description   : "Post an image of anime smug.",
	default_access: 1,
	args          : false,
	usage         : "",
	parent        : "",
	category      : ["Image", "Pictures"],
	execute(client, message, args) {
		let end = global.metrics.summaries.labels("smug").startTimer();
		UTIL.postRandomImageByTag(message, "smug");
		end();
	}
};