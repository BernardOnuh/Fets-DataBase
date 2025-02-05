const mongoose = require('mongoose');

// Transaction schema remains the same
const tradeTransactionSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['buy', 'sell'],
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    mcap: {
        type: String,
        required: true,
        set: v => v.toString()
    },
    total_value_usd: {
        type: String,
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
}, {
    strict: true,
    validateBeforeSave: true
});

// Trade position schema remains the same
const tradePositionSchema = new mongoose.Schema({
    token_address: {
        type: String,
        required: true,
        lowercase: true
    },
    chain: {
        type: String,
        required: true,
        uppercase: true
    },
    token_symbol: String,
    token_name: String,
    amount: {
        type: String,
        default: "0"
    },
    average_mcap: {
        type: String,
        default: "0"
    },
    final_pl: String,
    opened_at: {
        type: Date,
        default: Date.now
    },
    closed_at: Date,
    transactions: [tradeTransactionSchema]
}, { timestamps: true });

// Updated EVM wallet schema with settings
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
    settings: {
        slippage: {
            type: Number,
            default: 10,
            min: 0.1,
            max: 100,
            required: true
        },
        gas_limit: {
            type: Number,
            default: 300000,
            min: 21000,
            max: 1000000,
            required: true
        }
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// User schema with all components
const userSchema = new mongoose.Schema({
    telegram_id: {
        type: String,
        required: true,
        unique: true
    },
    evm_wallets: [evmWalletSchema],
    trade_positions: [tradePositionSchema],
    
    // Referral system fields
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
    
    // Global user settings
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
        },
        default_wallet_settings: {  // Optional global defaults for new wallets
            slippage: {
                type: Number,
                default: 10
            },
            gas_limit: {
                type: Number,
                default: 300000
            }
        }
    }
}, { timestamps: true });

// Maintain existing indexes
userSchema.index({ referral_code: 1 }, { unique: true, sparse: true });
userSchema.index({ 'evm_wallets.name': 1, telegram_id: 1 }, { unique: true });
userSchema.index({ 'trade_positions.token_address': 1, 'trade_positions.chain': 1 });
userSchema.index({ 'trade_positions.opened_at': 1 });
userSchema.index({ 'trade_positions.closed_at': 1 });
userSchema.index({ 'trade_positions.transactions.transaction_hash': 1 });
userSchema.index({ 'trade_positions.transactions.wallet_address': 1 });
userSchema.index({ 'trade_positions.transactions.timestamp': 1 });

// Add new index for wallet settings queries if needed
userSchema.index({ 'evm_wallets.settings.slippage': 1 });
userSchema.index({ 'evm_wallets.settings.gas_limit': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;