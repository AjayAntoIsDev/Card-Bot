const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
} = require("discord.js");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const crypto = require("crypto");
const {
    isUserBlacklisted,
    isGuildBlacklisted,
} = require("../../blacklistChecker");

// Map to track user cooldowns
const userCooldowns = new Map();

// Load card data from cards.json
const cardDatabasePath = "./cards.json";
const cardDatabase = JSON.parse(fs.readFileSync(cardDatabasePath, "utf-8"));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("drop")
        .setDescription("Drops 3 random cards"),
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
        const cooldownDuration = 600000; // 10 minutes in milliseconds

        await interaction.deferReply();

        const randomCards = await getRandomCards(3);
        const cardWidth = 273;
        const cardHeight = 403;
        const gapBetweenCards = 20;

        const canvasWidth =
            (cardWidth + gapBetweenCards) * randomCards.length -
            gapBetweenCards;
        const canvasHeight = cardHeight;
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext("2d");

        // Load and draw each card onto the canvas
        for (let i = 0; i < randomCards.length; i++) {
            const card = randomCards[i];
            const cardImagePath = cardDatabase[card];
            const cardImage = await loadImage(cardImagePath);

            // Adjust the x-coordinate based on the gap and card width
            const xCoordinate = i * (cardWidth + gapBetweenCards);

            ctx.drawImage(cardImage, xCoordinate, 0, cardWidth, cardHeight);
        }

        // Save the combined image
        const combinedImagePath = "./combinedImage.png";
        const out = fs.createWriteStream(combinedImagePath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
out.on("finish", async () => {
    // Create buttons
    const card1 = new ButtonBuilder()
        .setCustomId("card1")
        .setLabel("Card 1")
        .setStyle(ButtonStyle.Primary);

    const card2 = new ButtonBuilder()
        .setCustomId("card2")
        .setLabel("Card 2")
        .setStyle(ButtonStyle.Primary);

    const card3 = new ButtonBuilder()
        .setCustomId("card3")
        .setLabel("Card 3")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(card1, card2, card3);

    // Send the initial reply with the combined image and buttons
    await sendCombinedImage(interaction, combinedImagePath, row);

    // Set up a collector to listen for button interactions
    const collector = interaction.channel.createMessageComponentCollector({
        filter: (interaction) =>
            interaction.customId.startsWith("card") &&
            interaction.user.id === interaction.user.id,
        time: 60000,
    });

    collector.on("collect", async (buttonInteraction) => {
        // Check if user is on cooldown
        if (userCooldowns.has(buttonInteraction.user.id)) {
            const timeLeft =
                cooldownDuration -
                (Date.now() - userCooldowns.get(buttonInteraction.user.id));
            return buttonInteraction.reply({
                content: `You're on cooldown. Please wait ${
                    timeLeft / 1000
                } seconds before grabbing another card.`,
                ephemeral: true,
            });
        }

        const selectedCard = buttonInteraction.customId.replace("card", "");
        const code = crypto.randomBytes(4).toString("hex");

        await buttonInteraction.deferUpdate();
        await interaction.client.database.addNewCard(
            buttonInteraction.user.id,
            randomCards[selectedCard - 1],
            code
        );

        row.components[selectedCard - 1].setDisabled(true);

        await buttonInteraction.editReply({
            content: `<@${buttonInteraction.user.id}> took the **${
                randomCards[selectedCard - 1]
            }** card ${code}`,
            components: [row],
        });
                        await interaction.client.database.addStats(
                            buttonInteraction.user.id,
                            "Cards grabbed",
                            1
                        );
        // Set user cooldown
        userCooldowns.set(buttonInteraction.user.id, Date.now());

        // Remove the temporary combined image file
        if (fs.existsSync(combinedImagePath)) {
            fs.unlinkSync(combinedImagePath);
        } else {
            console.error(`File ${combinedImagePath} does not exist.`);
        }
    });

    collector.on("end", (collected) => {
        if (collected.size === 0) {
            interaction.editReply({
                content:
                    "Card selection not received within 1 minute, cancelling",
                components: [],
            });
        }
    });
});
    },
};

async function sendCombinedImage(interaction, combinedImagePath, row) {
    return new Promise(async (resolve, reject) => {
        const userPing = `<@${interaction.user.id}>`;
        const content = `${userPing} is dropping three cards`;
                        await interaction.client.database.addStats(
                            interaction.user.id,
                            "Cards dropped",
                            3
                        );
        // Send the initial reply with the combined image and buttons
        interaction
            .editReply({
                content,
                files: [combinedImagePath],
                components: [row],
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    });
}

async function getRandomCards(n) {
    const cardNames = Object.keys(cardDatabase);
    const shuffledCardNames = cardNames.sort(() => 0.5 - Math.random());
    return shuffledCardNames.slice(0, n);
}
