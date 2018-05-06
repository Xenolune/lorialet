/* Header */
const Discord = require("discord.js")
const FS = require("fs")
const bot = new Discord.Client()
const CFG = require("./config.json")
/* Bot Start */
bot.login(CFG.token)
bot.on("ready", () => {console.log("Connecté sur Discord en tant que " + bot.user.tag);})
/* MySQL */ /*
const MySQL = require("mysql")
const db = MySQL.createConnection({
host: CFG.db.host,
user: CFG.db.user,
password: CFG.db.password,
database: "discord_bot"
})
db.connect(function(err) {
    if (err) throw err;
    let q_bang = "SELECT value FROM config WHERE name='bang'";
    db.query(q_bang, function(err, result) {
        if (err) throw err;
        bang = result[0].value;
        console.log('bang is: "' + bang + '"');
    })
}) */

/* Bot Objects */
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
var chanAll;
var chanEntrance;
var chanMember;
var chanBotMaster;
var chanBot;
var roleBotMaster;
var roleBot;
var roleMember;
const CMD_Next = {
    "bang": {
        usage: "!bang <character>",
        description: "Permet de modifier le \"bang\" d'appel de commande. La fonction n'est pas encore implémentée pour l'instant.",
        allowedIn: [chanBotMaster],
        allowedFor: [roleBotMaster],
        fcn: cmd_bang
    },
    "help": {
        usage: "!help [commande]",
        description: "Affiche la liste des commandes ou les informations d'une commande spécifique.",
        allowedIn: [chanBot, chanBotMaster],
        allowedFor: [roleMember],
        fcn: cmd_help
    },
    "ping": {
        usage: "!ping",
        description: "Pour jouer au ping-pong avec le bot. Ne læ fatiguez pas trop s'il vous plaît.",
        allowedIn: [chanBot, chanBotMaster],
        allowedFor: [roleMember],
        fcn: cmd_ping
    },
    "sleep": {
        usage: "!sleep",
        description: "Éteint le Bot.",
        allowedIn: [chanBotMaster],
        allowedFor: [roleBotMaster],
        fcn: cmd_sleep
    },
    "talk": {
        usage: "!talk Message",
        description: "Envoie un message de la part du bot.",
        allowedIn: [chanBotMaster],
        allowedFor: [roleBotMaster],
        fcn: cmd_talk
    },
/*    "cmdSample": {
        usage: "<param1> <param2>",
        description: "Description",
        allowedIn: [Channel, List],
        allowedFor: [Group, List],
        fcn: fcn(param1, param2)
    } */
}
const CMD = {
    bang: cmd_bang,
    help: cmd_helpOld,
    ping: cmd_ping,
    sleep: cmd_sleep,
    talk: cmd_talk,
    notCmd: msg => msg.reply(SUB.getCmd(msg) + " n'est pas une commande que je connaisse. Essaye " + CFG.bang + "help." )
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
/* Bot Triggers */
bot.on("message", msg => {
    if (SUB.isOnBotChan(msg)) {
        SUB.isNotPing(msg) ? ping.reset() : null
        if (SUB.hasBang(msg)) {
            if (CMD[SUB.reqCmd(msg)] != undefined) {
                CMD[SUB.reqCmd(msg)](msg)
            } else { CMD.notCmd(msg)
            }
        }
    }
})
/* Bot Modules */
function cmd_sleep(msg) {
    if (SUB.isBotMaster(msg)) {
        bot.channels.get(CFG.botChan).send("Je vais me coucher. Bonne nuit tout le monde !");
        setTimeout(function(){bot.destroy();}, 5000);
    } else {msg.reply("faut pas croire, seule ma maîtresse peut s'offrir ce loisir.")}
}
function cmd_help(msg,arg) {
    msg.channel.send("Voici la liste de mes fonctions : \n")
    msg.channel.send(Object.keys(CMD))
    msg.channel.send("\nElles doivent être précédées du symbole \"" + CFG.bang + "\" pour être exécutées." )
    msg.reply("pour l'instant j'ai pas plus de détails à te donner, désolée. Je t'aime.")
}
function cmd_helpOld(msg) {
    msg.channel.send("Voici la liste de mes fonctions : \n")
    msg.channel.send(Object.keys(CMD))
    msg.channel.send("\nElles doivent être précédées du symbole \"" + CFG.bang + "\" pour être exécutées." )
    msg.reply("pour l'instant j'ai pas plus de détails à te donner, désolée. Je t'aime.")
}
function cmd_ping(msg) {
    if (ping.count < 25 && ping.allowed) {
        ping.last = true;
        ping.count++;
        console.log("ping count: " + ping.count);
        msg.reply("pong !");
        if (ping.count%10 == 0) {msg.reply("quelle partie, c'est fatiguant à force !")};
    } else if (ping.allowed) {
        ping.timeout(msg);}
}
function cmd_bang(msg) {
    if (SUB.getParam(msg)[1]) {
        msg.reply("Vous voulez changer pour **" + SUB.getParam(msg)[1] +"**?")
    } else {msg.reply("Vous devez indiquer un paramètre avec cette fonction.")}
    msg.channel.send("Pour être honnête, je n'ai pas encore de fonction pour changer le bang, mais c'est déjà ça.")
}
function cmd_talk(msg) {
    let cnt = msg.content.substring(6)
    let chan = bot.channels.get(CFG.botChan)
    chan.send(cnt)
}
/* Backup from random stuff
bot.on("love", msg => {
    let cnt = msg.content;
    if (cnt.includes("aussi")) {
        msg.reply("tu es douxe !");
    } else if (cnt.includes(CFG.botName)) {
        msg.reply("moi aussi je t'aime !")
    } else {
        msg.reply("est-ce que tu parles de moi ?")
        bot.emit("loveQuestion", msg);
    };
});
*/
