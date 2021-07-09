const assert = require('assert');
const getApi = require('./substrate/get-api');
const config = require('./config');
const createOffer = require('./substrate/create-offer');
const keys = require('./keys');
const Matcher = require('./matcher-contract');
const Db = require('./db');
const delay = require('./lib/delay');
const blockProductionRate = require('./substrate/block-production-rate');
const getKsmBalance = require('./substrate/get-ksm-balance');
const {logLabelAndValues} = require('./lib/log');
const transferKsmToBuy = require('./substrate/transfer-ksm-to-buy');

const tokenPrice = '100000000000000000';
const tokenPriceWithComission = '110000000000000000';
const comission  = '10000000000000000';

async function waitForKsmDepositRegister(matcher, buyer, initialDeposit) {
  let waitsCount = 10;
  initialDeposit = BigInt(initialDeposit);
  while(waitsCount > 0) {
    await delay(blockProductionRate);

    const currentBalance = await matcher.getBalance(buyer);
    if(BigInt(currentBalance) > initialDeposit) {
      return currentBalance;
    }

    waitsCount--;
  }

  throw 'Timeout on waiting for ksm deposit to register';
}

async function waitForTokenToBeTransferedToBuyer(api, buyer, collectionId, tokenId) {
  let waits = 10;
  while(waits > 0) {
    await delay(blockProductionRate);
    const token = (await api.query.nft.nftItemList(collectionId, tokenId)).toJSON();
    if(token.Owner === buyer.address.toString()) {
      return;
    }
    waits--;
  }

  throw 'Timeout on waiting for nft to return to owner after canceling offer';
}

async function waitForKsmToBeTransferedToSeller(api, seller, balanceBefore) {
  let waits = 10;
  while(waits > 0) {
    await delay(blockProductionRate);
    const balance = await getKsmBalance(api, seller);
    if(BigInt(balance) > BigInt(balanceBefore)) {
      return;
    }
    waits--;
  }

  throw 'Timeout on waiting for seller balance to increase';
}

function formatLog(entries) {
  const leftPad = Math.max.apply(null, entries.map(([l]) => l.toString().length)) + 1;
  const rightPad = Math.max.apply(null, entries.map(([_, l]) => l.toString().length));
  for(let [l, r] of entries) {
    console.info(`${l.toString().padEnd(leftPad, ' ')}${r.toString().padStart(rightPad, ' ')}`);
  }
}

async function buy(api, db, matcher, offer, seller, admin, buyer, ksmAdmin, price, commission, priceWithCommission) {
  const sellerBalanceBefore = await getKsmBalance(api, seller);
  const buyerBalanceBefore = await getKsmBalance(api, buyer);
  const adminBalanceBefore = await getKsmBalance(api, admin);
  const ksmAdminBalanceBefore = await getKsmBalance(api, ksmAdmin);
  logLabelAndValues([
    ['Token Price:', price],
    ['Fee:', commission],
    ['Price with Fee:', priceWithCommission]
  ]);

  const deposit = await matcher.getBalance(buyer);
  console.info(``);
  console.info(`Balances before buying:`);
  logLabelAndValues([
    ['Seller:', sellerBalanceBefore],
    ['Buyer:', buyerBalanceBefore],
    ['Admin:', adminBalanceBefore],
    ['KsmAdmin:', ksmAdminBalanceBefore],
    ['Initial deposit:', deposit]
  ]);
  await transferKsmToBuy(api, buyer, ksmAdmin, priceWithCommission);
  const depositAfterKsmSent = await waitForKsmDepositRegister(matcher, buyer, deposit);
  console.info(`Deposit after sending ${priceWithCommission} ksm = ${depositAfterKsmSent}, diff is ${BigInt(depositAfterKsmSent) - BigInt(deposit)}`);
  assert.strictEqual(BigInt(depositAfterKsmSent), BigInt(deposit) + BigInt(price));

  await matcher.buy(buyer, offer.CollectionId, offer.TokenId);
  await waitForTokenToBeTransferedToBuyer(api, buyer, offer.CollectionId, offer.TokenId);
  //await waitForKsmToBeTransferedToSeller(api, seller, sellerBalanceBefore);
  const sellerBalanceAfter = await getKsmBalance(api, seller);
  const buyerBalanceAfter = await getKsmBalance(api, buyer);
  const adminBalanceAfter = await getKsmBalance(api, admin);
  const ksmAdminBalanceAfter = await getKsmBalance(api, ksmAdmin);
  const depositAfterBuying = await matcher.getBalance(buyer);
  console.info(``);
  console.info(`Balances after buying:`);
  logLabelAndValues([
    ['Seller:', sellerBalanceAfter],
    ['Buyer:', buyerBalanceAfter],
    ['Admin:', adminBalanceAfter],
    ['KsmAdmin:', ksmAdminBalanceAfter],
    ['Deposit:', depositAfterBuying]
  ]);

  console.info(``);
  console.info(`Balances diff:`);
  logLabelAndValues([
    ['Seller', BigInt(sellerBalanceAfter) - BigInt(sellerBalanceBefore)],
    ['Buyer', BigInt(buyerBalanceAfter) - BigInt(buyerBalanceBefore)],
    ['Admin', BigInt(adminBalanceAfter) - BigInt(adminBalanceBefore)],
    ['KsmAdmin', BigInt(ksmAdminBalanceAfter) - BigInt(ksmAdminBalanceBefore)],
    ['Deposit:', BigInt(depositAfterBuying) - BigInt(deposit)]
  ]);
}


describe('Buy', function() {
  it('Buying token works perfectly with correct fees.', async function() {
    this.timeout(100000000);
    const api = await getApi(config.wsEndpoint);
    const seller = await keys.seller();
    const admin = await keys.admin();
    const buyer = await keys.buyer();
    const ksmAdmin = await keys.ksmAdmin();
    const matcher = new Matcher(api, config.marketContractAddress, admin);
    const db = await Db(config);

    const offer = await createOffer(api, seller, admin, matcher, tokenPrice, db);
    await buy(api, db, matcher, offer, seller, admin, buyer, ksmAdmin, tokenPrice, comission, tokenPriceWithComission);
  });
});