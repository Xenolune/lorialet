/* Header */
const CFG = require("./config.json")
const Events = require("events")
const {Client} = require("pg")
const Discord = require("discord.js")
    // const Commando = require('discord.js-commando')
    // const FS = require("fs")
    // const AWS = require("aws-sdk")
/* Initialisation */
const event = new Events.EventEmitter()
const bot = new Discord.Client() // COMMANDO SETTINGS {owner: OWNER,commandPrefix: bang}
const db = new Client({connectionString: process.env.DATABASE_URL,ssl:true})
    /* Initialisation BDD */
var TOKEN
var OWNER
var bang
db.connect() // ON PEUT FAIRE MIEUX SUR CES FONCTIONS
db.query(
    "SELECT valeur FROM config WHERE nom='discord_token';", (err, res) => {
        TOKEN = res.rows[0].valeur ? res.rows[0].valeur : null
        console.log(err ? err.stack : "Token is : \"" + TOKEN + "\"")
        TOKEN ? null : process.exit(101) // surtout sur ces trois lignes
    })
db.query(
    "SELECT valeur FROM config WHERE nom='owner';", (err, res) => {
        OWNER = res.rows[0].valeur ? res.rows[0].valeur : null
        console.log(err ? err.stack : "Owner ID is : \"" + OWNER + "\"")
        OWNER ? null : process.exit(102) // mais on doit aussi pouvoir les fusionner non ? T.T
    })
db.query(
    "SELECT valeur FROM config WHERE nom='bang';", (err, res) => {
        bang = res.rows[0].valeur ? res.rows[0].valeur : null
        console.log(err ? err.stack : "Bang is : \"" + bang + "\"")
        bang ? null : process.exit(103)
        db.end() // faut pas oublier ça à la fin des requêtes en tout cas !
    })
