const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inventoryItemSchema = new Schema({
    name: String,
    emoji: String,
    amount: Number,
    rarity:Number,
});

const statsSchema = new Schema({
    name: String,
    amount: Number,
});

const userSchema = new Schema(
    {
        clientId: {
            type: String,
            required: true,
        },
        inventory: [inventoryItemSchema],
        stats:[statsSchema],
        cardsCollection: {
            type: [String],
        },
    },
    { timestamps: true }
);

const User = mongoose.model("user", userSchema);
module.exports = User;
