const {
    SlashCommandBuilder,
    ButtonStyle,
    EmbedBuilder,
    ButtonBuilder,
    MessageComponent,
    ActionRowBuilder,
    AttachmentBuilder,
} = require("discord.js");
const fs = require("fs");

const cardPaths = JSON.parse(fs.readFileSync("cards.json", "utf-8"));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("burn")
        .setDescription("Burn a card and receive dust")
        .addStringOption((option) =>
            option
            .setName("card")
            .setDescription("The code of the card to burn")
            .setRequired(true)
        ),
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const getStarEmojis = (rarity) => {
                const maxStars = 4;
                const filledStars = Math.min(rarity, maxStars);
                const emptyStars = Math.max(maxStars - filledStars, 0);
                return "★".repeat(filledStars) + "☆".repeat(emptyStars);
            };
            const cardCode = interaction.options.getString("card");
            const userId = interaction.user.id;

            // Assume your User model is defined somewhere
            const User = require("../../database/models/user");

            const user = await User.findOne({ clientId: userId });

            if (!user) {
                await interaction.reply("User not found.");
                return;
            }

            // Check if the user has the specified card
            if (!user.cardsCollection.includes(cardCode)) {
                await interaction.reply("Card not found in user's collection.");
                return;
            }

            // Find the card in the user's collection
            const cardIndex = user.cardsCollection.indexOf(cardCode);

            // Get the rarity of the burned card (assuming 'Card' model is defined)
            const Card = require("../../database/models/card");
            const burnedCard = await Card.findOne({ code: cardCode });
            const rarity = burnedCard.rarity;

            // Generate dust with the same rarity as the burned card
            const dustAmount = 1; // You can customize this logic based on your requirements
            const cardDetails =
                await interaction.client.database.getCardDetails(cardCode);
            const imageURL = cardPaths[cardDetails.name];
            const imageAttachment = new AttachmentBuilder(imageURL);
            // Create an embed with burn details
            const burnDetailsEmbed = new EmbedBuilder()
                .setTitle("Burn Card")
                .setDescription(
                    `<@${userId}>, you will receive:\n ✨**${dustAmount}** Dust (${getStarEmojis(
                        rarity
                    )}).`
                )
                .setThumbnail(
                    `attachment://${cardDetails.name
                        .toLowerCase()
                        .replace(/ /g, "-")}.png`
                )
                .setColor("#808080");

            // Create buttons for confirmation and cancel
            const confirmationButton = new ButtonBuilder()
                .setCustomId("confirm-burn")
                .setLabel("🔥")
                .setStyle(ButtonStyle.Primary);

            const cancelButton = new ButtonBuilder()
                .setCustomId("cancel-burn")
                .setLabel("❌")
                .setStyle(ButtonStyle.Primary);

            // Create an action row with buttons
            const actionRow = new ActionRowBuilder().addComponents(
                confirmationButton,
                cancelButton
            );

            // Send the confirmation embed with buttons
            await interaction.editReply({
                embeds: [burnDetailsEmbed],
                components: [actionRow],
                files: [imageAttachment],
            });

            // Set up a collector for button interactions
            const filter = (component) => ["confirm-burn", "cancel-burn"].includes(component.customId);
            const collector =
                interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 60000,
                });

            collector.on("collect", async (button) => {
                if (button.customId === "confirm-burn") {
                    // User confirmed the burn, perform the burn logic

                    // Remove the burned card from the user's collection
                    user.cardsCollection.splice(cardIndex, 1);

                    // Remove card for db
                    try {
                        const card = burnedCard;

                        if (card) {
                            // Update the code field
                            card.code = `${Math.floor(1e99 + Math.random() * 9e99).toString()}`;

                            // Save the updated card
                            await card.save();

                            console.log(`Code of card with ID updated to ${newCode}`);
                        } else {
                            console.log('Card with ID not found.');
                        }
                    } catch (error) {
                        console.error("Error changing card code:", error.message);
                    }
                    // Find existing dust in the user's inventory
                    const existingDust = user.inventory.find(
                        (item) => item.name === "Dust" && item.rarity === rarity
                    );

                    if (existingDust) {
                        // Update existing dust amount
                        existingDust.amount += dustAmount;
                    } else {
                        // Add new dust to the user's inventory
                        user.inventory.push({
                            name: "Dust",
                            emoji: "✨", // You can customize the emoji for dust
                            amount: dustAmount,
                            rarity: rarity,
                        });
                    }

                    // Save changes to the database
                    await user.save();
                    burnDetailsEmbed
                        .setColor("#00FF00")
                        .setDescription(
                            `<@${userId}>, you will receive:\n ✨**${dustAmount}** Dust (${getStarEmojis(
                                rarity
                            )}).\n **The card has been burned.**`
                        );
                    await button.update({
                        embeds: [burnDetailsEmbed],
                        components: [actionRow],
                    });
                } else if (button.customId === "cancel-burn") {
                    // User canceled the burn
                    await interaction.editReply("Burn canceled.");
                }

                // Stop the collector
                collector.stop();
            });

            collector.on("end", () => {
                // Remove buttons after collector ends (timeout or otherwise)
                actionRow.components.forEach((component) =>
                    component.setDisabled(true)
                );
                interaction.editReply({
                    embeds: [burnDetailsEmbed],
                    components: [actionRow],
                });
            });
        } catch (error) {
            console.error("Error burning card:", error);
            await interaction.reply(
                "An error occurred while processing the burn command."
            );
        }
    },
};