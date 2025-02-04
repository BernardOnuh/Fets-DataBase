const express = require('express');
const router = express.Router();
const walletController = require('../controller/userController');

// EVM Wallet Management Routes
router.post('/wallet/evm', walletController.createEvmWallet);  // Create new wallet
router.get('/wallet/evm/:telegram_id', walletController.getAllEvmWallets);  // Get all wallets
router.get('/wallet/evm/:telegram_id/:wallet_name', walletController.getEvmWalletByName);  // Get specific wallet
router.put('/wallet/evm/:telegram_id/:wallet_name', walletController.updateEvmWallet);  // Update wallet
router.delete('/wallet/evm/:telegram_id/:wallet_name', walletController.deleteEvmWallet);  // Delete wallet

// Trade Position Routes
router.post('/trade/position/:telegram_id', walletController.updateTradePosition);  // Create/Update trade position
router.get('/trade/positions/:telegram_id', walletController.getTradingPositions);  // Get all positions
router.get('/trade/position/:telegram_id/:token_address/:chain', walletController.getPositionDetails);  // Get specific position
router.get('/trade/history/:telegram_id', walletController.getTradingHistory);  // Get trading history

// Referral Routes
router.post('/wallet/generateReferral/:telegram_id', walletController.generateReferralCode);
router.post('/wallet/referral/processReferral/:referral_code/:telegram_id', walletController.processReferral);
router.get('/wallet/referral/:telegram_id', walletController.getReferralInfo);

module.exports = router;