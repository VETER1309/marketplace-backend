const getApi = require('./substrate/get-api');
const config = require('./config');
const createOffer = require('./substrate/create-offer');
const keys = require('./keys');
const Matcher = require('./matcher-contract');
const Db = require('./db');
const cancelOffer = require('./substrate/cancel-offer');

const tokenPrice = '100000000';

describe('Multiple tokens handling', function() {
  it('Can work with multiple tokens within single block production time', async function() {
    this.timeout(100000000);
    const api = await getApi(config.wsEndpoint);
    const matcher = new Matcher(api, config.marketContractAddress, await keys.admin());
    const db = await Db(config);
    const seller = await keys.seller();
    const admin = await keys.admin();
    const buyer = await keys.buyer();
    const ksmAdmin = await keys.ksmAdmin();
    const test = async (owner) => {
      const offer = await createOffer(api, owner, admin, matcher, tokenPrice, db);
      await cancelOffer(api, matcher, db, owner, offer)
    };
    await Promise.all([test(seller), test(buyer), test(ksmAdmin)]);
  });
});