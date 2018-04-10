const path  = require("path");
const UTIL  = require(path.resolve("utils.js"))

exports.run = (client, message, args) => {
    UTIL.postRandomImageByTag(message, "cry");	
}

exports.help = () =>{
    return "sniffle ;(";
};

exports.docs = () => {
    let docs = {
        tab: "image",
        link: "Pictures",
        parent: "",
        full_command: "cry",
        command: "cry",
        description: "Post an image of anime cry.",
        syntax: 'cry',
        examples: [
            {
                description: "Post image of cry",
                code: `cry`
            }
        ]
    }
    return docs;
};