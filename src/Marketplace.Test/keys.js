const { Keyring } = require('@polkadot/api');
const config = require('./config');
const { waitReady } = require('@polkadot/wasm-crypto');

async function key(seed) {
  await waitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  return keyring.addFromUri(seed);
}

module.exports = {
  admin: () => key(config.adminSeed),
  seller: () => key(config.sellerSeed),
  buyer: () => key(config.buyerSeed),
  seller2: () => key(config.seller2Seed),
  buyer2: () => key(config.buyer2Seed),
  ksmAdmin: () => key(config.ksmAdminSeed)
};