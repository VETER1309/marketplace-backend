const assert = require('assert');
const blockProductionRate = require('./block-production-rate');
const delay = require('../lib/delay');

async function waitToBecomeOwnerAgain(api, owner, collectionId, tokenId) {
  let waits = 10;
  while(waits > 0) {
    await delay(blockProductionRate);
    const token = (await api.query.nft.nftItemList(collectionId, tokenId)).toJSON();
    if(token.Owner === owner.address.toString()) {
      return;
    }
    waits--;
  }

  throw 'Timeout on waiting for nft to return to owner after canceling offer';
}

async function cancelOffer(api, matcher, db, seller, offer) {
  await matcher.cancel(seller, offer.CollectionId, offer.TokenId);
  await waitToBecomeOwnerAgain(api, seller, offer.CollectionId, offer.TokenId);
  const offersAfterCancel = await db.findOffer(offer.CollectionId, offer.TokenId);
  assert.strictEqual(offersAfterCancel.length, 1);
  assert.strictEqual(offersAfterCancel[0].OfferStatus, 2);
}

module.exports = cancelOffer;