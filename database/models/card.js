const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cardSchema = new Schema(
    {
        owner: String,
        name: String,
        code: String,
        rarity: Number,
        print: Number,
    },
    { timestamps: true }
);

const Card = mongoose.model("card", cardSchema);
module.exports = Card;
