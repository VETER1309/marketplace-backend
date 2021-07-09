const submitTx = require('./submit-tx');

async function transferKsmToBuy(api, buyer, admin, amount) {
  const transferTx = api.tx.balances.transfer(admin.address, amount);
  await submitTx(buyer, transferTx);
}

module.exports = transferKsmToBuy;