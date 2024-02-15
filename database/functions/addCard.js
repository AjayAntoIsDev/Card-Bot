const mongoose = require("mongoose");

async function addCard(clientId, cardInfo, User) {
    try {
        const user = await User.findOne({ clientId: clientId });

        if (!user) {
            return "User not found";
        }

        const newCard = {
            name: cardInfo.name,
            code: cardInfo.code,
            rarity: cardInfo.rarity,
            print: cardInfo.print,
        };

        user.cardsCollection.set(newCard.code, newCard);

        const result = await user.save();
        return result;
    } catch (error) {
        console.error(error);
        return error;
    }
}
module.exports = addCard