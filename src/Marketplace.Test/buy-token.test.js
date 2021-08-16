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
const { encodeAddress } = require('@polkadot/util-crypto');

const tokenPrice = '100000000000000000';
const tokenPriceWithCommission = '110000000000000000';
const commission  = '10000000000000000';

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

async function getBalancesState(api, matcher, seller, admin, buyer, ksmAdmin){
  const sellerBalance = await getKsmBalance(api, seller);
  const buyerBalance = await getKsmBalance(api, buyer);
  const adminBalance = await getKsmBalance(api, admin);
  const ksmAdminBalance = await getKsmBalance(api, ksmAdmin);
  const deposit = await matcher.getBalance(buyer);
  const sellerDeposit = await matcher.getBalance(seller);

  return {
    seller: sellerBalance,
    buyer: buyerBalance,
    admin: adminBalance,
    ksmAdmin: ksmAdminBalance,
    deposit,
    sellerDeposit
  };
}

function logBalancesState({seller, buyer, admin, ksmAdmin, deposit}) {
  logLabelAndValues([
    ['Seller:', seller],
    ['Buyer:', buyer],
    ['Admin:', admin],
    ['KsmAdmin:', ksmAdmin],
    ['Initial deposit:', deposit]
  ]);
}

function assertBalancesAfterBuy(balancesBefore, balancesAfter, price, commission, tokensSold = 1n) {
  assert.strictEqual(BigInt(balancesAfter.seller) - BigInt(balancesBefore.seller), BigInt(price));

  const ksmAdminDelta = BigInt(balancesAfter.ksmAdmin) - BigInt(balancesBefore.ksmAdmin);
  assert.strictEqual(ksmAdminDelta > tokensSold*BigInt(commission) / 10n, true);
  assert.strictEqual(ksmAdminDelta <= tokensSold*BigInt(commission), true);

  assert.strictEqual(BigInt(balancesAfter.sellerDeposit) - BigInt(balancesBefore.sellerDeposit), 0n);

  const buyerDelta = BigInt(balancesAfter.buyer) - BigInt(balancesBefore.buyer);
  assert.strictEqual(buyerDelta <= -(BigInt(price) + BigInt(commission)), true);
  assert.strictEqual(buyerDelta >= -(BigInt(price) + BigInt(commission) + BigInt(commission) / 10n), true);

  assert.strictEqual(BigInt(balancesAfter.deposit) - BigInt(balancesBefore.deposit), 0n);
}

async function waitForTradeToBeRegistered(db, collectionId, tokenId) {
  let waits = 10;
  while(waits > 0) {
    await delay(blockProductionRate);
    const offers = await db.findTrade(collectionId, tokenId);
    if(offers.length === 1) {
      return offers[0];
    }
    if(offers.length > 1) {
      throw 'More than 1 trade was created';
    }
    waits--;
  }

  throw 'Timeout on waiting for trade to be registered in database.';
}

async function buy(api, db, matcher, offer, seller, admin, buyer, ksmAdmin, price, commission, priceWithCommission) {
  const sellerBalanceBefore = await getKsmBalance(api, seller);
  const deposit = await matcher.getBalance(buyer);
  await transferKsmToBuy(api, buyer, ksmAdmin, priceWithCommission);
  const depositAfterKsmSent = await waitForKsmDepositRegister(matcher, buyer, deposit);
  console.info(`Deposit after sending ${priceWithCommission} ksm = ${depositAfterKsmSent}, diff is ${BigInt(depositAfterKsmSent) - BigInt(deposit)}`);
  assert.strictEqual(BigInt(depositAfterKsmSent), BigInt(deposit) + BigInt(price));

  await matcher.buy(buyer, offer.CollectionId, offer.TokenId);
  await waitForTokenToBeTransferedToBuyer(api, buyer, offer.CollectionId, offer.TokenId);
  await waitForKsmToBeTransferedToSeller(api, seller, sellerBalanceBefore);

  const dbTrade = await waitForTradeToBeRegistered(db, offer.CollectionId, offer.TokenId);
  let publicKey = Buffer.from(dbTrade.Buyer, 'base64');
  const dbBuyer = encodeAddress(publicKey);
  assert.strictEqual(dbBuyer.toString(), buyer.address.toString());
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

    logLabelAndValues([
      ['Token Price:', tokenPrice],
      ['Fee:', commission],
      ['Price with Fee:', tokenPriceWithCommission]
    ]);

    console.info(``);
    console.info(`Balances before buying:`);

    const offer = await createOffer(api, seller, admin, matcher, tokenPrice, db);

    const balancesBefore = await getBalancesState(api, matcher, seller, admin, buyer, ksmAdmin);
    logBalancesState(balancesBefore);

    await buy(api, db, matcher, offer, seller, admin, buyer, ksmAdmin, tokenPrice, commission, tokenPriceWithCommission);

    console.info(``);
    console.info(`Balances after buying:`);
    const balancesAfter = await getBalancesState(api, matcher, seller, admin, buyer, ksmAdmin);
    logBalancesState(balancesAfter);

    console.info(``);
    console.info(`Balances diff:`);
    logLabelAndValues([
      ['Seller',   BigInt(balancesAfter.seller)   - BigInt(balancesBefore.seller)  ],
      ['Buyer',    BigInt(balancesAfter.buyer)    - BigInt(balancesBefore.buyer)   ],
      ['Admin',    BigInt(balancesAfter.admin)    - BigInt(balancesBefore.admin)   ],
      ['KsmAdmin', BigInt(balancesAfter.ksmAdmin) - BigInt(balancesBefore.ksmAdmin)],
      ['Deposit:', BigInt(balancesAfter.deposit)  - BigInt(balancesBefore.deposit) ]
    ]);

    assertBalancesAfterBuy(balancesBefore, balancesAfter, tokenPrice, commission);
  });

  it('Multiple buying/selling in single block works.', async function() {
    this.timeout(100000000);
    const api = await getApi(config.wsEndpoint);
    const seller = await keys.seller();
    const seller2 = await keys.seller2();
    const admin = await keys.admin();
    const buyer = await keys.buyer();
    const buyer2 = await keys.buyer2();
    const ksmAdmin = await keys.ksmAdmin();
    const matcher = new Matcher(api, config.marketContractAddress, admin);
    const db = await Db(config);

    const sellersAndBuyers = [[seller, buyer], [seller2, buyer2]];
    const offers = await Promise.all(sellersAndBuyers.map(([s, b]) => createOffer(api, s, admin, matcher, tokenPrice, db).then(offer => [s, b, offer])));

    const balancesBefore = await Promise.all(sellersAndBuyers.map(([s, b]) => getBalancesState(api, matcher, s, admin, b, ksmAdmin)));

    await Promise.all(offers.map(([s, b, offer]) => buy(api, db, matcher, offer, s, admin, b, ksmAdmin, tokenPrice, commission, tokenPriceWithCommission)));

    const balancesAfter = await Promise.all(sellersAndBuyers.map(([s, b]) => getBalancesState(api, matcher, s, admin, b, ksmAdmin)));
    for(let i = 0; i < balancesBefore.length;i++) {
      assertBalancesAfterBuy(balancesBefore[i], balancesAfter[i], tokenPrice, commission, BigInt(balancesBefore.length));
    }
  });
});