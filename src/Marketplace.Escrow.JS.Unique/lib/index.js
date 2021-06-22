var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

module.exports = {
  utility: require('./utility'),
  log: require('./log'),
  BigNumber
}