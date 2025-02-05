const mongoose = require('mongoose');
const User = require('../models/user');

/**
 * Wallet Management Functions
 */

// Create a new EVM wallet
exports.createEvmWallet = async (req, res) => {
    try {
        const { 
            telegram_id, 
            name, 
            address, 
            private_key, 
            seed_phrase,
            settings = {
                slippage: 10,        // Default 10% slippage
                gas_limit: 300000    // Default gas limit
            }
        } = req.body;

        // Validate required fields
        if (!name || !address || !private_key || !seed_phrase) {
            return res.status(400).json({ error: 'Missing required wallet information' });
        }

        // Validate settings
        if (settings.slippage && (settings.slippage < 0.1 || settings.slippage > 100)) {
            return res.status(400).json({ error: 'Slippage must be between 0.1 and 100 percent' });
        }

        if (settings.gas_limit && (settings.gas_limit < 21000 || settings.gas_limit > 1000000)) {
            return res.status(400).json({ error: 'Gas limit must be between 21000 and 1000000' });
        }

        let user = await User.findOne({ telegram_id });

        if (!user) {
            user = new User({ telegram_id });
        }

        // Check for duplicate wallet name
        const walletExists = user.evm_wallets.some(wallet => wallet.name === name);
        if (walletExists) {
            return res.status(400).json({ error: 'Wallet with this name already exists' });
        }

        // Add new wallet with settings
        user.evm_wallets.push({
            name,
            address,
            private_key,
            seed_phrase,
            settings: {
                slippage: settings.slippage || 10,
                gas_limit: settings.gas_limit || 300000
            }
        });

        await user.save();

        res.status(201).json({ 
            message: 'EVM wallet created successfully',
            wallet: {
                name,
                address,
                settings: {
                    slippage: settings.slippage || 10,
                    gas_limit: settings.gas_limit || 300000
                }
            }
        });
    } catch (error) {
        console.error('Error creating EVM wallet:', error);
        res.status(500).json({ error: 'Failed to create EVM wallet' });
    }
};

