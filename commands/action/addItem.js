const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const items = require("../../items.json");
const { isUserBlacklisted, isGuildBlacklisted } = require('../../blacklistChecker.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("additem")
        .setDescription("Test command to add items to a user's inventory")
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item to add")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount of the item to add")
                .setRequired(true)
        )
        .addUserOption((option) =>
            option.setName("user").setDescription("The user to add items to")
        ),
    async execute(interaction) {
            if (interaction.guild) {
                if (isGuildBlacklisted(interaction.guild.id)) {
                    return interaction.reply(
                        "You are blacklisted from using this bot in this server."
                    );
                }
            } else {
                if (isUserBlacklisted(interaction.user.id)) {
                    return interaction.reply(
                        "You are blacklisted from using this bot."
                    );
                }
            }
        try {
            await interaction.deferReply();

            const targetUser =
                interaction.options.getUser("user") || interaction.user;
            const itemName = interaction.options.getString("item");
            const amount = interaction.options.getInteger("amount");

            const userData = await interaction.client.database.getUser(
                targetUser.id
            );

            if (userData) {
                const inventoryItems = userData.inventory || [];

                // Check if the item already exists in the inventory
                const existingItemIndex = inventoryItems.findIndex(
                    (item) => item.name === itemName
                );

                if (existingItemIndex !== -1) {
                    // Update existing item
                    const existingItem = inventoryItems[existingItemIndex];
                    existingItem.amount += amount;
                } else {
                    // Add new item
                    const newItem = {
                        name: itemName,
                        emoji: items[itemName]?.emoji || "❓", // Use a default emoji if not found
                        amount: amount,
                    };
                    inventoryItems.push(newItem);
                }

                userData.inventory = inventoryItems;
                await userData.save();

                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: "Test Command - Add Item",
                    })
                    .setDescription(
                        `Added ${amount} ${
                            items[itemName]?.emoji || "❓"
                        } ${itemName}(s) to ${targetUser.username}'s inventory.`
                    );

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply("User not found.");
            }
        } catch (error) {
            console.error("Error executing test command:", error);
            await interaction.editReply(
                "An error occurred while executing the test command."
            );
        }
    },
};
