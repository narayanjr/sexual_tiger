const fs            = require('fs');
const path          = require('path');
const assign        = require('assign-deep');
const recursive     = require("recursive-readdir");
const handlebars    = require('handlebars');
const cfg           = require(path.resolve("configure.json"))

exports.run = (client, message, args) => {
    
    let full_docs = {
        
    }

    handlebars.registerHelper('capitalize', function(title){
        return title.charAt(0).toUpperCase() + title.slice(1);
      })

    let command_folders_path = path.resolve("built", "commands");
    recursive(command_folders_path, function (err, files) {
        files.forEach((file) => {
            if(file.endsWith('.js')) {
                let temp = require(file);
                let keys = Object.keys(temp);
                if (keys.includes("docs")) {
                    
                    let docs = temp.docs(); 

                    let rt = {
                        [docs.tab]: {
                            [docs.link]: {
                                [docs.command]: {
                                    parent: docs.parent,
                                    command: docs.command,
                                    description: docs.description,
                                    syntax: cfg.prefix + docs.syntax,
                                    full_command: cfg.prefix + docs.full_command,
                                    examples: docs.examples.map(example => {
                                        example.code = cfg.prefix + example.code
                                        return example;
                                    })
                                }
                            }
                        }
                    }
                    
                    full_docs = assign(full_docs, rt);
                } 
            }
        });
        
        var myData = Object.keys(full_docs).map(key => {
            let tab = full_docs[key];
            var links = Object.keys(tab).map(tabKey => {
                let link = tab[tabKey];
                var commands = Object.keys(link).map(linkKey => {
                    return link[linkKey];
                });
                
                link.name = tabKey;
                commands.forEach( cmd => {
                    delete link[cmd.command]
                })
                link.commands = commands;
                return link;
            });
            tab.links = links;
            
            links.forEach(link => {
                delete tab[link.name];
            })

            tab.name = key;
            return tab;
        })

        let test = {"tabs": myData}
        let index_template_path = path.resolve("src", "website", "index_template.html")
        fs.readFile(index_template_path, 'utf-8', function(error, source){
            var template = handlebars.compile(source);
            var html = template(test);
            
            fs.writeFile("/var/www/html/index.html", html, function(writeErr) {
                if(writeErr) {
                    console.log(writeErr);
                    return message.channel.send("Failed to write updated Docs to website/index.html")
                }
            }); 
        });
    });

}

exports.help = () => {
    return "Regenerates Docs";
};

exports.docs = () => {
    return {
        default_access: 0,
        tab: "admin",
        link: "general",
        parent: "",
        full_command: "gen_docs",
        command: "gen_docs",
        description: "Generates new Docs dynamically based on what commands exist and have a docs value.",
        syntax: "gen_docs",
        examples: [
            {
                description: "Generate updated Docs.",
                code: "gen_docs"
            }
        ]
    };
};