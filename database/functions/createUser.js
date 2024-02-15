const mongoose = require("mongoose");

async function createUser(clientId, User) {
    try {
        const exists = await User.exists({ clientId: clientId });

        if (exists) {
            return "exists";
        } else {
            const user = new User({
                clientId: clientId,
                gems:0,
                tickets:0,
                gold:0,
                cardsCollection: {},
            });

            const result = await user.save();
            return result;
        }
    } catch (error) {
        console.error(error);
        return error;
    }
}

module.exports = createUser;
