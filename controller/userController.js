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
            private_key:wallet.private_key,
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
