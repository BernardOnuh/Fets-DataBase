const express = require('express');
const router = express.Router();
const walletController = require('../controller/userController');

// EVM Wallet Management Routes
router.post('/wallet/evm', walletController.createEvmWallet);  // Create new wallet
router.get('/wallet/evm/:telegram_id', walletController.getAllEvmWallets);  // Get all wallets
router.get('/wallet/evm/:telegram_id/:wallet_name', walletController.getEvmWalletByName);  // Get specific wallet
router.put('/wallet/evm/:telegram_id/:wallet_name', walletController.updateEvmWallet);  // Update wallet
router.delete('/wallet/evm/:telegram_id/:wallet_name', walletController.deleteEvmWallet);  // Delete wallet

// Wallet Settings Routes
router.get('/wallet/evm/settings/:telegram_id/:wallet_name', walletController.getWalletSettings);  // Get wallet settings
router.put('/wallet/evm/settings/:telegram_id/:wallet_name', walletController.updateWalletSettings);  // Update wallet settings

// Trade Position Routes
router.post('/trade/position/:telegram_id', walletController.updateTradePosition);  // Create/Update trade position
router.get('/trade/positions/:telegram_id', (req, res) => {
    const { telegram_id } = req.params;
    
    try {
        const user = User.findOne({ telegram_id })
        .then(user => {
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json(user.trade_positions);
        })
        .catch(error => {
            console.error('Error fetching trading positions:', error);
            res.status(500).json({ error: 'Failed to fetch trading positions' });
        });
    } catch (error) {
        console.error('Error fetching trading positions:', error);
        res.status(500).json({ error: 'Failed to fetch trading positions' });
    }
});  // Get all positions

router.get('/trade/position/:telegram_id/:token_address/:chain', (req, res) => {
    const { telegram_id, token_address, chain } = req.params;
    
    try {
        const user = User.findOne({ telegram_id })
        .then(user => {
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
            
            res.json(position);
        })
        .catch(error => {
            console.error('Error fetching position details:', error);
            res.status(500).json({ error: 'Failed to fetch position details' });
        });
    } catch (error) {
        console.error('Error fetching position details:', error);
        res.status(500).json({ error: 'Failed to fetch position details' });
    }
});  // Get specific position

router.get('/trade/history/:telegram_id', walletController.getTradingHistory);  // Get trading history

// Referral Routes
router.post('/wallet/generateReferral/:telegram_id', walletController.generateReferralCode);
router.post('/wallet/referral/processReferral/:referral_code/:telegram_id', walletController.processReferral);
router.get('/wallet/referral/:telegram_id', walletController.getReferralInfo);

module.exports = router;