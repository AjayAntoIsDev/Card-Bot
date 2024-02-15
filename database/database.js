const mongoose = require("mongoose");
const User = require("./models/user");
const Card = require("./models/card");

class Database {
    constructor(databaseURI) {
        this.URI = databaseURI;
    }

    async connect() {
        try {
            const result = await mongoose.connect(this.URI);
        } catch (err) {
            console.error(err);
        }
    }

    async createEmptyUserIfExists(clientId) {
        try {
            const exists = await User.exists({ clientId: clientId });

            if (!exists) {
                const user = new User({
                    clientId: clientId,
                    gems: 0,
                    tickets: 0,
                    gold: 0,
                    cardsCollection: [],
                });

                await user.save();
            }
        } catch (error) {
            console.error(error);
        }
    }

    async addNewCard(clientId, name, code) {
        try {
            let user = await User.findOne({ clientId: clientId });

            if (!user) {
                await this.createEmptyUserIfExists(clientId);
                user = await User.findOne({ clientId: clientId });
            }

            const newCard = new Card({
                owner: clientId,
                name: name,
                code: code,
                rarity: Math.floor(Math.random() * 4) + 1,
                print: await this.getNextPrintNumber(name),
            });

            await newCard.save();
            user.cardsCollection.push(code);
            await user.save();
        } catch (error) {
            console.error(error);
        }
    }

    async getNextPrintNumber(name) {
        try {
            const existingCard = await Card.findOne({ name: name }).sort({
                print: -1,
            });

            if (existingCard) {
                return existingCard.print + 1;
            } else {
                return 1;
            }
        } catch (error) {
            console.error(error);
            return error;
        }
    }

    async getUser(clientId) {
        try {
            return await User.findOne({ clientId: clientId });
        } catch (error) {
            console.error(error);
            return error;
        }
    }
    async getCardDetails(code) {
        try {
            // Assuming 'Card' is your card schema model
            const cardDetails = await Card.findOne({ code: code });
            return cardDetails;
        } catch (error) {
            console.error("Error fetching card details:", error);
            return null;
        }
    }
    async getUserByCardCode(cardCode) {
        try {
            // Assuming 'Card' is your card schema model and 'User' is your user schema model
            const cardDetails = await Card.findOne({ code: cardCode });

            if (cardDetails) {
                const ownerUserId = cardDetails.owner; // Assuming the 'owner' field in cardSchema represents the user ID
                const ownerUser = await User.findOne({ clientId: ownerUserId });
                return ownerUser;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error fetching user by card code:", error);
            return null;
        }
    }
}

module.exports = Database;
