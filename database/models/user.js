const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
        clientId: {
            type: String,
            required: true,
        },
        gems: Number,
        tickets: Number,
        gold: Number,
        cardsCollection: {
            type: [String],
        },
    },
    { timestamps: true }
);

const User = mongoose.model("user", userSchema);
module.exports = User;
