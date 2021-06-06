import { Client, Message } from "discord.js";
import { Command } from "../../types/Command";
import { postRandomImageByTag } from "../../utils";

class Death extends Command {
	constructor(obj: any) {
		super(obj);
	}

	execute(_client: Client, message: Message, _args: Array<string>): void {
		postRandomImageByTag(message, "death");
	}
}

const death: Command = new Death({
	name: "death",
	aliases: [],
	description: "Post an image of anime death.",
	defaultAccess: 1,
	parent: "",
	syntax: "death",
	category: "Image",
	subcategory: "Pictures",
	examples: [
		{
			description: "Post image of death",
			code: `death`,
		},
	],
});

export default death;
