const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    isUserBlacklisted,
    isGuildBlacklisted,
} = require("../../blacklistChecker");

module.exports = {
    cooldown: 86400,
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim your daily rewards"),
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
        try {
            await interaction.deferReply();

            // Determine the reward type (gold or tickets) with a 50% chance for each
            const isGold = Math.random() < 0.5;

            let rewardAmount;
            let rewardType;

            if (isGold) {
                // Gold reward between 30 and 300
                rewardAmount = Math.floor(Math.random() * (300 - 30 + 1)) + 30;
                rewardType = "Gold";
            } else {
                // Tickets reward between 1 and 5
                rewardAmount = Math.floor(Math.random() * (5 - 1 + 1)) + 1;
                rewardType = "Tickets";
            }

            // Update user's balance in the database (you need to implement this)
            // For example: await database.addGoldOrTickets(interaction.user.id, rewardAmount, rewardType);
            await interaction.client.database.addItemToInventory(
                interaction.user.id,
                rewardType,
                rewardAmount
            );
            // Create and send an embed with the results
            const rewardEmbed = new EmbedBuilder()
                .setTitle("Daily Reward")
                .setDescription(
                    `Congratulations, ${interaction.user.username}! You received ${rewardAmount} ${rewardType}.`
                )
                .setColor("#00FF00"); // Green color for positive result
                        await interaction.client.database.addStats(
                            interaction.user.id,
                            "Daily reward claimed",
                            1
                        );
            await interaction.editReply({ embeds: [rewardEmbed] });
        } catch (error) {
            console.error("Error executing daily command:", error);
            await interaction.editReply(
                "An error occurred while processing the daily command."
            );
        }
    },
};
