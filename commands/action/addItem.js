const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const items = require("../../items.json");
const { isUserBlacklisted, isGuildBlacklisted } = require('../../blacklistChecker.js');

const allowedUserIDs = ['915133134708826182'];

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
        )
        .addStringOption((option) =>
            option
                .setName("rarity")
                .setDescription("The rarity of the item")
                .setRequired(false)
        ),
    async execute(interaction) {
        if (!allowedUserIDs.includes(interaction.user.id)) {
            return interaction.reply(
                "You are not authorized to use this command."
            );
        }

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
            const rarity = interaction.options.getString("rarity");

            if (!items[itemName]) {
                return interaction.editReply("Item not found in items.json.");
            }

            const userData = await interaction.client.database.getUser(
                targetUser.id
            );

            if (userData) {
                const inventoryItems = userData.inventory || [];
                const existingItemIndex = inventoryItems.findIndex(
                    (item) => item.name === itemName && item.rarity === rarity
                );

                if (existingItemIndex !== -1) {
                    const existingItem = inventoryItems[existingItemIndex];
                    existingItem.amount += amount;
                } else {

const newItem = {
    name: itemName,
    emoji: items[itemName]?.emoji || "❓",
    amount: amount,
};


if (rarity) {
    newItem.rarity = rarity;
}
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
            console.error("Error executing additem command:", error);
            await interaction.editReply(
                "An error occurred while executing the additem command. Please try again."
            );
        }
    },
};
