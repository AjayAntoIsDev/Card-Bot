const { SlashCommandBuilder } = require("discord.js");
const {
    isUserBlacklisted,
    isGuildBlacklisted,
} = require("../../blacklistChecker");

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    async execute(interaction) {
                if (isGuildBlacklisted(interaction.guild.id)) {
                    return interaction.reply(
                        "You are blacklisted from using this bot in this server."
                    );
                }
             else {
                if (isUserBlacklisted(interaction.user.id)) {
                    return interaction.reply(
                        "You are blacklisted from using this bot."
                    );
                }
            }
        await interaction.reply("Pong!");
    },
};
