const {
    SlashCommandBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    awaitMessageComponent,
} = require("discord.js");
const fs = require("fs");
const items = require("../../items.json");
const upgradeConfig = require("../../upgrade.json");
const {
    isUserBlacklisted,
    isGuildBlacklisted,
} = require("../../blacklistChecker");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("upgrade")
        .setDescription("Upgrade the rarity of a card")
        .addStringOption((option) =>
            option
                .setName("card")
                .setDescription("The code of the card to upgrade")
                .setRequired(true)
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
        const getStarEmojis = (rarity) => {
            const maxStars = 4;
            const filledStars = Math.min(rarity, maxStars);
            const emptyStars = Math.max(maxStars - filledStars, 0);
            return "★".repeat(filledStars) + "☆".repeat(emptyStars);
        };

        try {
            await interaction.deferReply();
            const database = interaction.client.database;
            const userId = interaction.user.id;
            const cardCode = interaction.options.getString("card");
            const cardDetails = await database.getCardDetails(cardCode);

            // Step 1: Confirmation Step
            const confirmationEmbed = await generateConfirmationEmbed(
                userId,
                cardCode
            );
            const confirmationButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("upgrade-confirm")
                    .setLabel("🔨")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("upgrade-cancel")
                    .setLabel("❌")
                    .setStyle(ButtonStyle.Danger)
            );
            const response = await interaction.editReply({
                embeds: [confirmationEmbed],
                components: [confirmationButtons],
            });

            try {
                const buttonInteraction = await response.awaitMessageComponent({
                    time: 60_000,
                });

                if (buttonInteraction.customId === "upgrade-confirm") {
                    // Step 2: Upgrading Step
                    await interaction.editReply({
                        embeds: [generateUpgradingEmbed(cardCode)],
                        components: [],
                    });

                    // Check if the user has the required items
                    const requiredItems = getRequiredItemsForUpgrade(
                        cardDetails.rarity
                    );
                    const userItems = await database.getUserItems(userId);

                    if (!hasRequiredItems(userItems, requiredItems)) {
                        // User does not have the required items
                        const noItemsEmbed = new EmbedBuilder()
                            .setColor("#FF0000") // Red
                            .setTitle("Card Upgrade")
                            .setDescription(
                                `<@${userId}>, You don't have the required items to upgrade the card.\n\n**The upgrade was canceled.**`
                            );

                        await interaction.editReply({
                            embeds: [noItemsEmbed],
                            components: [],
                        });
                        return;
                    }

                    // Simulate upgrading for 4 seconds
                    await new Promise((resolve) => setTimeout(resolve, 4000));

                    // Step 3: Result Step
                    const upgradeSuccess = didUpgradeSucceed();
                    const updatedCardDetails = await database.getCardDetails(
                        cardCode
                    );
                    await database.deductItemsForUpgrade(userId, requiredItems);
                    // update card rarity based on the upgrade result
                    if (upgradeSuccess) {
                        await interaction.client.database.addStats(
                            interaction.user.id,
                            "Successful upgrades",
                            1
                        );
                        await database.updateCardRarity(
                            cardCode,
                            updatedCardDetails.rarity + 1
                        );
                    } else {
                        await interaction.client.database.addStats(
                            interaction.user.id,
                            "Failed upgrades",
                            1
                        );
                    }

                    const resultEmbed = generateResultEmbed(
                        userId,
                        updatedCardDetails,
                        upgradeSuccess
                    );
                    await interaction.editReply({
                        embeds: [resultEmbed],
                        components: [],
                    });
                } else if (buttonInteraction.customId === "upgrade-cancel") {
                    // Upgrade canceled
                    await interaction.editReply("Upgrade canceled.");
                }
            } catch (e) {
                console.error(e);
                const cancelledEmbed = new EmbedBuilder()
                    .setColor("#FF0000") // Red
                    .setTitle("Card Upgrade")
                    .setDescription("Upgrade canceled due to inactivity.");
                await interaction.editReply({
                    embeds: [cancelledEmbed],
                    components: [],
                });
            }

            async function generateConfirmationEmbed(userId, cardCode) {
                try {
                    if (!cardDetails) {
                        // Handle if card details are not found
                        return new EmbedBuilder()
                            .setColor("#FF0000") // Red
                            .setTitle("Card Upgrade")
                            .setDescription("Card details not found.");
                    }

                    if (cardDetails.rarity >= upgradeConfig.maxRarity) {
                        // Card is already at max rarity
                        return new EmbedBuilder()
                            .setColor("#008000") // Green
                            .setTitle("Card Upgrade")
                            .setDescription(
                                `Upgrade canceled. The card \`${cardCode}\` is already at its max rarity.`
                            );
                    }

                    const requiredItems = getRequiredItemsForUpgrade(
                        cardDetails.rarity
                    );
                    const successRate = getUpgradeSuccessRate(
                        cardDetails.rarity
                    );

                    return new EmbedBuilder()
                        .setColor("#808080") // Purple
                        .setTitle("Card Upgrade")
                        .setDescription(
                            `Upgrading \`${cardCode}\` from \`${getStarEmojis(
                                cardDetails.rarity
                            )}\` to \`${getStarEmojis(
                                cardDetails.rarity + 1
                            )}\` has a ${successRate}% chance of succeeding. If the upgrade fails, the card's rarity will not change.\n\nAttempting the upgrade will cost the following:\n${formatRequiredItemsForEmbed(
                                requiredItems
                            )}\n\nUse the 🔨 button to upgrade.`
                        )
                        .setThumbnail(cardDetails.image);
                } catch (error) {
                    console.error(
                        "Error generating confirmation embed:",
                        error
                    );
                    return new EmbedBuilder()
                        .setColor("#FF0000") // Red
                        .setTitle("Card Upgrade")
                        .setDescription(
                            "An error occurred while generating confirmation."
                        );
                }
            }

            function generateUpgradingEmbed(cardCode) {
                return new EmbedBuilder()
                    .setColor("#FFFF00") // Yellow
                    .setTitle("Card Upgrade")
                    .setDescription(`Attempting to upgrade \`${cardCode}\`...`);
            }

            function didUpgradeSucceed() {
                const successRate = Math.random() * 100;
                return successRate <= getUpgradeSuccessRate(cardDetails.rarity);
            }

            function getUpgradeSuccessRate(currentRarity) {
                return (
                    upgradeConfig.baseSuccessRate -
                    upgradeConfig.successRateDecreasePerRarity * currentRarity
                );
            }

            function getRequiredItemsForUpgrade(currentRarity) {
                const requiredCurrency =
                    upgradeConfig.baseCurrency * Math.pow(2, currentRarity);
                return [
                    {
                        name: upgradeConfig.currencyItemName,
                        amount: requiredCurrency,
                    },
                ];
            }

            function formatRequiredItemsForEmbed(requiredItems) {
                return (
                    "```" +
                    requiredItems
                        .map((item) => `${item.name}: ${item.amount}`)
                        .join("\n") +
                    "```"
                );
            }

            function hasRequiredItems(userItems, requiredItems) {
                for (const requiredItem of requiredItems) {
                    const userItem = userItems.find(
                        (item) => item.name === requiredItem.name
                    );
                    if (!userItem || userItem.amount < requiredItem.amount) {
                        return false;
                    }
                }
                return true;
            }

            function generateResultEmbed(userId, cardDetails, upgradeSuccess) {
                const embed = new EmbedBuilder().setTitle("Card Upgrade");

                if (upgradeSuccess) {
                    embed
                        .setColor("#008000") // Green
                        .setDescription(
                            `The upgrade succeeded! The card \`${
                                cardDetails.code
                            }\` has been upgraded from \`${getStarEmojis(
                                cardDetails.rarity
                            )}\` to \`${getStarEmojis(
                                cardDetails.rarity + 1
                            )}\`.`
                        );
                } else {
                    embed
                        .setColor("#FF0000") // Red
                        .setDescription(
                            `The upgrade failed! The card \`${cardDetails.code}\`'s rarity has not been changed.`
                        );
                }

                return embed;
            }
        } catch (error) {
            console.error("Error executing upgrade command:", error);
            await interaction.editReply(
                "An error occurred while processing the upgrade command."
            );
        }
    },
};
