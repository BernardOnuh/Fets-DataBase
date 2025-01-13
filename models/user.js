const mongoose = require('mongoose');

// Schema for EVM wallet
const evmWalletSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
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
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// User schema
const userSchema = new mongoose.Schema({
    telegram_id: {
        type: String,
        required: true,
        unique: true
    },
    evm_wallets: [evmWalletSchema], // Changed to array of wallets
    // Fields for referral system
    referral_code: {
        type: String,
        unique: true,
        sparse: true
    },
    referred_by: {
        type: String,
        ref: 'User'
    },
    referrals: [{
        type: String,
        ref: 'User'
    }],
    referral_count: {
        type: Number,
        default: 0
    },
    rewards_earned: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Index for faster queries
userSchema.index({ referral_code: 1 }, { unique: true, sparse: true });
userSchema.index({ 'evm_wallets.name': 1, telegram_id: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;