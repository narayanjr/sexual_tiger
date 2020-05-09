exports.run = (client, message, args) => {
    let vc = message.member.voice.channel

    if(vc === undefined || vc == null) {
        return message.channel.send("I'm not even in a channel.")
    }

    var server = global.servers[message.guild.id];
    let promise = server.connectionPromise

    if(promise === null) {
        return message.channel.send("No audio is playing.  You must be hearing things.")
    }
    
    promise.then(connection => {
        if (connection.dispatcher != null) {
            current_volume = connection.dispatcher.volume;
        }
        message.channel.send(`Current Volume: ${current_volume*100}%`)
    }).catch(reason => {
        console.log(reason)
    });
}

exports.help = () =>{
    return "Displays the current volume. Not like you couldn't tell though.";
};

exports.docs = () => {
    let docs = {
        default_access: 1,
        tab: "music",
        link: "general",
        parent: "",
        full_command: "volume",
        command: "volume",
        description: "Display the current volume the bot is set to.",
        syntax: "volume",
        examples: [
            {
                description: "Display current volume",
                code: "volume"
            }
        ]
    }
    return docs;
};