exports.updateWalletSettings = async (req, res) => {
    try {
        const { telegram_id, wallet_name } = req.params;
        const { settings } = req.body;

        if (!settings) {
            return res.status(400).json({ error: 'Settings object is required' });
        }

        const user = await User.findOne({ telegram_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const walletIndex = user.evm_wallets.findIndex(w => w.name === wallet_name);

        if (walletIndex === -1) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Validate and update slippage
        if (settings.slippage !== undefined) {
            if (settings.slippage < 0.1 || settings.slippage > 100) {
                return res.status(400).json({ error: 'Slippage must be between 0.1 and 100 percent' });
            }
            user.evm_wallets[walletIndex].settings.slippage = settings.slippage;
        }

        // Validate and update gas limit
        if (settings.gas_limit !== undefined) {
            if (settings.gas_limit < 21000 || settings.gas_limit > 1000000) {
                return res.status(400).json({ error: 'Gas limit must be between 21000 and 1000000' });
            }
            user.evm_wallets[walletIndex].settings.gas_limit = settings.gas_limit;
        }

        // Mark settings as modified for Mongoose
        user.markModified('evm_wallets');
        await user.save();

        res.status(200).json({
            message: 'Wallet settings updated successfully',
            settings: user.evm_wallets[walletIndex].settings
        });
    } catch (error) {
        console.error('Error updating wallet settings:', error);
        res.status(500).json({ error: 'Failed to update wallet settings' });
    }
};


exports.getWalletSettings = async (req, res) => {
    try {
        const { telegram_id, wallet_name } = req.params;

        const user = await User.findOne({ telegram_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const wallet = user.evm_wallets.find(w => w.name === wallet_name);

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        res.status(200).json({
            settings: wallet.settings || {
                slippage: 10,
                gas_limit: 300000
            }
        });
    } catch (error) {
        console.error('Error fetching wallet settings:', error);
        res.status(500).json({ error: 'Failed to fetch wallet settings' });
    }
};


// Get all EVM wallets for a user
exports.getAllEvmWallets = async (req, res) => {
    const { telegram_id } = req.params;

    try {
        const user = await User.findOne({ telegram_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return only public wallet information
        const safeWallets = user.evm_wallets.map(wallet => ({
            name: wallet.name,
            address: wallet.address,
            private_key: wallet.private_key,
            created_at: wallet.created_at
        }));

        res.json(safeWallets);
    } catch (error) {
        console.error('Error fetching EVM wallets:', error);
        res.status(500).json({ error: 'Failed to fetch EVM wallets' });
    }
};

// Get specific EVM wallet by name
exports.getEvmWalletByName = async (req, res) => {
    const { telegram_id, wallet_name } = req.params;

    try {
        const user = await User.findOne({ telegram_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const wallet = user.evm_wallets.find(w => w.name === wallet_name);

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Return only public wallet information
        res.json({
            name: wallet.name,
            address: wallet.address,
            private_key: wallet.private_key,
            created_at: wallet.created_at
        });
    } catch (error) {
        console.error('Error fetching EVM wallet:', error);
        res.status(500).json({ error: 'Failed to fetch EVM wallet' });
    }
};

// Update existing EVM wallet
exports.updateEvmWallet = async (req, res) => {
    try {
        const { telegram_id, wallet_name } = req.params;
        const { address, private_key, seed_phrase } = req.body;

        const user = await User.findOne({ telegram_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const walletIndex = user.evm_wallets.findIndex(w => w.name === wallet_name);

        if (walletIndex === -1) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Update provided fields
        if (address) user.evm_wallets[walletIndex].address = address;
        if (private_key) user.evm_wallets[walletIndex].private_key = private_key;
        if (seed_phrase) user.evm_wallets[walletIndex].seed_phrase = seed_phrase;

        await user.save();

        res.status(200).json({ 
            message: 'Wallet updated successfully',
            wallet: {
                name: wallet_name,
                address: user.evm_wallets[walletIndex].address
            }
        });
    } catch (error) {
        console.error('Error updating EVM wallet:', error);
        res.status(500).json({ error: 'Failed to update EVM wallet' });
    }
};

// Delete EVM wallet
exports.deleteEvmWallet = async (req, res) => {
    try {
        const { telegram_id, wallet_name } = req.params;

        const user = await User.findOne({ telegram_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const walletIndex = user.evm_wallets.findIndex(w => w.name === wallet_name);

        if (walletIndex === -1) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Remove wallet from array
        user.evm_wallets.splice(walletIndex, 1);
        await user.save();

        res.status(200).json({ message: 'Wallet deleted successfully' });
    } catch (error) {
        console.error('Error deleting EVM wallet:', error);
        res.status(500).json({ error: 'Failed to delete EVM wallet' });
    }
};

/**
 * Trade Position Management Functions
 */


exports.updateTradePosition = async (req, res) => {
    try {
        const { telegram_id } = req.params;
        const { 
            token_address,
            chain,
            token_symbol,
            token_name,
            action,
            amount,
            mcap,
            total_value_usd,
            transaction_hash,
            wallet_address
        } = req.body;

        // Validate required fields
        if (!mcap) {
            return res.status(400).json({ 
                error: 'Missing required field',
                details: 'mcap is required'
            });
        }

        // Find user
        let user = await User.findOne({ telegram_id });
        if (!user) {
            user = new User({ telegram_id });
        }

        // Ensure mcap is converted to string
        const mcapString = mcap.toString();

        // Create new transaction object
        const newTransaction = {
            action,
            amount,
            mcap: mcapString,
            total_value_usd,
            transaction_hash,
            wallet_address,
            timestamp: new Date()
        };

        // Log the transaction for debugging
        console.log('New transaction object:', newTransaction);

        // Find or create position
        let positionIndex = user.trade_positions.findIndex(p => 
            p.token_address.toLowerCase() === token_address.toLowerCase() && 
            p.chain === chain
        );

        if (positionIndex === -1) {
            // Create new position
            const newPosition = {
                token_address,
                chain,
                token_symbol,
                token_name,
                amount: "0",
                average_mcap: mcapString,
                transactions: [newTransaction]
            };
            user.trade_positions.push(newPosition);
            positionIndex = user.trade_positions.length - 1;
        } else {
            // Add transaction to existing position
            user.trade_positions[positionIndex].transactions.push(newTransaction);
        }

        // Update position amounts
        let position = user.trade_positions[positionIndex];
        if (action === 'buy') {
            position.amount = (Number(position.amount) + Number(amount)).toString();
            position.average_mcap = mcapString;
        } else {
            position.amount = (Number(position.amount) - Number(amount)).toString();
        }

        // Mark the position as modified to ensure Mongoose picks up the changes
        user.markModified('trade_positions');

        // Save with validation
        await user.save({ validateBeforeSave: true });

        res.status(200).json({
            message: 'Trade position updated successfully',
            position: user.trade_positions[positionIndex]
        });

    } catch (error) {
        console.error('Error in updateTradePosition:', error);
        res.status(500).json({ 
            error: 'Failed to update trade position',
            details: error.message || 'Unknown error occurred'
        });
    }
};

// Get all trading positions
exports.getTradingPositions = async (req, res) => {
    try {
        const { telegram_id } = req.params;
        const { status } = req.query; // 'open', 'closed', or 'all'

        const user = await User.findOne({ telegram_id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let positions = user.trade_positions;

        // Filter positions based on status
        if (status === 'open') {
            positions = positions.filter(p => p.amount > 0);
        } else if (status === 'closed') {
            positions = positions.filter(p => p.amount === 0);
        }

        res.status(200).json(positions);
    } catch (error) {
        console.error('Error fetching trading positions:', error);
        res.status(500).json({ error: 'Failed to fetch trading positions' });
    }
};

// Get specific position details
exports.getPositionDetails = async (req, res) => {
    try {
        const { telegram_id, token_address, chain } = req.params;

        const user = await User.findOne({ telegram_id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const position = user.trade_positions.find(p => 
            p.token_address.toLowerCase() === token_address.toLowerCase() && 
            p.chain === chain
        );

        if (!position) {
            return res.status(404).json({ error: 'Position not found' });
        }

        res.status(200).json(position);
    } catch (error) {
        console.error('Error fetching position details:', error);
        res.status(500).json({ error: 'Failed to fetch position details' });
    }
};

// Get trading history/performance
exports.getTradingHistory = async (req, res) => {
    try {
        const { telegram_id } = req.params;
        const { timeframe } = req.query; // 'day', 'week', 'month', 'all'

        const user = await User.findOne({ telegram_id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const now = new Date();
        let startDate = new Date(0); // Default to all time

        if (timeframe === 'day') {
            startDate = new Date(now - 24 * 60 * 60 * 1000);
        } else if (timeframe === 'week') {
            startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === 'month') {
            startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        }

        // Aggregate trading data
        const history = {
            total_trades: 0,
            winning_trades: 0,
            losing_trades: 0,
            total_profit_loss: 0,
            trades: []
        };

        user.trade_positions.forEach(position => {
            position.transactions
                .filter(tx => tx.timestamp >= startDate)
                .forEach(tx => {
                    if (tx.action === 'sell') {
                        history.total_trades++;
                        const profit = tx.amount * (tx.price_per_token - position.average_buy_price);
                        history.total_profit_loss += profit;
                        
                        if (profit > 0) history.winning_trades++;
                        else history.losing_trades++;

                        history.trades.push({
                            token_address: position.token_address,
                            chain: position.chain,
                            symbol: position.token_symbol,
                            action: tx.action,
                            amount: tx.amount,
                            price: tx.price_per_token,
                            profit,
                            timestamp: tx.timestamp
                        });
                    }
                });
        });

        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching trading history:', error);
        res.status(500).json({ error: 'Failed to fetch trading history' });
    }
};

/**
 * Referral System Functions
 */

// Generate referral code
exports.generateReferralCode = async (req, res) => {
    try {
        const { telegram_id } = req.params;
        const user = await User.findOne({ telegram_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        do {
            code = '';
            for (let i = 0; i < 8; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (await User.findOne({ referral_code: code }));

        user.referral_code = code;
        await user.save();

        res.status(200).json({ referral_code: code });
    } catch (error) {
        console.error('Error generating referral code:', error);
        res.status(500).json({ error: 'Failed to generate referral code' });
    }
};

// Process referral
exports.processReferral = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { referral_code, telegram_id } = req.params;
        
        // Find referrer
        const referrer = await User.findOne({ referral_code }).session(session);
        if (!referrer) {
            throw new Error('Invalid referral code');
        }

    // Find referred user
    const referredUser = await User.findOne({ telegram_id }).session(session);
    if (!referredUser) {
        throw new Error('Referred user not found');
    }

    // Validation checks
    if (referredUser.referred_by) {
        throw new Error('User has already been referred');
    }
    if (referrer.telegram_id === referredUser.telegram_id) {
        throw new Error('You cannot refer yourself');
    }

    // Update referrer stats
    referrer.referrals.push(referredUser._id);
    referrer.referral_count += 1;
    referrer.rewards_earned += 10;  // Reward amount
    await referrer.save({ session });

    // Update referred user
    referredUser.referred_by = referrer._id;
    await referredUser.save({ session });
    
    await session.commitTransaction();
    res.status(200).json({ message: 'Referral processed successfully' });
} catch (error) {
    await session.abortTransaction();
    console.error('Error processing referral:', error);
    res.status(500).json({ error: error.message });
} finally {
    session.endSession();
}
};

// Get referral information
exports.getReferralInfo = async (req, res) => {
try {
    const { telegram_id } = req.params;
    const user = await User.findOne({ telegram_id });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Generate referral code if not exists
    if (!user.referral_code) {
        await exports.generateReferralCode({ params: { telegram_id } }, { status: () => ({ json: () => { } }) });
        user = await User.findOne({ telegram_id });
    }

    res.status(200).json({
        referralCode: user.referral_code,
        referralCount: user.referral_count,
        rewardsEarned: user.rewards_earned
    });
} catch (error) {
    console.error('Error fetching referral info:', error);
    res.status(500).json({ error: 'Failed to fetch referral info' });
}
};

module.exports = exports;