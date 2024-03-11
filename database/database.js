const mongoose = require("mongoose");
const User = require("./models/user");
const Card = require("./models/card");
const fs = require("fs")
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

    async addItemToInventory(clientId, itemName, amount) {
        try {
            const user = await User.findOne({ clientId: clientId });

            if (!user) {
                await this.createEmptyUserIfExists(clientId);
                user = await User.findOne({ clientId: clientId });
            }

            // Load items.json file
            const itemsFilePath = "./items.json";
            const itemsData = JSON.parse(
                fs.readFileSync(itemsFilePath, "utf-8")
            );

            // Check if the item exists in items.json
            const itemInfo = itemsData[itemName];
            if (itemInfo) {
                // Add the item to the user's inventory or update the amount if it already exists
                let existingItem = user.inventory.find(
                    (item) => item.name === itemName
                );
                if (existingItem) {
                    existingItem.amount += amount;
                } else {
                    user.inventory.push({
                        name: itemName,
                        emoji: itemInfo.emoji,
                        amount: amount,
                    });
                }

                // Save the user document
                await user.save();
            }
        } catch (error) {
            console.error(error);
        }
    }

    async addStats(clientId, statName, amount) {
        try {
            const user = await User.findOne({ clientId: clientId });

            if (!user) {
                await this.createEmptyUserIfExists(clientId);
                user = await User.findOne({ clientId: clientId });
            }

            // Check if the item exists in items.json

            // Add the item to the user's inventory or update the amount if it already exists
            let existingStat = user.stats.find(
                (item) => item.name === statName
            );
            if (existingStat) {
                existingStat.amount += amount;
            } else {
                user.stats.push({
                    name: statName,
                    amount: amount,
                });
            }

            // Save the user document
            await user.save();
        } catch (error) {
            console.error(error);
        }
    }

    async checkTradeLicense(clientId){
                try {
                    const user = await User.findOne({ clientId: clientId });

                    if (!user) {
                        await this.createEmptyUserIfExists(clientId);
                        user = await User.findOne({ clientId: clientId });
                    }

                    // Check if the item exists in items.json

                    // Add the item to the user's inventory or update the amount if it already exists
                    let hasLicense = user.inventory.find(
                        (item) => item.name === "Trade License"
                    );
                    if (hasLicense) {
                        return true;
                    } else{
                        return false;
                    }

                    // Save the user document
                } catch (error) {
                    console.error(error);
                }
    }
    async deductItemsForUpgrade(clientId, items) {
        try {
            const user = await User.findOne({ clientId: clientId });

            if (!user) {
                await this.createEmptyUserIfExists(clientId);
                user = await User.findOne({ clientId: clientId });
            }

            for (const item of items) {
                const inventoryItem = user.inventory.find(
                    (invItem) => invItem.name === item.name
                );

                if (inventoryItem) {
                    inventoryItem.amount -= item.amount;

                    // Remove item from inventory if amount reaches 0
                    if (inventoryItem.amount <= 0) {
                        user.inventory = user.inventory.filter(
                            (invItem) => invItem.name !== item.name
                        );
                    }
                }
            }

            await user.save();
        } catch (error) {
            console.error(error);
        }
    }

    async updateCardRarity(cardCode, newRarity) {
        try {
            const card = await Card.findOne({ code: cardCode });

            if (card) {
                card.rarity = newRarity;
                await card.save();
            }
        } catch (error) {
            console.error(error);
        }
    }
    async getUserItems(clientId) {
        try {
            const user = await User.findOne({ clientId: clientId });

            if (user) {
                return user.inventory; // Ensure this line returns the 'inventory' field
            } else {
                // If the user doesn't exist, return an empty array
                return [];
            }
        } catch (error) {
            console.error(error);
            return [];
        }
    }
    async updateUserItems(clientId, updatedInventory) {
        try {
            const user = await User.findOne({ clientId: clientId });
            user.inventory = updatedInventory;
            await user.save();
        } catch (error) {
            console.error("Error updating user items:", error);
        }
    }
    async tradeCards(initiatorId, recipientId, initiatorCards, recipientCards) {
        try {
            // Ensure both users exist in the database
            await this.createEmptyUserIfExists(initiatorId);
            await this.createEmptyUserIfExists(recipientId);

            // Check if both users have the required cards
            const initiatorHasAllCards = await this.userHasAllCards(
                initiatorId,
                initiatorCards
            );
            const recipientHasAllCards = await this.userHasAllCards(
                recipientId,
                recipientCards
            );

            if (initiatorHasAllCards && recipientHasAllCards) {
                // Proceed with the card trade logic
                await this.transferCards(
                    initiatorId,
                    recipientId,
                    initiatorCards
                );
                await this.transferCards(
                    recipientId,
                    initiatorId,
                    recipientCards
                );

                return { success: true, message: "Trade successful." };
            } else {
                // Users don't have the required cards
                return {
                    success: false,
                    message:
                        "Trade canceled. Users do not have the required cards.",
                };
            }
        } catch (error) {
            console.error("Error during card trade:", error);
            return {
                success: false,
                message: "An error occurred during the card trade.",
            };
        }
    }

    async transferCards(sourceClientId, destinationClientId, cards) {
        try {
            const sourceUser = await User.findOne({ clientId: sourceClientId });
            const destinationUser = await User.findOne({
                clientId: destinationClientId,
            });

            if (sourceUser && destinationUser) {
                // Remove cards from the source user
                sourceUser.cardsCollection = sourceUser.cardsCollection.filter(
                    (cardCode) => !cards.includes(cardCode)
                );

                // Add cards to the destination user
                destinationUser.cardsCollection.push(...cards);

                // Save changes to the database
                await sourceUser.save();
                await destinationUser.save();
            }
        } catch (error) {
            console.error("Error transferring cards:", error);
        }
    }

    // ... (Existing functions)

    async userHasAllCards(clientId, cardList) {
        try {
            const user = await User.findOne({ clientId });

            if (!user) {
                await this.createEmptyUserIfExists(clientId);
                return false;
            }

            // Check if all specified cards are present in the user's cardsCollection
            return cardList.every((cardCode) =>
                user.cardsCollection.includes(cardCode)
            );
        } catch (error) {
            console.error("Error checking user cards:", error);
            return false;
        }
    }
}

module.exports = Database;
