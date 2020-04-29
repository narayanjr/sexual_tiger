const path  = require("path");
const UTIL  = require(path.resolve("utils.js"))

exports.run = (client, message, args) => {
    UTIL.postRandomImageByTag(message, "pat");	
}

exports.help = () =>{
    return "pat pat pat";
};

exports.docs = () => {
    let docs = {
        restricted: 0,
        tab: "image",
        link: "Pictures",
        parent: "",
        full_command: "pat",
        command: "pat",
        description: "Post an image of anime pat.",
        syntax: 'pat',
        examples: [
            {
                description: "Post image of pat",
                code: `pat`
            }
        ]
    }
    return docs;
};