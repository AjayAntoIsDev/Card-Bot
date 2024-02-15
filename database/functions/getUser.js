const mongoose = require("mongoose");

async function getUser(clientId,User) {
    try {
        const document = await User.findOne({ clientId: clientId });

        if (document) {
            return document;
        } else {
            return null;
        }
    } catch (error) {
        console.error(error);
        return error;
    }
}

module.exports = getUser