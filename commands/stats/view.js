const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
} = require("discord.js");
const fs = require("fs");
const { isUserBlacklisted, isGuildBlacklisted } = require('../../blacklistChecker');

// Load the cards.json file
const cardPaths = JSON.parse(fs.readFileSync("cards.json", "utf-8"));
module.exports = {
    data: new SlashCommandBuilder()
        .setName("view")
        .setDescription("View details of a card")
        .addStringOption((option) =>
            option
                .setName("code")
                .setDescription("The code of the card to view")
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

            const cardCode = interaction.options.getString("code");
            const cardDetails =
                await interaction.client.database.getCardDetails(cardCode);

            if (cardDetails) {
                const ownerUser =
                    await interaction.client.database.getUserByCardCode(
                        cardCode
                    );
                const imageName = `${cardDetails.name.toLowerCase()}.jpg`;
                const imageURL = cardPaths[cardDetails.name];

                // Validate rarity as a number before using it
                const rarity = Number(cardDetails.rarity);
                const starEmojis = getStarEmojis(rarity);

                const detailsString = `**Owned by <@${cardDetails.owner}>**\n
                    \`${cardDetails.code}\` • \`#${cardDetails.print}\` • \`${starEmojis}\` • **\`${cardDetails.name}\`**\n`;

                const imageBuffer = fs.readFileSync(imageURL);

                // Create a MessageAttachment with the image buffer
                const imageAttachment = new AttachmentBuilder(imageURL);

                const embed = new EmbedBuilder()
                    .setTitle("Card details")
                    .setDescription(detailsString)
                    .setImage(
                        `attachment://${cardDetails.name
                            .toLowerCase()
                            .replace(/ /g, "-")}.png`
                    )
                    .setColor("#808080"); // Use the attachment name

                // Send the embed with the image attachment
                await interaction.editReply({
                    embeds: [embed],
                    files: [imageAttachment],
                });
            } else {
                await interaction.editReply("Card not found.");
            }
        } catch (error) {
            console.error("Error fetching card details:", error);
            await interaction.editReply(
                "An error occurred while fetching card details."
            );
        }
    },
};

// Function to generate star emojis based on rarity
const getStarEmojis = (rarity) => {
    const maxStars = 4;
    const filledStars = Math.min(rarity, maxStars);
    const emptyStars = Math.max(maxStars - filledStars, 0);
    return "★".repeat(filledStars) + "☆".repeat(emptyStars);
};