function login() { // Tente de se connecter jusqu'à recevoir un TOKEN (ou exit() )
    if (TOKEN) {
        bot.login(TOKEN)
    } else {
        setTimeout(function() {
            login()
        }, 500);
    }
}
login() // cette fonction c'est vraiment de la merde
bot.on("ready", () => { // Connection à Discord
    console.log("Connecté sur Discord en tant que " + bot.user.tag);
    bot.channels.get(CFG.botMasterChan).send("J'ai bien dormi ! Comment allez-vous aujourd'hui ?");
})
/* Bot Commands */
const SUB ={ // Sous-routines récurrentes dans les fonctions avancées
    isBot : msg => msg.author.bot, // Renvoie true si le message vient d'un bot
    isBotMaster : msg => msg.member.roles.get(CFG.botMasterRole), // Renvoie true si le message vient d'une personne avec le Role BotMaster
    isOnBotChan : msg => (msg.channel.id == CFG.botChan || msg.channel.id == CFG.botMasterChan), // Renvoie true si le message vient de l'un des channels de bot
    hasBang : msg => msg.content.startsWith(bang), // Renvoie true si le message commence par le caractère Bang
    getCmd : msg => msg.content.split(" ")[0].substring(1), // Renvoie la première chaîne de caractères entre le Bang et le premier espace
    getParam : msg => msg.content.split(" "), // Renvoie un tableau contenant chaque chaîne de caractères entre espaces par ligne
    reqCmd : msg => SUB.hasBang(msg) && !SUB.isBot(msg) ? SUB.getCmd(msg) : null, // Renvoie getCmd si le message commence par Bang et n'est pas envoyé par unæ bot
    isNotPing : msg => SUB.isBot(msg) && ((SUB.reqCmd(msg) == "ping") && (ping.last == false)) // True tant que le message n'est pas Bang+ping
}
const CMD = { // Commandes principales, objet parcouru par Bang+help pour la description des commandes
    "bang": {
        usage: bang + "bang <character>",
        description: "Permet de modifier le \"bang\" d'appel de commande.\nLa fonction n'est pas encore implémentée pour l'instant.",
        allowedIn: "#le-client-ssh",
        allowedFor: "@Dev Bot",
        allowedInID: [CFG.chanBotMaster],
        allowedForID: [CFG.roleBotMaster],
        fcn: msg => {
            SUB.getParam(msg)[1] ? msg.reply("Vous voulez changer pour **" + SUB.getParam(msg)[1] +"**?") : msg.reply("Vous devez indiquer un paramètre avec cette fonction.")
            msg.channel.send("Pour être honnête, je n'ai pas encore de fonction pour changer le bang, mais c'est déjà ça.")
        }
    },
    "help": {
        usage: bang + "help [commande]",
        description: "Affiche la liste des commandes ou les informations d'une commande spécifique.",
        allowedIn: "#le-réseau-local + #le-client-ssh",
        allowedFor: "Tout le monde",
        allowedInID: [CFG.chanBot, CFG.chanBotMaster],
        allowedForID: [CFG.memberRole],
        fcn: (msg) => {
            if (SUB.getParam(msg)[1] == undefined) { // Si le message ne contient que la commande
                let embed = new Discord.RichEmbed() // Créer un message Embed
                embed.setColor(38600) // bleu
                Object.keys(CMD).forEach(function(key, i, array) { // loop de l'objet CMD
                    embed.addField(CMD[key].usage, CMD[key].description) // ajouter l'usage et la description
                    i < array.length - 1 ? embed.addBlankField() : null // ajouter un blankfield entre les commandes
                })
                msg.channel.send("Voici la liste de mes fonctions : \n")
                msg.channel.send({ embed })
            } else if (CMD[SUB.getParam(msg)[1]] != undefined) { // Si le premier paramètre est bien le nom d'une commande
                let cmd = CMD[SUB.getParam(msg)[1]]
                let embed = new Discord.RichEmbed()
                embed.setColor(51350) // vert
                embed.setAuthor(SUB.getParam(msg)[1])
                embed.addField("Usage: ", cmd.usage)
                embed.addField("Description: ", cmd.description)
                embed.addField("Cannaux autorisés: ", cmd.allowedIn, true)
                embed.addField("Membres autorisés: ", cmd.allowedFor, true)
                msg.channel.send({ embed })
            } else { // Erreur
                msg.reply("Cette commande n'existe pas.")
            }
        }
    },
    "ping": {
        usage: bang + "ping",
        description: "Pour jouer au ping-pong avec ce bot.\nNe læ fatiguez pas trop s'il vous plaît.",
        allowedIn: "#le-réseau-local + #le-client-ssh",
        allowedFor: "Tout le monde",
        allowedInID: [CFG.chanBot, CFG.chanBotMaster],
        allowedForID: [CFG.memberRole],
        fcn: msg => {
            if (ping.count < 10 && ping.allowed) {
                ping.last = true;
                ping.count++;
                msg.reply("pong !");
                if (ping.count%4 == 0) {msg.reply("quelle partie, c'est fatiguant à force !")};
            } else if (ping.allowed) {
                ping.timeout(msg);}
        }
    },
    "sleep": {
        usage: bang + "sleep",
        description: "Éteint le Bot.",
        allowedIn: "#le-client-ssh",
        allowedFor: "@Dev Bot",
        allowedInID: [CFG.chanBotMaster],
        allowedForID: [CFG.roleBotMaster],
        fcn: msg => {
            if (SUB.isBotMaster(msg)) { // si le message est envoyé par un BotMaster ...
                bot.channels.get(CFG.botMasterChan).send("Je vais me coucher. Bonne nuit tout le monde !"); // prévient du dodo
                setTimeout(function(){bot.destroy();}, 5000); // et kill le process proprement au bout de 5 secondes
            } else {msg.reply("faut pas croire, seule ma maîtresse peut s'offrir ce loisir.")} // ou envoie un message d'erreur
        }
    },
    "talk": {
        usage: bang + "talk [salon] <Message>",
        description: "Envoie un message de la part du bot sur #le-réseau-local par défaut, ou un autre [salon] si précisé",
        allowedIn: "#le-client-ssh",
        allowedFor: "@Dev Bot",
        allowedInID: [CFG.chanBotMaster],
        allowedForID: [CFG.roleBotMaster],
        fcn: msg => {
            let chan
            let cnt = msg.content.substring(6) // Supprime l'appel de commande du message
            let request = (cnt.startsWith("<#") ? SUB.getParam(msg)[1].substring(2,20) : null) // Définir request sur le premier paramètre s'il commence comme un ID de chan
            if (request == undefined) { // Définir un chan par défaut s'il n'y a pas de request...
                chan = bot.channels.get(CFG.botChan)
            } else { // ou,
                let exists = (bot.channels.get(request) ? true : false) // ... si le paramètre correspond bien à un channel du serveur ...
                chan = (exists ? bot.channels.get(request) : null) // ... définir chan ...
                cnt = cnt.substring(22) // ... et retirer le chan mentionné du contenu du message
            }
            chan == undefined ? msg.reply("Erreur, je ne connais pas ce cannal") : chan.send(cnt) // Envoie le message sur le bon chan, ou une erreur
        }
    },
    "notCmd": {
        usage: bang + " + n'importe quelle suite de caractères non reconnus",
        description: "Message d'erreur en cas de commande erronée.",
        allowedIn: "Partout",
        allowedFor: "Tout le monde",
        allowedInID: null,
        allowedForID: [CFG.memberRole],
        fcn: msg => msg.reply(SUB.getCmd(msg) + " n'est pas une commande que je connaisse. Essaye " + bang + "help." )
    }
}
const ping = {
    count: 0,
    last: false,
    allowed: true,
    reset: () => {ping.count = 0;ping.last = false;},
    timeout: msg => {
        let pause = 10 * 60000;
        msg.reply("faisons une pause pour " + pause/60000 + " minutes.")
        ping.reset();
        ping.allowed = false;
        setTimeout(function() {
            msg.channel.send("Bien, nous pouvons recommencer à jouer !");
            ping.allowed = true;
        }, pause);
    }
};
/* Bot Triggers */
bot.on("message", msg => {
    if (SUB.isOnBotChan(msg)) { // Ce serait mieux de vérifier le chan pour valider si la commande peut-être exécutée)
        SUB.isNotPing(msg) ? ping.reset() : null // ping.reset() A CHAQUE MESSAGE DANS UN BOTCHAN ?
        if (SUB.hasBang(msg)) { // S'il y a bien un bang,
            if (CMD[SUB.reqCmd(msg)] != undefined) { // Si la commande existe,
                CMD[SUB.reqCmd(msg)].fcn(msg) // chercher la commande demandée et exécuter la fonction associée
            } else { CMD.notCmd.fcn(msg) // Sinon fonction de fallback
            }
        }
    }
})
/* Errors */
process.on("exit", (code) => {
    switch (code) {
        case 101:
            console.log("DB Error, can't get Discord Token.")
            break;
        case 102:
            console.log("DB Error, can't get Owner ID.")
            break;
        case 103:
            console.log("DB Error, can't get banged.")
            break;
    }
})
