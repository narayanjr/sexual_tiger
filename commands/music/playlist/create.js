const path = require("path")
const DAL = require(path.resolve("dal.js"))

exports.run = (client, message, args) => {
    
    let name        = args.join(" ");
    if(DAL.isInt(name)) {
        return message.channel.send("Playlist names can not be Integers.  Just because.");
    }
    
    let {err, info} = DAL.createPlaylist(name, message.author.id);
    
    if(err && err.message.indexOf("UNIQUE") > -1) {//Unique constraint error
        message.channel.send(`There is already a Playlist with the name, ${name}`);
    } else if (err) { //Unhandled Error
        console.log(err);
        message.channel.send(`Sorry, ${message.author.username}, it seems something unexpected happened.`);
    } else {
        message.channel.send(`The playlist ${name} has been created, You're the DJ ${message.author.username}!`);
    }
};