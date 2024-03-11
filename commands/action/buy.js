const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const shopItems = require("../../shop.json");
const items = require("../../items.json");
const {
    isUserBlacklisted,
    isGuildBlacklisted,
} = require("../../blacklistChecker");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Buy items from the shop")
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item to buy")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount of the item to buy")
                .setRequired(true)
        ),
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

            const itemName = interaction.options.getString("item");
            const amount = interaction.options.getInteger("amount");
            const buyerId = interaction.user.id;

            const buyerData = await interaction.client.database.getUser(
                buyerId
            );

            if (buyerData) {
                const buyerInventory = buyerData.inventory || [];

                if (items[itemName]) {
                    const itemPrice = shopItems[itemName]?.Price || 0;
                    const currencyItem =
                        shopItems[itemName]?.CurrencyItem || "";

                    // Check if the buyer has enough currency items in their inventory
                    const currencyItemIndex = buyerInventory.findIndex(
                        (item) => item.name === currencyItem
                    );

                    if (
                        currencyItemIndex !== -1 &&
                        buyerInventory[currencyItemIndex].amount >=
                            itemPrice * amount
                    ) {
                        await interaction.client.database.addStats(
                            interaction.user.id,
                            "Items bought from shop",
                            amount
                        );
                        // Deduct the currency items from the buyer's inventory
                        buyerInventory[currencyItemIndex].amount -=
                            itemPrice * amount;
                        if (buyerInventory[currencyItemIndex].amount <= 0) {
                            // Remove the currency item from the inventory if the amount reaches 0
                            buyerInventory.splice(currencyItemIndex, 1);
                        }

                        // Check if the buyer already has the purchased item in their inventory
                        const existingItemIndex = buyerInventory.findIndex(
                            (item) => item.name === itemName
                        );

                        if (existingItemIndex !== -1) {
                            // Increment the amount if the item already exists
                            buyerInventory[existingItemIndex].amount += amount;
                        } else {
                            // Add the purchased item to the buyer's inventory
                            const newItem = {
                                name: itemName,
                                emoji: items[itemName].emoji,
                                amount: amount,
                                rarity:0,
                            };
                            buyerInventory.push(newItem);
                        }

                        // Save the changes to the buyer's inventory
                        buyerData.inventory = buyerInventory;
                        await buyerData.save();

                        const embed = new EmbedBuilder()
                            .setAuthor({
                                name: "Buy Command",
                            })
                            .setDescription(
                                `Successfully bought ${amount} ${items[itemName].emoji} ${itemName}(s).`
                            )
                            .setColor("#808080");

                        await interaction.editReply({ embeds: [embed] });
                    } else {
                        await interaction.editReply(
                            "Insufficient funds. Check your inventory for the required currency items."
                        );
                    }
                } else {
                    await interaction.editReply(
                        "Invalid item name. Check the shop.json file for valid item names."
                    );
                }
            } else {
                await interaction.editReply("Buyer not found.");
            }
        } catch (error) {
            console.error("Error executing buy command:", error);
            await interaction.editReply(
                "An error occurred while executing the buy command."
            );
        }
    },
};
