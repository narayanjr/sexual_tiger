const path  = require("path");
import * as UTIL from "../../utils";

exports.run = (client, message, args) => {
    
    UTIL.postRandomImageByTag(message, "nosebleed");	

}

exports.help = () =>{
    return "Tommy: Bleed!.";
};

exports.docs = () => {
    let docs = {
        default_access: 1,
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