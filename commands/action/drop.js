const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
} = require("discord.js");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const crypto = require("crypto")

// Load card data from cards.json
const cardDatabasePath = "./cards.json";
const cardDatabase = JSON.parse(fs.readFileSync(cardDatabasePath, "utf-8"));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("drop")
        .setDescription("Drops 3 random cards"),
    async execute(interaction) {
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

        out.on("finish", async () => {
            // Ping the user who triggered the command
            const userPing = `<@${interaction.user.id}>`;
            // Send the combined image
            const response = await interaction.editReply({
                content: `${userPing} is dropping three cards`,
                files: [combinedImagePath],
                components: [row],
            });

            try {
                const cardSelection = await response.awaitMessageComponent({
                    time: 60_000,
                });
                if (cardSelection.customId === "card1") { 
                    const code =  crypto.randomBytes(4).toString("hex")
                    await cardSelection.deferUpdate();
                    await interaction.client.database
                        .addNewCard(cardSelection.user.id, randomCards[0],code)
                        .then(async (result) => {
                            row.components[0].setDisabled(true);
                            await cardSelection.editReply({
                                content: `<@${cardSelection.user.id}> took the **${randomCards[0]}** card ${code}`,
                                components: [row],
                            });
                        })
                        .catch((error) => {
                            console.error("Error adding a new card:", error);
                        });
                } else if (cardSelection.customId === "card2") {  
                    const code =  crypto.randomBytes(4).toString("hex")
                    await cardSelection.deferUpdate();
                    await interaction.client.database
                        .addNewCard(cardSelection.user.id, randomCards[1],code)
                        .then(async (result) => {
                            row.components[1].setDisabled(true);
                            await cardSelection.editReply({
                                content: `<@${cardSelection.user.id}> took the **${randomCards[1]}** card ${code}`,
                                components: [row],
                            });
                        })
                        .catch((error) => {
                            console.error("Error adding a new card:", error);
                        });
                } else if (cardSelection.customId === "card3") {
                    const code =  crypto.randomBytes(4).toString("hex")
                    await cardSelection.deferUpdate();
                    await interaction.client.database
                        .addNewCard(cardSelection.user.id, randomCards[2],code)
                        .then(async (result) => {
                            row.components[2].setDisabled(true);
                            await cardSelection.editReply({
                                content: `<@${cardSelection.user.id}> took the **${randomCards[2]}** card ${code}`,
                                components: [row],
                            });
                        })
                        .catch((error) => {
                            console.error("Error adding a new card:", error);
                        });
                }
            } catch (e) {
                console.error(e);
                await interaction.editReply({
                    content:
                        "cardSelection not received within 1 minute, cancelling",
                    components: [],
                });
            }
            // Remove the temporary combined image file
            fs.unlinkSync(combinedImagePath);
        });
    },
};

async function getRandomCards(n) {
    const cardNames = Object.keys(cardDatabase);
    const shuffledCardNames = cardNames.sort(() => 0.5 - Math.random());
    return shuffledCardNames.slice(0, n);
}
