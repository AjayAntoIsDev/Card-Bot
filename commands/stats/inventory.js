const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("Displays gems, tickets, and gold"),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const userData = await interaction.client.database.getUser(
                interaction.user.id
            );

            const embed = new EmbedBuilder().setAuthor({
                name: "Inventory",
            });

            if (userData) {
                const gems = userData.gems || 0;
                const tickets = userData.tickets || 0;
                const gold = userData.gold || 0;

                const fields = [];

                if (gems > 0) {
                    fields.push(`💎 Gems: ${gems}`);
                }

                if (tickets > 0) {
                    fields.push(`🎟️ Tickets: ${tickets}`);
                }

                if (gold > 0) {
                    fields.push(`💰 Gold: ${gold}`);
                }

                if (fields.length > 0) {
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
