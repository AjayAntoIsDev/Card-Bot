const blacklist = require("./blacklist.json"); // Adjust the path as needed

function isUserBlacklisted(userId) {
    console.log(blacklist)
    return blacklist.USERS.includes(userId);
}

function isGuildBlacklisted(guildId) {
    return blacklist.GUILDS.includes(guildId);
}

module.exports = { isUserBlacklisted, isGuildBlacklisted };
