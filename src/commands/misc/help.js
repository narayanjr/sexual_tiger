let fs = require('fs');
let path = require('path');
let c = path.resolve("configure.json")
console.log(c)
let cfg = require(c)
import { MessageEmbed } from 'discord.js';


exports.run = (client, message, args) => {
    let end = global.metrics.summaries.labels('help').startTimer()
    if (args.length < 1){
        let embed = new MessageEmbed()
        embed.setTitle("Command Categories")
        embed.setColor(16312092)
        embed.setTimestamp()
        global.commandTypes.forEach((i)=>{
            embed.addField(i, global.commandTypeDesc[i])
        })
        
        message.channel.send({embed})
    }else{
        if (global.commandTypes.includes(args[0])){
            let excess_commands = 0;
            let t = args[0]
            let embed = new MessageEmbed()
            embed.setTitle(`${t} Commands`)
            embed.setColor(global.commandTypeColor[t])
            embed.setTimestamp()
            let p = path.resolve("built", "commands", t);
            fs.readdir(p, (err,items)=>{
                items.forEach((item)=>{
                    if(item.endsWith('.js')){
                        let script = path.resolve(p, item);
                        let temp = require(script);
                        let k = Object.keys(temp);
                        
                        let cmd = `${cfg.prefix}${item.replace(".js","")}`
                        let hlp = "empty";
                        if (k.includes("help")){
                            hlp = `${temp.help()}`;   
                        }
                        
                        try {
                            embed.addField(cmd, hlp)  
                        } catch (err) {
                            excess_commands = excess_commands + 1;
                        }
                    }
                });

                message.channel.send({embed}).catch((err)=>{console.error(err.message);console.log(table)});
                if(excess_commands > 0) {
                    message.channel.send(`It looks like there were ${excess_commands} more commands we cant display here because we have too many fucking commands.  Oops?`);
                }
            })
            
        }
    };
    end()
}

function all_cards(client, message, args){

    global.commandTypes.forEach((t)=>{
        let embed = new MessageEmbed()
        embed.setTitle(`Available Commands`)
        embed.setDescription("")
        //embed.setAuthor("FuckYou")
        embed.setColor("0x3ad1c9")
        embed.setTimestamp()
        let p = path.resolve("built", "commands", t);
        fs.readdir(p, (err,items)=>{
            items.forEach((item)=>{
                if(!item.endsWith('.js')){
                    return
                }else{
                    let script = path.resolve(p, t, item);
                    let temp = require(script);
                    let k = Object.keys(temp);
                    
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
exports.help = () =>{
    return "Really?";
};

exports.docs = () => {
    let docs = {
        default_access: 1,
        tab: "Misc",
        link: "general",
        parent: "",
        full_command: "help",
        command: "help",
        description: "Displays general usage info for commands.  Not so good when looking for image commands.",
        syntax: 'help [category]',
        examples: [
            {
                description: "Get help with admin commands",
                code: `help admin`
            }
        ]
    }
    return docs;
};