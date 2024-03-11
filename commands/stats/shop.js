const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const shopItems = require("../../shop.json"); // Import the shop items
const items = require("../../items.json"); // Import the items
const { isUserBlacklisted, isGuildBlacklisted } = require('../../blacklistChecker');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Displays items available in the shop"),
    async execute(interaction) {
        if (isGuildBlacklisted(interaction.guild.id)) {
            return interaction.reply('You are blacklisted from using this bot in this server.');
        
    } else {
        if (isUserBlacklisted(interaction.user.id)) {
            return interaction.reply('You are blacklisted from using this bot.');
        }
    }
        try {
            await interaction.deferReply();

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: "Shop",
                })
                .setColor("#808080");

            const shopItemList = Object.entries(shopItems)
                .filter(([itemName, item]) => items[itemName])
                .map(([itemName, item]) => {
                    const emoji = items[itemName].emoji || "";
                    const itemDescription = item.Description || "No description available";

                    return `**${itemName}**
*${itemDescription}*
\`\`\`diff
- ${item.Price} ${item.CurrencyItem}
> /buy item: ${itemName} amount: 1
\`\`\``;
                });

            if (shopItemList.length > 0) {
                embed.setDescription(shopItemList.join("\n"));
                await interaction.editReply({ embeds: [embed] });
            } else {
                embed.setDescription("The shop is currently empty.");
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error("Error fetching shop items:", error);
            await interaction.editReply(
                "An error occurred while fetching shop items."
            );
        }
    },
};
