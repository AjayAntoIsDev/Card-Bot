const { Events } = require("discord.js");
const database = require("../database/database")
module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        client.database = new database(process.env.DBURI);
        client.database.connect();
        console.log(`Ready! Logged in as ${client.user.tag}`);
    },
};
