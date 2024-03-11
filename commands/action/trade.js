const {
    SlashCommandBuilder,
    ButtonStyle,
    EmbedBuilder,
    ButtonBuilder,
    MessageComponent,
    ActionRowBuilder,
} = require("discord.js");
const itemsData = require("../../items.json");
const _ = require("lodash");
const {
    isUserBlacklisted,
    isGuildBlacklisted,
} = require("../../blacklistChecker");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("trade")
        .setDescription("Initiate a trade with another user")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to trade with")
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
        const database = interaction.client.database;
        const initiator = interaction.user;
        const recipient = interaction.options.getUser("user");

        try {
            await interaction.deferReply();

            // Step 1: Trade Request Step
            const tradeRequestEmbed = generateTradeRequestEmbed(
                recipient,
                initiator
            );
            const tradeRequestButtons = generateTradeRequestButtons();
            const tradeRequestResponse = await interaction.editReply({
                embeds: [tradeRequestEmbed],
                components: [tradeRequestButtons],
            });

            // Set up collector for trade request step
            const filter = (component) =>
                component.customId === "trade-accept" ||
                component.customId === "trade-decline";
            const collector =
                tradeRequestResponse.createMessageComponentCollector({
                    filter,
                    time: 180000,
                });

            collector.on("collect", async (component) => {
                // Handle trade request step
                if (
                    component.customId === "trade-accept" &&
                    component.user.id === recipient.id
                ) {
                    // Step 2: Trading Step
                    await initiateTradingStep(
                        initiator,
                        recipient,
                        component,
                        database
                    );
                    collector.stop();
                } else if (
                    component.customId === "trade-accept" &&
                    component.user.id !== recipient.id
                ) {
                    await component.reply(
                        "You are not the recipient",
                        (ephemeral = true)
                    );
                } else {
                    // Trade declined
                    await component.reply("Trade declined.");
                    collector.stop();
                }
                // Stop the collector after handling the interaction
            });

            collector.on("end", (collected, reason) => {
                if (reason === "time") {
                    // Handle case when collector times out
                }
            });
        } catch (error) {
            console.error("Error executing trade command:", error);
            await interaction.editReply(
                "An error occurred while processing the trade command."
            );
        }
    },
};

