const getApi = require('./substrate/get-api');
const config = require('./config');
const createOffer = require('./substrate/create-offer');
const keys = require('./keys');
const Matcher = require('./matcher-contract');
const Db = require('./db');
const cancelOffer = require('./substrate/cancel-offer');

const tokenPrice = '100000000';

describe('Cancel trade', function() {
  it('After creating a token, sending it to marketplace admin, calling ask then cancel returns token back.', async function() {
    this.timeout(100000000);
    const api = await getApi(config.wsEndpoint);
    const matcher = new Matcher(api, config.marketContractAddress, await keys.admin());
    const db = await Db(config);
    const seller = await keys.seller();
    const admin = await keys.admin();
    const offer = await createOffer(api, seller, admin, matcher, tokenPrice, db);
    await cancelOffer(api, matcher, db, seller, offer);
  });
});