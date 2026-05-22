const walletModel = require('../models/walletModel');

/**
 * Wallet Service — Business logic for wallet operations
 */
const walletService = {
  /**
   * Verify that a user has sufficient available balance
   * Returns { hasBalance: boolean, availableBalance: number }
   */
  async verifyBalance(userId, requiredAmount) {
    const wallet = await walletModel.findByUserId(userId);

    if (!wallet) {
      return {
        hasBalance: false,
        availableBalance: 0,
        message: 'Wallet not found. Please create a wallet first.',
      };
    }

    const availableBalance = parseFloat(wallet.available_balance);
    const amount = parseFloat(requiredAmount);

    return {
      hasBalance: availableBalance >= amount,
      availableBalance,
      message: availableBalance >= amount
        ? 'Sufficient balance.'
        : `Insufficient balance. Available: ${availableBalance}, Required: ${amount}`,
    };
  },
};

module.exports = walletService;