async function initiateTradingStep(
    initiator,
    recipient,
    interaction,
    database
) {
    try {
        // Initialize trade state
        let tradeState = {
            initiator: {
                ready: false,
                items: [],
                cards: [],
            },
            recipient: {
                ready: false,
                items: [],
                cards: [],
            },
        };

        // Generate initial Trading Step Embeds
        let initiatorEmbed = generateTradingEmbed(
            initiator,
            tradeState.initiator
        );
        let recipientEmbed = generateTradingEmbed(
            recipient,
            tradeState.recipient
        );

        // Initial Trading Step
        let tradeStepEmbeds = [initiatorEmbed, recipientEmbed];
        let tradeStepButtons = generateTradeStepButtons();
        let tradeStepResponse = await interaction.update({
            embeds: tradeStepEmbeds,
            components: [tradeStepButtons],
        });

        // Set up collector for trading step buttons
        const buttonFilter = (component) =>
            ["trade-lock", "trade-cancel"].includes(component.customId);

        const buttonCollector =
            tradeStepResponse.createMessageComponentCollector({
                filter: buttonFilter,
                time: 180000,
            });

        buttonCollector.on("collect", async (component) => {
            if (component.customId === "trade-cancel") {
                initiatorEmbed.setColor("#FF0000");
                recipientEmbed.setColor("#FF0000");
                await component.update({
                    embeds: [initiatorEmbed, recipientEmbed],
                    components: [],
                });
                return await component.editReply("Trade declined.");
            }
            // Handle trading step buttons
            if (
                component.customId === "trade-lock" &&
                component.user.id === initiator.id
            ) {
                tradeState.initiator.ready = !tradeState.initiator.ready;
            } else if (
                component.customId === "trade-lock" &&
                component.user.id === recipient.id
            ) {
                tradeState.recipient.ready = !tradeState.recipient.ready;
            }

            initiatorEmbed.setDescription(
                getTradeStepDescription(initiator, tradeState.initiator)
            );
            recipientEmbed.setDescription(
                getTradeStepDescription(recipient, tradeState.recipient)
            );

            await component.update({
                embeds: [initiatorEmbed, recipientEmbed],
                components: [generateTradeStepButtons()],
            });

            if (tradeState.initiator.ready && tradeState.recipient.ready) {
                tradeCompleted = true;

                // Explicitly end the collector when both users have locked their trade
                buttonCollector.stop();
            }
        });

        buttonCollector.on("end", async (collected, reason) => {
            if (reason === "time") {
            } else {
                // Trade completed, update inventories
                const initiatorInventory = await database.getUserItems(
                    initiator.id
                );
                const recipientInventory = await database.getUserItems(
                    recipient.id
                );

                // Move items from initiator to recipient
                for (const item of tradeState.initiator.items) {
                    const existingItem = initiatorInventory.find(
                        (invItem) => invItem.name === item.name
                    );

                    if (existingItem) {
                        // Update existing item quantity
                        existingItem.amount -= item.quantity;

                        // Remove item if quantity is 0
                        if (existingItem.amount <= 0) {
                            initiatorInventory.splice(
                                initiatorInventory.indexOf(existingItem),
                                1
                            );
                        }
                    }

                    // Add item to recipient
                    const recipientItem = recipientInventory.find(
                        (invItem) => invItem.name === item.name
                    );

                    if (recipientItem) {
                        // Update existing item quantity
                        recipientItem.amount += item.quantity;
                    } else {
                        // Add new item to recipient
                        recipientInventory.push({
                            name: item.name,
                            amount: item.quantity,
                        });
                    }
                }

                // Move items from recipient to initiator
                for (const item of tradeState.recipient.items) {
                    const existingItem = recipientInventory.find(
                        (invItem) => invItem.name === item.name
                    );

                    if (existingItem) {
                        // Update existing item quantity
                        existingItem.amount -= item.quantity;

                        // Remove item if quantity is 0
                        if (existingItem.amount <= 0) {
                            recipientInventory.splice(
                                recipientInventory.indexOf(existingItem),
                                1
                            );
                        }
                    }

                    // Add item to initiator
                    const initiatorItem = initiatorInventory.find(
                        (invItem) => invItem.name === item.name
                    );

                    if (initiatorItem) {
                        // Update existing item quantity
                        initiatorItem.amount += item.quantity;
                    } else {
                        // Add new item to initiator
                        initiatorInventory.push({
                            name: item.name,
                            amount: item.quantity,
                        });
                    }
                }

                // Save the updated inventories
                await database.updateUserItems(
                    initiator.id,
                    initiatorInventory
                );
                await database.updateUserItems(
                    recipient.id,
                    recipientInventory
                );
                await database.tradeCards(
                    initiator.id,
                    recipient.id,
                    tradeState.initiator.cards,
                    tradeState.recipient.cards
                );
                await interaction.client.database.addStats(
                    recipient.id,
                    "Trade completed",
                    1
                );
                await interaction.client.database.addStats(
                    initiator.id,
                    "Trade completed",
                    1
                );
                interaction.followUp("Trade completed!");
            }
        });

        // Set up collector for trading step messages
        const messageFilter = (message) => !message.author.bot;
        const messageCollector = interaction.channel.createMessageCollector({
            filter: messageFilter,
            time: 180000,
        });

        messageCollector.on("collect", async (message) => {
            // Handle trading step messages
            if (
                message.author.id === initiator.id &&
                !tradeState.initiator.ready
            ) {
                const [itemsToAdd, cardsToAdd] = parseTradeItems(
                    message.content
                );
                console.log(itemsToAdd + "llll" + cardsToAdd);
                const hasItems = await hasRequiredItems(
                    initiator.id,
                    itemsToAdd
                );
                const hasCards = await database.userHasAllCards(
                    initiator.id,
                    cardsToAdd
                );
                if (
                    !hasCards ||
                    _.intersection(tradeState.recipient.cards, cardsToAdd)
                        .length > 0
                ) {
                    return;
                }
                if (
                    cardsToAdd.length > 0 &&
                    hasCards &&
                    !(await database.checkTradeLicense(initiator.id))
                ) {
                    const noLicense = new EmbedBuilder()
                        .setColor("#FF0000") // Red
                        .setTitle("No Trade License")
                        .setDescription(
                            `<@${initiator.id}>, you need a Trade License to trade cards.`
                        );
                    interaction.followUp({
                        embeds: [noLicense],
                    });
                    return;
                }

                if (!hasItems) {
                    // Send embed indicating insufficient items and ignore the message
                    const insufficientItemsEmbed = new EmbedBuilder()
                        .setColor("#FF0000") // Red
                        .setTitle("Insufficient Items")
                        .setDescription(
                            `<@${initiator.id}>, you don't have the required items or quantity for the trade.`
                        );
                    interaction.followUp({
                        embeds: [insufficientItemsEmbed],
                    });
                    return;
                }
                tradeState.initiator.items.push(...itemsToAdd);
                tradeState.initiator.cards.push(...cardsToAdd);
            } else if (
                message.author.id === recipient.id &&
                !tradeState.recipient.ready
            ) {
                const [itemsToAdd, cardsToAdd] = parseTradeItems(
                    message.content
                );
                const hasItems = await hasRequiredItems(
                    recipient.id,
                    itemsToAdd
                );
                const hasCards = await database.userHasAllCards(
                    recipient.id,
                    cardsToAdd
                );
                if (
                    !hasCards ||
                    _.intersection(tradeState.recipient.cards, cardsToAdd)
                        .length > 0
                ) {
                    return;
                }
                if (
                    cardsToAdd.length > 0 &&
                    hasCards &&
                    !(await database.checkTradeLicense(recipient.id))
                ) {
                    const noLicense = new EmbedBuilder()
                        .setColor("#FF0000") // Red
                        .setTitle("No Trade License")
                        .setDescription(
                            `<@${initiator.id}>, you need a Trade License to trade cards.`
                        );
                    interaction.followUp({
                        embeds: [noLicense],
                    });
                    return;
                }
                if (!hasItems) {
                    // Send embed indicating insufficient items and ignore the message
                    const insufficientItemsEmbed = new EmbedBuilder()
                        .setColor("#FF0000") // Red
                        .setTitle("Insufficient Items")
                        .setDescription(
                            `<@${recipient.id}>, you don't have the required items or quantity for the trade.`
                        );
                    interaction.followUp({ embeds: [insufficientItemsEmbed] });
                    return;
                }
                tradeState.recipient.items.push(...itemsToAdd);
                tradeState.recipient.cards.push(...cardsToAdd);
            }

            initiatorEmbed.setDescription(
                getTradeStepDescription(initiator, tradeState.initiator)
            );
            recipientEmbed.setDescription(
                getTradeStepDescription(recipient, tradeState.recipient)
            );

            interaction.editReply({
                embeds: [initiatorEmbed, recipientEmbed],
                components: [generateTradeStepButtons()],
            });
        });
        // Helper function to check if the user has required items
        async function hasRequiredItems(userId, itemsToAdd) {
            try {
                // Retrieve user's inventory from the database
                const userInventory = await database.getUserItems(userId);

                // Check if the user has the required items and quantity in their inventory
                for (const itemToAdd of itemsToAdd) {
                    const inventoryItem = userInventory.find(
                        (invItem) => invItem.name === itemToAdd.name
                    );

                    if (
                        !inventoryItem ||
                        inventoryItem.amount < itemToAdd.quantity
                    ) {
                        return false; // User doesn't have the required items or quantity
                    }
                }

                return true; // User has the required items and quantity
            } catch (error) {
                console.error("Error checking required items:", error);
                return false; // Assume error means user doesn't have the required items
            }
        }

        messageCollector.on("end", async (collected, reason) => {
            if (reason === "time") {
            }
        });
    } catch (error) {
        console.error("Error during trading step:", error);
        await interaction.editReply(
            "An error occurred during the trading step."
        );
    }
}
// ... (Previous code)

