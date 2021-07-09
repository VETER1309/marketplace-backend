const submitTransactionAsync = require('./submit-tx');

async function transfer(api, owner, collectionId, tokenId, recipient) {
  const tx = api.tx.nft.transfer(recipient.address, collectionId, tokenId, 0);
  await submitTransactionAsync(owner, tx);
}

module.exports = transfer;