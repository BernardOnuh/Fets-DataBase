// models/Wallet.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    telegram_id: {
        type: String,
        required: true,
        // Remove unique constraint
    },
    address: {
        type: String,
        required: true
    },
    private_key: {
        type: String,
        required: true
    },
    seed_phrase: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Wallet', walletSchema);
