const mongoose = require('mongoose');

// Schema for transactions within a trade position
const tradeTransactionSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['buy', 'sell'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    price_per_token: {
        type: Number,
        required: true
    },
    total_value_usd: {
        type: Number,
        required: true
    },
    transaction_hash: {
        type: String,
        required: true
    },
    wallet_address: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Schema for trade positions
const tradePositionSchema = new mongoose.Schema({
    token_address: {
        type: String,
        required: true
    },
    chain: {
        type: String,
        required: true
    },
    token_symbol: String,
    token_name: String,
    amount: {
        type: Number,
        default: 0
    },
    average_buy_price: {
        type: Number,
        default: 0
    },
    total_cost: {
        type: Number,
        default: 0
    },
    final_pl: Number,
    opened_at: {
        type: Date,
        default: Date.now
    },
    closed_at: Date,
    transactions: [tradeTransactionSchema]
});

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
    evm_wallets: [evmWalletSchema],
    trade_positions: [tradePositionSchema], // Added trade positions array
    
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
    },
    
    // Settings
    settings: {
        language: {
            type: String,
            default: 'en'
        },
        notifications: {
            trade_alerts: {
                type: Boolean,
                default: true
            },
            price_alerts: {
                type: Boolean,
                default: true
            }
        }
    }
}, { timestamps: true });

// Indexes for faster queries
userSchema.index({ referral_code: 1 }, { unique: true, sparse: true });
userSchema.index({ 'evm_wallets.name': 1, telegram_id: 1 }, { unique: true });
userSchema.index({ 'trade_positions.token_address': 1, 'trade_positions.chain': 1 });
userSchema.index({ 'trade_positions.opened_at': 1 });
userSchema.index({ 'trade_positions.closed_at': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;