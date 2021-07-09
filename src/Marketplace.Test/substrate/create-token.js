const submitTransactionAsync = require('./submit-tx');

async function createToken(api, owner, collectionId) {
  const tx = api.tx.nft.createItem(collectionId, owner.address, {NFT: { const_data: [255, 255], variable_data: [255, 255] }});
  const events = await submitTransactionAsync(owner, tx);
  const collectionCreatedEvent = events.filter(({ event: { method, section } }) =>  section == 'nft'  && method == 'ItemCreated')[0];
  const tokenId = collectionCreatedEvent.event.data[1].toNumber();

  return tokenId;
}

module.exports = createToken;