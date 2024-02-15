const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Card = require("../../database/models/card"); // Import the Card model

module.exports = {
    data: new SlashCommandBuilder()
        .setName("collection")
        .setDescription(
            "Shows card collections with codes, stars, print numbers, and names"
        ),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Function to generate star emojis based on rarity
            const getStarEmojis = (rarity) => {
                const maxStars = 4;
                const filledStars = Math.min(rarity, maxStars);
                const emptyStars = Math.max(maxStars - filledStars, 0);
                return "★".repeat(filledStars) + "☆".repeat(emptyStars);
            };

            const userData = await interaction.client.database.getUser(
                interaction.user.id
            );

            const embed = new EmbedBuilder().setAuthor({
                name: `${interaction.user.username}'s Card Collection`,
                iconURL: interaction.user.displayAvatarURL(),
            });

            if (userData) {
                const cardCodes = userData.cardsCollection || [];

                if (cardCodes.length > 0) {
                    let description = "";

                    for (const code of cardCodes) {
                        const card = await getCardDetails(code);
                        if (card) {
                            const starEmojis = getStarEmojis(card.rarity);
                            description += `⬛ \`${code}\` • \`#${card.print}\` • \`${starEmojis}\` • **\`${card.name}\`**\n`;
                        }
                    }

                    embed.setDescription(description);
                } else {
                    embed.setDescription("Card collection is empty.");
                }
            } else {
                embed.setDescription("Card collection is empty.");
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error fetching card collection:", error);
            await interaction.editReply(
                "An error occurred while fetching card collection information."
            );
        }
    },
};

// Helper function to get card details using the card code
async function getCardDetails(code) {
    try {
        return await Card.findOne({ code: code });
    } catch (error) {
        console.error("Error fetching card details:", error);
        return null;
    }
}
