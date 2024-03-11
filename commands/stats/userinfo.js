const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const {
    isUserBlacklisted,
    isGuildBlacklisted,
} = require("../../blacklistChecker");

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Get information about a user")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to get information about")
                .setRequired(false)
        ),
    async execute(interaction) {
        if (isGuildBlacklisted(interaction.guild.id)) {
            return interaction.reply(
                "You are blacklisted from using this bot in this server."
            );
        } else {
            if (isUserBlacklisted(interaction.user.id)) {
                return interaction.reply(
                    "You are blacklisted from using this bot."
                );
            }
        }
        await interaction.deferReply();
        const targetUser =
            interaction.options.getUser("user") || interaction.user;

        const userStats = await interaction.client.database.getUser(
            targetUser.id
        );
        let userEmbed = new EmbedBuilder()
            .setColor("#808080") // You can customize the color
            .setTitle(`${targetUser.tag}'s User Info`)
            .setDescription("No stats")
            .setTimestamp();
        if (userStats.stats) {
            userEmbed = new EmbedBuilder()
                .setColor("#808080") // You can customize the color
                .setTitle(`${targetUser.tag}'s User Info`)
                .setDescription(formatStats(userStats.stats))
                .setTimestamp();
        }

        await interaction.editReply({ embeds: [userEmbed] });
    },
};

function formatStats(stats) {
    return stats.map((stat) => `\`${stat.amount}\` · ${stat.name}`).join("\n");
}
