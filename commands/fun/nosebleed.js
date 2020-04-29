const path  = require("path");
const UTIL  = require(path.resolve("utils.js"))

exports.run = (client, message, args) => {
    UTIL.postRandomImageByTag(message, "nosebleed");	
}

exports.help = () =>{
    return "Tommy: Bleed!.";
};

exports.docs = () => {
    let docs = {
        restricted: 0,
        tab: "image",
        link: "Pictures",
        parent: "",
        full_command: "nosebleed",
        command: "nosebleed",
        description: "Post an image of anime nosebleed.",
        syntax: 'nosebleed',
        examples: [
            {
                description: "Post image of nosebleed",
                code: `nosebleed`
            }
        ]
    }
    return docs;
};