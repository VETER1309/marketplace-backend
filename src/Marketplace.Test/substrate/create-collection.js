const submitTransactionAsync = require('./submit-tx');

async function createCollection(api, owner) {
  const tx = api.tx.nft.createCollection([1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], {nft: null});
  const events = await submitTransactionAsync(owner, tx);
  const collectionCreatedEvent = events.filter(({ event: { method, section } }) =>  section == 'nft'  && method == 'CollectionCreated')[0];
  const collectionId = collectionCreatedEvent.event.data[0].toNumber();

  return collectionId;
}

module.exports = createCollection;