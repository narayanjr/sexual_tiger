let fs = require('fs');
let path = require('path');
c = path.resolve("configure.json")
console.log(c)
let cfg = require(c)


exports.run = (client, message, args) => {
    let Discord = require("discord.js")
    if (args.length < 1){
        let embed = new Discord.RichEmbed()
        embed.setTitle("Command Categories")
        embed.setColor(16312092)
        embed.setTimestamp()
        global.commandTypes.forEach((i)=>{
            embed.addField(i, global.commandTypeDesc[i])
        })
        
        message.channel.send({embed})
    }else{
        if (global.commandTypes.includes(args[0])){
            let t = args[0]
            let embed = new Discord.RichEmbed()
            embed.setTitle(`${t} Commands`)
            embed.setColor(global.commandTypeColor[t])
            embed.setTimestamp()
            p = path.resolve("commands", t);
            fs.readdir(p, (err,items)=>{
                items.forEach((item)=>{
                    if(!item.endsWith('.js')){
                        return
                    }else{
                      script = path.resolve("commands", t, item);
                    temp = require(script);
                    k = Object.keys(temp);
                    
                    let cmd = `${cfg.prefix}${item.replace(".js","")}`
                    if (k.includes("help")){
                        hlp = `${temp.help()}`;
                        
                    } else{
                        hlp = "empty";
                    }
                    embed.addField(cmd, hlp)  
                    }
                });

                
                message.channel.send({embed}).catch((err)=>{console.error(err.message);console.log(table)});

            })
        }
    };
}

function all_cards(client, message, args){

    global.commandTypes.forEach((t)=>{
        let embed = new Discord.RichEmbed()
        embed.setTitle(`Available Commands`)
        embed.setDescription("")
        //embed.setAuthor("FuckYou")
        embed.setColor("0x3ad1c9")
        embed.setTimestamp()
        p = path.resolve("commands", t);
        fs.readdir(p, (err,items)=>{
            items.forEach((item)=>{
                if(!item.endsWith('.js')){
                    return
                }else{
                  script = path.resolve("commands", t, item);
                temp = require(script);
                k = Object.keys(temp);
                
                let cmd = `${cfg.prefix}${item.replace(".js","")}`
                if (k.includes("help")){
                    hlp = `${temp.help()}`;
                    
                } else{
                    hlp = "empty";
                }
                embed.addField(cmd, hlp)  
                }
            });

            
            message.channel.send({embed}).catch((err)=>{console.error(err.message);console.log(table)});
        });
    })
}