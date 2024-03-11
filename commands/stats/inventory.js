const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    isUserBlacklisted,
    isGuildBlacklisted,
} = require("../../blacklistChecker");
const itemJSON = require("../../items.json"
)
module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("Displays gems, tickets, and gold")
        .addUserOption((option) =>
            option.setName("user").setDescription("The user to view inventory")
        ),
    async execute(interaction) {
        if (isGuildBlacklisted(interaction.guild?.id)) {
            return interaction.reply(
                "You are blacklisted from using this bot in this server."
            );
        }

        if (isUserBlacklisted(interaction.user.id)) {
            return interaction.reply(
                "You are blacklisted from using this bot."
            );
        }

        try {
                                    const getStarEmojis = (rarity) => {
                                        const maxStars = 4;
                                        const filledStars = Math.min(
                                            rarity,
                                            maxStars
                                        );
                                        const emptyStars = Math.max(
                                            maxStars - filledStars,
                                            0
                                        );
                                        return (
                                            "★".repeat(filledStars) +
                                            "☆".repeat(emptyStars)
                                        );
                                    };
            await interaction.deferReply();

            let targetUser =
                interaction.options.getUser("user") || interaction.user;

            const targetUserData = await interaction.client.database.getUser(
                targetUser.id
            );

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: `${targetUser.username}'s Inventory`,
                })
                .setColor("#808080");

            if (targetUserData) {
                const inventoryItems = targetUserData.inventory || [];

                if (inventoryItems.length > 0) {
                    const fields = inventoryItems.map((item) => {
                        console.log(itemJSON[item.name])
                        let displayString = `${itemJSON[item.name]["emoji"]} **${
                            item.amount
                        }** · \`${item.name}\``;

                        // Check if the item is a "dust" item
                        if (item.name.toLowerCase() === "dust") {
                            displayString += ` (${getStarEmojis(item.rarity)})`;
                        }

                        return displayString;
                    });

                    embed.setDescription(fields.join("\n"));
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    embed.setDescription("Inventory is empty.");
                    await interaction.editReply({ embeds: [embed] });
                }
            } else {
                embed.setDescription("Inventory is empty."); // User not found, consider it as an empty inventory
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error("Error fetching inventory:", error);
            await interaction.editReply(
                "An error occurred while fetching inventory information."
            );
        }
    },
};
