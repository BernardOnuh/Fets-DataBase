const mongoose = require('mongoose');
const User = require('../models/user');

/**
 * Wallet Management Functions
 */

// Create a new EVM wallet
exports.createEvmWallet = async (req, res) => {
    try {
        const { telegram_id, name, address, private_key, seed_phrase } = req.body;

        // Validate required fields
        if (!name || !address || !private_key || !seed_phrase) {
            return res.status(400).json({ error: 'Missing required wallet information' });
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

        // Add new wallet
        user.evm_wallets.push({
            name,
            address,
            private_key,
            seed_phrase
        });

        await user.save();

        res.status(201).json({ 
            message: 'EVM wallet created successfully',
            wallet: {
                name,
                address
            }
        });
    } catch (error) {
        console.error('Error creating EVM wallet:', error);
        res.status(500).json({ error: 'Failed to create EVM wallet' });
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
            mcap,                // Changed from price_per_token
            total_value_usd,
            transaction_hash,
            wallet_address
        } = req.body;

        // Validate required fields
        if (!wallet_address) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        if (!amount || !mcap || !total_value_usd) {  // Changed validation
            return res.status(400).json({ error: 'Amount, market cap, and total value are required' });
        }

        // Find user
        let user = await User.findOne({ telegram_id });
        if (!user) {
            user = new User({ telegram_id });
        }

        // Find or create position
        let position = user.trade_positions.find(p => 
            p.token_address.toLowerCase() === token_address.toLowerCase() && 
            p.chain === chain
        );

        if (!position) {
            position = {
                token_address,
                chain,
                token_symbol,
                token_name,
                amount: "0",
                transactions: []
            };
            user.trade_positions.push(position);
        }

        // Store numbers as strings to preserve precision
        const parsedAmount = amount.toString();
        const parsedMcap = mcap.toString();
        const parsedTotal = total_value_usd.toString();

        // Add transaction
        position.transactions.push({
            action,
            amount: parsedAmount,
            mcap: parsedMcap,           // Changed from price_per_token
            total_value_usd: parsedTotal,
            transaction_hash,
            wallet_address
        });

        // Update position totals
        if (action === 'buy') {
            position.amount = (Number(position.amount) + Number(parsedAmount)).toString();
            position.average_mcap = parsedMcap;  // Track market cap at buy
        } else {
            position.amount = (Number(position.amount) - Number(parsedAmount)).toString();
        }

        await user.save();

        res.status(200).json({
            message: 'Trade position updated successfully',
            position
        });
    } catch (error) {
        console.error('Error in updateTradePosition:', error);
        res.status(500).json({ 
            error: 'Failed to update trade position',
            details: error.message 
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