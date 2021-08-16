const assert = require('assert');
const createCollection = require('./create-collection');
const createToken = require('./create-token');
const delay = require('../lib/delay');
const transfer = require('./transfer');
const blockProductionRate = require('./block-production-rate');
const { encodeAddress } = require('@polkadot/util-crypto');

async function waitForNftDeposit(collectionId, tokenId, matcher) {
  let waits = 10;
  while(waits > 0) {
    await delay(blockProductionRate);
    try {
      return await matcher.getNftDeposit(collectionId, tokenId);
    } catch(error) {
    }
    waits--;
  }

  throw 'Timeout on waiting for nft to be deposited';
}

async function waitForOfferCreated(db, collectionId, tokenId) {
  let waits = 10;
  while(waits > 0) {
    await delay(blockProductionRate);
    const offers = await db.findOffer(collectionId, tokenId);
    if(offers.length === 1) {
      return offers[0];
    }
    if(offers.length > 1) {
      throw 'More than 1 offer was created';
    }
    waits--;
  }

  throw 'Timeout on waiting for offer to be created.';
}

async function createOffer(api, seller, admin, matcher, price, db) {
  const collectionId = await createCollection(api, seller);
  const tokenId = await createToken(api, seller, collectionId);
  await transfer(api, seller, collectionId, tokenId, admin);
  const depositOwner = await waitForNftDeposit(collectionId, tokenId, matcher);
  assert.strictEqual(depositOwner, seller.address.toString());
  await matcher.ask(seller, collectionId, tokenId, price);
  const offer = await waitForOfferCreated(db, collectionId, tokenId);

  assert.strictEqual(offer.QuoteId, '2');
  assert.strictEqual(offer.OfferStatus, 1);
  let publicKey = Buffer.from(offer.SellerPublicKeyBytes, 'base64');
  const address = encodeAddress(publicKey);
  assert.strictEqual(address, seller.address.toString());
  assert.strictEqual(BigInt(offer.Price), BigInt(price));

  return offer;
}

module.exports = createOffer;