// Helper function to generate trade request embed
function generateTradeRequestEmbed(recipient, initiator) {
    return new EmbedBuilder()
        .setTitle("Trade Request")
        .setDescription(
            `${recipient}, would you like to trade with ${initiator}?`
        );
}

// Helper function to generate trade request buttons
function generateTradeRequestButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("trade-accept")
            .setLabel("✅")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("trade-decline")
            .setLabel("❌")
            .setStyle(ButtonStyle.Danger)
    );
}

// Helper function to generate trading step embed
function generateTradingEmbed(user, tradeState) {
    const status = tradeState.ready ? "+ Locked +" : "- Not Ready -";
    const itemsString = tradeState.items
        .map((item) => `${item.quantity} ${item.name}`)
        .join("\n");

    return new EmbedBuilder()
        .setColor(tradeState.ready ? "#FFFF00" : "#808080")
        .setTitle(user.username)
        .setDescription(
            `\`\`\`diff\n${status}\n${itemsString || "No items"}\`\`\``
        );
}

// Helper function to generate trading step buttons
function generateTradeStepButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("trade-lock")
            .setLabel("🔒 Lock Trade")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("trade-cancel")
            .setLabel("❌ Cancel")
            .setStyle(ButtonStyle.Primary)
    );
}

function parseTradeItems(input) {
    const itemsArray = input.split(",");

    const items = [];
    const cards = [];

    itemsArray.forEach((item) => {
        const parts = item.trim().split(" ");
        const quantity = parseInt(parts[0], 10);
        let name = parts.slice(1).join(" ");
        // Convert item name to lowercase for case-insensitive comparison
        const capName = _.capitalize(name);

        // Check if the item is valid based on items.json (case-insensitive)
        const isValidItem = capName in itemsData;
        if (isValidItem) {
            items.push({ quantity, name: capName });
        } else if (item.length === 8) {
            // If not a valid item and the name is exactly 8 characters, assume it's a card
            cards.push(item);
        }
        // Ignore other cases (invalid items and non-card names)
    });
    console.log(items, cards);

    return [items, cards];
}
// Helper function to get trade step description
function getTradeStepDescription(user, tradeState) {
    const status = tradeState.ready ? "+ Locked +" : "- Not Ready -";
    const itemsString = tradeState.items
        .map((item) => `${item.quantity} ${item.name}`)
        .join("\n");
    const cardsString = tradeState.cards.map((item) => `${item}`).join("\n");

    return `\`\`\`diff\n${status}\n${itemsString || "No items"}\n${
        cardsString || ""
    }\`\`\``;
}

// ... (Continuation of the previous code)
