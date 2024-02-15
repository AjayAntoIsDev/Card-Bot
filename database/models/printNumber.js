const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cardSchema = new Schema(
    {
        name: String,
        print: Number,
    },
    { timestamps: true }
);

const Card = mongoose.model("card", cardSchema);
module.exports = Card;
