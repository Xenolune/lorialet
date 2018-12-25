/* Header */
const CFG = require("./config.json")
const Events = require("events")
const {Client} = require("pg")
const Sequelize = require("sequelize")
const Discord = require("discord.js")
    // const Commando = require('discord.js-commando')
    // const FS = require("fs")
    // const AWS = require("aws-sdk")
/* Initialisation */
const event = new Events.EventEmitter()
const bot = new Discord.Client() // COMMANDO SETTINGS {owner: OWNER,commandPrefix: bang}
/* Connexion BDD et bot */
var BANG
var RUNCMD
const ENV = CFG.dev_env ? require("./env.json") : null
const sequelize = new Sequelize(
    CFG.dev_env ? ENV.DATABASE_URL : process.env.DATABASE_URL,
    {
        dialect: 'postgres',
        dialectOptions: {
            ssl:'Amazon RDS'
        }
    }
)
const ConfigDB = sequelize.define(CFG.dev_env ? "config_next" : "config",
    {
        nom: {
            type: Sequelize.STRING(255),
            primaryKey: true
        },
        valeur: Sequelize.STRING(65535)
    }, {
        timestamps: false,
        freezeTableName: true
    }
)
ConfigDB.findOne({ where: {nom: "discord_token"} }).then(
    token => bot.login(token.valeur),
    error => {console.log(error);process.exit(101)}
)
ConfigDB.findOne({ where: {nom: "bang"} }).then(
    bang => BANG = bang.valeur,
    error => {console.log(error);process.exit(103)}
)
/* Bot Objects */
const SUB = { // Sous-routines récurrentes dans les fonctions avancées
    allowedMember : (msg) => CMD[SUB.getCmd(msg)].allowedForID.find(e => msg.member.roles.get(e)),
    allowedChan : (msg) => CMD[SUB.getCmd(msg)].allowedInID.find(e => e == msg.channel.id),
    getCmd : msg => msg.content.split(" ")[0].substring(BANG.length),
    getParams : msg => msg.content.split(" "),
    isModerator : search => {
        console.log("search:" + search)
        switch (typeof search) {
            case "string": Object.values(CFG.roles["modération"]).find(e => e === search); break;
            case "object": Object.values(CFG.roles["modération"]).find(e => e === search.member.rolesget(e)); break;
            default: console.log("searchtype:" + typeof search)
        }
    }
}
const CMD = { // Commandes principales, objet parcouru par Bang+help pour la description des commandes
    "addEmoji": {
        usage: "addEmoji <URL> nom",
        description: "Ajouter au serveur l'émoji renseigné sur l'URL et l'associe au raccourci **:nom:**",
        allowedIn: "Salons des bots (WiFi, SSH et labo)",
        allowedFor: "Quartz & Diamonds",
        allowedInID: [CFG.channels["borne-wifi"], CFG.channels["client-ssh"], CFG.channels["labo-robot"]],
        allowedForID: [CFG.roles.autre["Quartz"], CFG.roles.autre["Diamond"]],
        fcn: msg => {
            let url = SUB.getParams(msg)[1]
            let name = SUB.getParams(msg)[2]
            if (url && name) {
                msg.guild.createEmoji(url, name)
                    .then(emoji => bot.channels.get(CFG.channels["tableau-véléda"]).send("Ajouté : " + emoji))
                    .catch(error => error ? bot.channels.get(CFG.channels["client-ssh"]).send("Erreur à la création de l'emoji. Vérifier l'URL. Le nom de l'émoji ne peut contenir que [a-z][A-Z][0-9] ou \"_\".") : null)
            } else {
                msg.channel.send("il y a une erreur par ici\nURL = " + url + "\nName = " + name)
            }
        }
    },
    "bang": {
        usage: "bang <character>",
        description: "Permet de modifier le \"bang\" d'appel de commande.\nLa fonction n'est pas encore implémentée pour l'instant.",
        allowedIn: "#le-client-SSH",
        allowedFor: "Quartz & Diamonds",
        allowedInID: [CFG.channels["client-ssh"]],
        allowedForID: [CFG.roles.autre["Quartz"], CFG.roles.autre["Diamond"]],
        fcn: msg => {
            SUB.getParams(msg)[1] ? msg.reply("Vous voulez changer pour **" + SUB.getParams(msg)[1] +"**?") : msg.reply("Vous devez indiquer un paramètre avec cette fonction.")
            msg.channel.send("Le Bang est : " + BANG + "\nPour être honnête, je n'ai pas encore de fonction pour changer le bang, mais c'est déjà ça.")
        }
    },
    "help": {
        usage: "help [commande]",
        description: "Affiche la liste des commandes ou les informations d'une commande spécifique.",
        allowedIn: "Salons des bots (WiFi, SSH et labo)",
        allowedFor: "Crystal Gems (tout le monde)",
        allowedInID: [CFG.channels["borne-wifi"], CFG.channels["client-ssh"], CFG.channels["labo-robot"]],
        allowedForID: [CFG.roles.autre["Crystal Gem"]],
        fcn: (msg) => {
            if (SUB.getParams(msg)[1] == undefined) { // Si le message ne contient que la commande
                let embed = new Discord.RichEmbed() // Créer un message Embed
                embed.setColor(38600) // bleu
                Object.keys(CMD).forEach((key, i, array) => { // loop de l'objet CMD
                    CMD[key].allowedForID.find(e => msg.member.roles.get(e)) ? embed.addField(BANG + CMD[key].usage, CMD[key].description) : null // ajouter l'usage et la description des commandes autorisées uniquement
                })
                msg.channel.send("Voici la liste de mes fonctions que vous pouvez utiliser : \n")
                msg.channel.send({ embed })
            } else if (CMD[SUB.getParams(msg)[1]] != undefined) { // Si le premier paramètre est bien le nom d'une commande
                let cmd = CMD[SUB.getParams(msg)[1]]
                let embed = new Discord.RichEmbed()
                embed.setColor(51350) // vert
                embed.setAuthor(SUB.getParams(msg)[1])
                embed.addField("Usage: ", BANG + cmd.usage)
                embed.addField("Description: ", cmd.description)
                embed.addField("Cannaux autorisés: ", cmd.allowedIn, true)
                embed.addField("Membres autorisés: ", cmd.allowedFor, true)
                msg.channel.send({ embed })
            } else { // Erreur
                msg.reply("Cette commande n'existe pas.")
            }
        }
    },
    "role": {
        usage: "role [ajouter|retirer] [valeur] <@membre>",
        description: "Modifier vos rôles (ville, pronoms/accords, talents ...) sur le serveur. Pour en créer, demandez à un·e Diamond.",
        allowedIn: "Salons des bots (WiFi, SSH et labo)",
        allowedFor: "Tout le monde peut modifier son rôle, mais seul·es les Quartz et les Diamonds peuvent modifier les rôles d'autres membres.",
        allowedInID: [CFG.channels["borne-wifi"], CFG.channels["client-ssh"], CFG.channels["labo-robot"]],
        allowedForID: [CFG.roles.autre["Crystal Gem"]],
        fcn: msg => {
            let errorLevel = 0 // augmentation par 1 2 4 8 16 ....
            let action
            let role
            let target
            switch (SUB.getParams(msg)[1]) { //définir Action
                case "ajouter": action = "addRole"; break;
                case "retirer": action = "removeRole"; break;
                /*  case "changer": // need a function break; */
                default: errorLevel += 1; break; }
            if (SUB.getParams(msg)[2]) {
                role = SUB.getParams(msg)[2]
                let type = role.startsWith("<") ? "mention" : "string"
                if (type === "mention") {
                    role = role.substring(3,21)
                } else if (type === "string") {
                    Array.from(CFG.roles)
                    role = Object.keys(CFG.roles).find(e => e === CFG.roles[role]);
                }
                errorLevel += msg.guild.roles.get(role) ? 0 : 2
            }
            SUB.getParams(msg)[2] ? (msg.guild.roles.get(SUB.getParams(msg)[2].substring(3,21)) ? (role = SUB.getParams(msg)[2].substring(3,21)) : (errorLevel += 2) ) : null // find Role
            SUB.getParams(msg)[3] ? (msg.guild.members.get(SUB.getParams(msg)[3].substring(2,20)) ? (SUB.isModerator(msg) ? (target = SUB.getParams(msg)[3].substring(2,20)) : errorLevel += 4) : errorLevel += 8) : target = msg.member.id
            errorLevel += SUB.getParams(msg)[4] ? 16 : 0
            errorLevel += SUB.isModerator(role) ? 32 : 0  // block diamond+quartz+bots*3
            switch (errorLevel) {
                case 0: // si errorLevel == 0, check si rôle déjà présent/absent, sinon envoyer la commande
                    if (msg.guild.members.get(target).roles.get(role) && action === "addRole") { msg.channel.send("Tu es sûr·e de vouloir ajouter un rôle qu'unæ membre possède déjà ?")
                    } else if (!msg.guild.members.get(target).roles.get(role) && action === "removeRole") { msg.channel.send("Tu es sûr·e de vouloir retirer un rôle qu'unæ membre ne possède pas ?")
                    } else { msg.guild.members.get(target)[action](role); msg.channel.send("C'est fait ! <@" + target + "> " + (action === "addRole" ? "est désormais" : "n'est plus") + " <@&" + role + ">.") // it's working
                    }; break;
                case 1: msg.reply("il faut impérativement **ajouter** ou **retirer** un rôle."); break;
                case 2: msg.reply("ce rôle n'existe pas ou il n'est pas permis de l'attribuer."); break;
                case 3: msg.reply("se planter sur les deux paramètres vitaux de cette commande, c'est un peu le faire exprès."); break;
                case 4: msg.reply("en principe j'ai dit \"seul·es les Quartz et les Diamonds\" mais en fait c'est juste AvA pour l'instant."); break;
                case 6: msg.reply("tu n'est pas autorisé·e à modifier les rôles d'autrui (ou à trop parler dans ta requête), et en plus ce rôle n'existe pas et/ou n'est pas modifiable par cette commande."); break;
                case 8: msg.reply("si tu tentes de mentionner un membre, ce serait bien qu'il existe sur ce serveur hein."); break;
                case 11: msg.reply("TIPHAINE JE TE VOIS !"); break;
                case 16: msg.reply("tu parles trop."); break;
                case 32: msg.reply("LOL nope. On ne touche pas à ça."); break;
                case 64: msg.reply("à vide c'est inutile.")
                default: msg.reply("je ne comprends rien à ce que tu racontes."); break;
            }
        }
    },
    "list": {
        usage: "list [roles|channels|members]",
        description: "Liste les roles, salons ou membres du serveur.",
        allowedIn: "#le-client-ssh",
        allowedFor: "@Dev Bot",
        allowedInID: [CFG.channels["client-ssh"]],
        allowedForID: [CFG.roles.talent["Dev Bot"]],
        fcn: msg => {
            let param = [SUB.getParams(msg)[1]]
            if (param == "members" || param == "roles" || param == "channels") {
                let array = msg.guild[param].array()
                array.sort(function(a,b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)})
                let answer = ""
                if (param == "members") {
                    array.forEach(element => {
                        answer += element.displayName +" : "+ element.id +"\n"
                    })
                } else {
                    array.forEach(element => {
                        answer += (element.name == "@everyone") ? "" : element.name +" : "+ element.id +"\n"
                    })
                }
                if (answer.length > 2000) {
                    while (answer.length > 2000) {
                        let index = answer.lastIndexOf("\n", 1995) + 1
                        let shortAnswer = answer.substring(0, index)
                        msg.channel.send(shortAnswer)
                        answer = answer.replace(shortAnswer, "")
                    }
                }
                msg.channel.send(answer)
            } else return msg.reply("\"roles\", \"channels\" ou \"members\" s'il te plaît.")
        }
    },
    "sleep": {
        usage: "sleep",
        description: "Éteint le Bot.",
        allowedIn: "#le-client-ssh",
        allowedFor: "@Dev Bot",
        allowedInID: [CFG.channels["client-ssh"]],
        allowedForID: [CFG.roles.talent["Dev Bot"]],
        fcn: msg => {
            bot.channels.get(CFG.channels["borne-wifi"]).send("Je vais me coucher. Bonne nuit tout le monde !"); // prévient du dodo
            setTimeout(function(){bot.destroy();}, 3500); // et kill le process proprement au bout de 3.5 secondes
        }
    },
    "talk": {
        usage: "talk [salon] <Message>",
        description: "Envoie un message de la part du bot sur #le-réseau-local par défaut, ou un autre [salon] si précisé",
        allowedIn: "#le-client-ssh",
        allowedFor: "Quartz & Diamonds",
        allowedInID: [CFG.channels["client-ssh"]],
        allowedForID: [CFG.roles.autre["Quartz"], CFG.roles.autre["Diamond"]],
        fcn: msg => {
            let chan
            let cnt = msg.content.substring(6) // Supprime l'appel de commande du message
            let request = (cnt.startsWith("<#") ? SUB.getParams(msg)[1].substring(2,20) : null) // Définir request sur le premier paramètre s'il commence comme un ID de chan
            if (!request) { // Définir un chan par défaut s'il n'y a pas de request...
                chan = bot.channels.get(CFG.channels["borne-wifi"])
            } else { // ou,
                let exists = (bot.channels.get(request) ? true : false) // ... si le paramètre correspond bien à un channel du serveur ...
                chan = (exists ? bot.channels.get(request) : null) // ... définir chan ...
                cnt = cnt.substring(22) // ... et retirer le chan mentionné du contenu du message
            }
            (!chan) ? msg.reply("Erreur, je ne connais pas ce cannal") : chan.send(cnt) // Envoie le message sur le bon chan, ou une erreur
        }
    }
}
/* Bot Triggers */
bot.on("ready", () => { // Connection à Discord
    console.log("Connecté sur Discord en tant que " + bot.user.tag);
    RUNCMD = new RegExp("^" + BANG + "[a-z]", "i");
    bot.channels.get(CFG.channels["client-ssh"]).send("J'ai bien dormi ! Comment allez-vous aujourd'hui ?");
})
bot.on("message", msg => {
    if (!msg.author.bot) { // Pour tout message qui n'émane pas d'un·e bot,
        if (msg.content.match(RUNCMD)) { // qui commence par BANG puis une lettre,
            if (CMD[SUB.getCmd(msg)]) { // et dont une fonction correspondante existe,
                if (SUB.allowedChan(msg)) { // qu'elle est autorisée sur ce salon
                    if (SUB.allowedMember(msg)) { // et à ce membre
                        CMD[SUB.getCmd(msg)].fcn(msg) // alors on exécute la commande
                    } else {msg.reply("tu n'as pas le droit de faire ça.")}
                } else {msg.reply("tu n'as pas le droit de faire ça ici.")}
            } else if (BANG === ":" && SUB.getParams(msg)[0].endsWith(":")) { return // ne réagit pas aux émotes Discord
            } else {msg.reply("cette commande m'est inconnue. Essaye "+BANG+"help.")}
        } // Début des réactions non-commande
    } // Début des réactions accessibles aux autres bots
})
/* Critical Errors */
process.on('unhandledRejection', console.error)
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
