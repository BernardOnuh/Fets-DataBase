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
            settings: {
                slippage: wallet.settings.slippage || 10,
                gas_limit: wallet.settings.gas_limit || 300000
            },
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
        
        // Return public wallet information along with settings
        res.json({
            name: wallet.name,
            address: wallet.address,
            private_key: wallet.private_key,
            settings: {
                slippage: wallet.settings.slippage || 10,
                gas_limit: wallet.settings.gas_limit || 300000
            },
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { telegram_id } = req.params;
        const { 
            token_address,
            chain,
            token_symbol,
            token_name,
            action,
            amount,
            price_per_token,
            mcap,
            total_value_usd,
            transaction_hash,
            wallet_address
        } = req.body;

        // Comprehensive Validation
        const requiredFields = [
            'token_address', 'chain', 'action', 
            'amount', 'price_per_token', 'mcap'
        ];
        
        for (let field of requiredFields) {
            if (!req.body[field]) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    error: `Missing required field: ${field}`,
                    details: 'All critical trade information must be provided'
                });
            }
        }

        // Numeric Validations
        const numericValidation = {
            amount: Number(amount),
            price_per_token: Number(price_per_token),
            mcap: Number(mcap)
        };

        for (let [field, value] of Object.entries(numericValidation)) {
            if (isNaN(value) || value <= 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    error: `Invalid ${field}. Must be a positive number.`
                });
            }
        }

        // Find or Create User
        let user = await User.findOne({ telegram_id }).session(session);
        if (!user) {
            user = new User({ telegram_id });
        }

        // Ensure mcap is converted to string
        const mcapString = mcap.toString();

        // Create Comprehensive Transaction Object
        const newTransaction = {
            action,
            amount: numericValidation.amount,
            price_per_token: numericValidation.price_per_token,
            mcap: mcapString,
            total_value_usd,
            transaction_hash,
            wallet_address,
            timestamp: new Date()
        };

        // Find or Create Position
        let positionIndex = user.trade_positions.findIndex(p => 
            p.token_address.toLowerCase() === token_address.toLowerCase() && 
            p.chain === chain
        );

        if (positionIndex === -1) {
            // Create New Position
            const newPosition = {
                token_address,
                chain,
                token_symbol,
                token_name,
                amount: "0",
                average_buy_price: action === 'buy' ? price_per_token : "0",
                average_mcap: mcapString,
                transactions: [newTransaction]
            };
            user.trade_positions.push(newPosition);
            positionIndex = user.trade_positions.length - 1;
        } else {
            // Add Transaction to Existing Position
            user.trade_positions[positionIndex].transactions.push(newTransaction);
        }

        // Position Amount and Price Calculation
        let position = user.trade_positions[positionIndex];
        
        if (action === 'buy') {
            const currentAmount = Number(position.amount);
            const newAmount = currentAmount + numericValidation.amount;
            
            // Weighted average buy price calculation
            const currentTotalValue = currentAmount * Number(position.average_buy_price || 0);
            const newTotalValue = currentTotalValue + (numericValidation.amount * price_per_token);
            
            position.average_buy_price = (newTotalValue / newAmount).toFixed(6);
            position.amount = newAmount.toString();
        } else if (action === 'sell') {
            const currentAmount = Number(position.amount);
            
            if (currentAmount < numericValidation.amount) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    error: 'Insufficient tokens to sell',
                    availableAmount: currentAmount
                });
            }
            
            position.amount = (currentAmount - numericValidation.amount).toString();
        }

        // Mark position as modified
        user.markModified('trade_positions');

        // Save with validation
        await user.save({ session, validateBeforeSave: true });
        await session.commitTransaction();

        res.status(200).json({
            message: 'Trade position updated successfully',
            position: user.trade_positions[positionIndex]
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Comprehensive error in updateTradePosition:', {
            message: error.message,
            stack: error.stack,
            requestBody: req.body
        });
        res.status(500).json({ 
            error: 'Failed to update trade position',
            details: error.message || 'Unexpected system error'
        });
    } finally {
        session.endSession();
    }
};

exports.getTradingHistory = async (req, res) => {
    try {
        const { telegram_id } = req.params;
        const { timeframe = 'all', detailed = false } = req.query;

        const user = await User.findOne({ telegram_id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const now = new Date();
        let startDate = new Date(0);

        const timeframeMap = {
            'day': 24 * 60 * 60 * 1000,
            'week': 7 * 24 * 60 * 60 * 1000,
            'month': 30 * 24 * 60 * 60 * 1000
        };

        if (timeframeMap[timeframe]) {
            startDate = new Date(now - timeframeMap[timeframe]);
        }

        const performanceMetrics = {
            total_trades: 0,
            total_volume: 0,
            realized_pnl: 0,
            winning_trades: 0,
            losing_trades: 0,
            win_rate: 0,
            average_trade_size: 0,
            trades: detailed ? [] : undefined
        };

        user.trade_positions.forEach(position => {
            position.transactions
                .filter(tx => tx.timestamp >= startDate && tx.action === 'sell')
                .forEach(tx => {
                    performanceMetrics.total_trades++;
                    performanceMetrics.total_volume += tx.total_value_usd || 0;

                    // Precise PnL Calculation
                    const buyPrice = Number(position.average_buy_price || 0);
                    const sellPrice = tx.price_per_token;
                    const amount = tx.amount;

                    const trade_profit = (sellPrice - buyPrice) * amount;
                    performanceMetrics.realized_pnl += trade_profit;

                    if (trade_profit > 0) {
                        performanceMetrics.winning_trades++;
                    } else {
                        performanceMetrics.losing_trades++;
                    }

                    if (detailed) {
                        performanceMetrics.trades.push({
                            token_symbol: position.token_symbol,
                            action: tx.action,
                            amount,
                            buy_price: buyPrice,
                            sell_price: sellPrice,
                            profit: trade_profit,
                            timestamp: tx.timestamp
                        });
                    }
                });
        });

        // Calculate Derived Metrics
        performanceMetrics.win_rate = 
            performanceMetrics.total_trades > 0 
                ? (performanceMetrics.winning_trades / performanceMetrics.total_trades) * 100 
                : 0;
        
        performanceMetrics.average_trade_size = 
            performanceMetrics.total_trades > 0
                ? performanceMetrics.total_volume / performanceMetrics.total_trades
                : 0;

        res.status(200).json(performanceMetrics);
    } catch (error) {
        console.error('Error in getTradingHistory:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve trading history',
            details: error.message 
        });
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