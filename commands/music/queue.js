const path  = require("path")
const DAL   = require(path.resolve("dal.js"))
const UTIL   = require(path.resolve("utils.js"))
const asciitable = require("asciitable")

var options = {
    skinny: true,
    intersectionCharacter: "+",
    columns: [
        {field: "song_id",  name: "ID"},
        {field: "name",     name: "Name"}
    ],
};

exports.run = (client, message, args) => {
    var server  = global.servers[message.guild.id]
    let vc      = message.member.voice.channel

    if(vc === undefined) {
        return message.channel.send("You must be in a Voice Channel, I'm not gonna play this shit for no one.");
    }

    if(args.length <= 0) {
        return message.channel.send("You forgot to type in a song name.")
    }

    let song_identifier = args.join(" ");
    let found_song      = undefined;
    let {err, song}     = DAL.findSongByIdentifier(song_identifier);

    if(err) {
        return message.channel.send("An error occured while searching for song.")
    } else if (song === undefined) { 
        let {err: err_s, songs} = DAL.searchForSongs(song_identifier, 15)
        if(err_s) {
            return message.channel.send("We crashed while searching for similar songs.")
        } else if(songs === undefined || songs.length === 0) {
            return message.channel.send("There is no song by that name/id, and couldnt find any close matches.")
        } else if (songs.length === 1) {
            message.channel.send(`Playing closest match. ID: ${songs[0].song_id}  Name: ${songs[0].name}`)
            found_song = songs[0];
        } else {
            message.channel.send("That song didnt exist and we found several close matches. Pick one to play.")
            return message.channel.send(asciitable(options, songs),{code:true})
        }
    } else {
        found_song = song;
    }

    let song_request = {
        voice_channel: message.member.voice.channel,
        song: found_song
    }

    server.song_queue.push(song_request);
}

exports.help = () =>{
    return "Queue a specific song.";
};

exports.docs = () => {
    let docs = {
        default_access: 1,
        tab: "music",
        link: "general",
        parent: null,
        full_command: "queue",
        command: "queue",
        description: "Queue a song by name or ID.  If a number is specified an ID lookup is assumed.  Otherwise a search is performed for the entered value.  If an exact match or only 1 close match is found the clip is played.  Otherwise a list of options is displayed.",
        syntax: "$queue [song_identifier]",
        examples: [
            {
                description: "Queue the song 'Wagon Wheel' by name.",
                code: "$queue Wagon Wheel"
            },
            {
                description: "Queue the song 'Wagon Wheel' by name.",
                code: "$queue 1650"
            }
        ]
    }
    return docs;
};