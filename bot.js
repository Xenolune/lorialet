/* Header */
const Discord = require("discord.js")
const FS = require("fs")
const AWS = require("aws-sdk")
const CFG = require("./config.json")
const bot = new Discord.Client()
/* PostgreSQL */ /*
const { Client } = require("pg")
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl:true
})
db.connect()

db.connect(function(err) {
    if (err) throw err;
    let q_bang = "SELECT value FROM config WHERE name='bang'";
    db.query(q_bang, function(err, result) {
        if (err) throw err;
        bang = result[0].value;
        console.log('bang is: "' + bang + '"');
    })
}) */

/* Bot Commands */
const SUB ={
    isBot : msg => msg.author.bot,
    isBotMaster : msg => msg.member.roles.get(CFG.botMasterRole),
    isOnBotChan : msg => (msg.channel.id == CFG.botChan || msg.channel.id == CFG.botMasterChan),
    hasBang : msg => msg.content.startsWith(CFG.bang),
    getCmd : msg => msg.content.split(" ")[0].substring(1),
    getParam : msg => msg.content.split(" "),
    reqCmd : msg => SUB.hasBang(msg) && !SUB.isBot(msg) ? SUB.getCmd(msg) : null,
    isNotPing : msg => SUB.isBot(msg) && ((SUB.reqCmd(msg) == "ping") && (ping.last == false))
}
const CMD = {
    "bang": {
        usage: CFG.bang + "bang <character>",
        description: "Permet de modifier le \"bang\" d'appel de commande.\nLa fonction n'est pas encore implémentée pour l'instant.",
        allowedIn: "#le-client-ssh",
        allowedFor: "@Dev Bot",
        allowedInID: [CFG.chanBotMaster],
        allowedForID: [CFG.roleBotMaster],
        fcn: msg => {
            if (SUB.getParam(msg)[1]) {
                msg.reply("Vous voulez changer pour **" + SUB.getParam(msg)[1] +"**?")
            } else {msg.reply("Vous devez indiquer un paramètre avec cette fonction.")}
            msg.channel.send("Pour être honnête, je n'ai pas encore de fonction pour changer le bang, mais c'est déjà ça.")
        }
    },
    "help": {
        usage: CFG.bang + "help [commande]",
        description: "Affiche la liste des commandes ou les informations d'une commande spécifique.",
        allowedIn: "#le-réseau-local + #le-client-ssh",
        allowedFor: "Tout le monde",
        allowedInID: [CFG.chanBot, CFG.chanBotMaster],
        allowedForID: [CFG.memberRole],
        fcn: (msg) => {
            if (SUB.getParam(msg)[1] == undefined) {
                let embed = new Discord.RichEmbed()
                embed.setColor(38600)
                Object.keys(CMD).forEach(function(key, i, array) {
                    embed.addField(CMD[key].usage, CMD[key].description)
                    i < array.length - 1 ? embed.addBlankField() : null
                })
                msg.channel.send("Voici la liste de mes fonctions : \n")
                msg.channel.send({ embed })
            } else {
                if (CMD[SUB.getParam(msg)[1]] != undefined) {
                    let cmd = CMD[SUB.getParam(msg)[1]]
                    let embed = new Discord.RichEmbed()
                    embed.setColor(51350)
                    embed.setAuthor(SUB.getParam(msg)[1])
                    embed.addField("Usage: ", cmd.usage)
                    embed.addField("Description: ", cmd.description)
                    embed.addField("Cannaux autorisés: ", cmd.allowedIn, true)
                    embed.addField("Membres autorisés: ", cmd.allowedFor, true)
                    msg.channel.send({ embed })
                } else {
                    msg.reply("Cette commande n'existe pas.")
                }
            }
        }
    },
    "ping": {
        usage: CFG.bang + "ping",
        description: "Pour jouer au ping-pong avec ce bot.\nNe læ fatiguez pas trop s'il vous plaît.",
        allowedIn: "#le-réseau-local + #le-client-ssh",
        allowedFor: "Tout le monde",
        allowedInID: [CFG.chanBot, CFG.chanBotMaster],
        allowedForID: [CFG.memberRole],
        fcn: msg => {
            if (ping.count < 25 && ping.allowed) {
                ping.last = true;
                ping.count++;
                console.log("ping count: " + ping.count);
                msg.reply("pong !");
                if (ping.count%10 == 0) {msg.reply("quelle partie, c'est fatiguant à force !")};
            } else if (ping.allowed) {
                ping.timeout(msg);}
        }
    },
    "sleep": {
        usage: CFG.bang + "sleep",
        description: "Éteint le Bot.",
        allowedIn: "#le-client-ssh",
        allowedFor: "@Dev Bot",
        allowedInID: [CFG.chanBotMaster],
        allowedForID: [CFG.roleBotMaster],
        fcn: msg => {
            if (SUB.isBotMaster(msg)) {
                bot.channels.get(CFG.botMasterChan).send("Je vais me coucher. Bonne nuit tout le monde !");
                setTimeout(function(){bot.destroy();}, 5000);
            } else {msg.reply("faut pas croire, seule ma maîtresse peut s'offrir ce loisir.")}
        }
    },
    "talk": {
        usage: CFG.bang + "talk [salon] <Message>",
        description: "Envoie un message de la part du bot sur #le-réseau-local par défaut, ou un autre [salon] si précisé",
        allowedIn: "#le-client-ssh",
        allowedFor: "@Dev Bot",
        allowedInID: [CFG.chanBotMaster],
        allowedForID: [CFG.roleBotMaster],
        fcn: msg => {
            let chan
            let cnt = msg.content.substring(6)
            let request = (cnt.startsWith("<#") ? SUB.getParam(msg)[1].substring(2,20) : null)
            if (request == undefined) {
                chan = bot.channels.get(CFG.botChan)
            } else {
                let exists = (bot.channels.get(request) ? true : false)
                chan = (exists ? bot.channels.get(request) : null)
                cnt = cnt.substring(22)
            }
            chan == undefined ? msg.reply("Erreur") : chan.send(cnt)
        }
    },
    "notCmd": {
        usage: CFG.bang + " + n'importe quelle suite de caractères non reconnus",
        description: "Message d'erreur en cas de commande erronée.",
        allowedIn: "Partout",
        allowedFor: "Tout le monde",
        allowedInID: null,
        allowedForID: [CFG.memberRole],
        fcn: msg => msg.reply(SUB.getCmd(msg) + " n'est pas une commande que je connaisse. Essaye " + CFG.bang + "help." )
    }
}
const ping = {
    count: 0,
    last: false,
    allowed: true,
    reset: () => {ping.count = 0;ping.last = false;console.log("ping reset")},
    timeout: msg => {
        let pause = 10 * 60000;
        msg.reply("faisons une pause pour " + pause/60000 + " minutes.")
        ping.reset();
        ping.allowed = false;
        setTimeout(function() {
            msg.channel.send("Allez, reprenons cette partie !");
            ping.allowed = true;
        }, pause);
    }
};
/* Bot Start */
bot.login(process.env.DISCORD_TOKEN)
bot.on("ready", () => {
    console.log("Connecté sur Discord en tant que " + bot.user.tag);
    bot.channels.get(CFG.botMasterChan).send("J'ai bien dormi ! Comment allez-vous aujourd'hui ?");
})
/* Bot Triggers */
bot.on("message", msg => {
    if (SUB.isOnBotChan(msg)) {
        SUB.isNotPing(msg) ? ping.reset() : null
        if (SUB.hasBang(msg)) {
            if (CMD[SUB.reqCmd(msg)] != undefined) {
                CMD[SUB.reqCmd(msg)].fcn(msg)
            } else { CMD.notCmd.fcn(msg)
            }
        }
    }
})
