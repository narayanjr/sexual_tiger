import * as UTIL from "../../utils";
import { CustomNodeJsGlobal } from "../../types/CustomNodeJsGlobal"
import { Doc } from "../../types/Doc"
import { Example } from "src/types/Example";
import { Message } from "discord.js";
declare const global: CustomNodeJsGlobal;

exports.run = (client, message: Message, _args) => {
    const end = global.metrics.summaries.labels('whoami').startTimer()
    const author = message.author;
    const member = message.member;

    const is_admin: boolean = UTIL.isAdmin(member);

    const description = `
    User id: ${author.id}
    Username: ${author.username}
    Nickname: ${member.nickname}
    Display Name: ${member.displayName}
    Discriminator: ${author.discriminator}
    On Server: ${message.guild.id}
    isAdmin: ${is_admin}
    `.replace(/\n +/g, `\n`);

    message.channel.send(description);
    end()
}

exports.help = () => {
    return "I don't know. Who are you people?!";
};

exports.docs = () => {
    const doc = new Doc(
        1,
        "Misc",
        "general",
        "",
        "whoami",
        "whoami",
        "Displays some general information about the user.",
        "whoami"
    );
    doc.addExample( new Example("Get info on myself", "whoami"));
    return doc;
};