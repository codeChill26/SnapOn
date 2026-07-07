'use strict';

const sendOtp = require('./sendOtp');
const verifyOtp = require('./verifyOtp');
const verifyEmail = require('./verifyEmail');
const resendVerification = require('./resendOtp');

module.exports = {
  sendOtp,
  verifyOtp,
  verifyEmail,
  resendVerification,
};
