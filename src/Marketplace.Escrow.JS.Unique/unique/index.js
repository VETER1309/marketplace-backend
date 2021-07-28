const { log, BigNumber } = require('../lib');
const connect = require('./connect');
const { Abi, ContractPromise } = require("@polkadot/api-contract");
const contractAbi = require("../market_metadata.json");
const { Keyring } = require('@polkadot/api');
const {parseExtrinsic, ...types} = require('./parse_extrinsic');
const AdminPool = require('./admin_pool');

const quoteId = 2; // KSM

function getTransactionStatus(events, status) {
  if (status.isReady) {
    return "NotReady";
  }
  if (status.isBroadcast) {
    return "NotReady";
  }
  if (status.isInBlock || status.isFinalized) {
    if(events.filter(e => e.event.data.method === 'ExtrinsicFailed').length > 0) {
      return "Fail";
    }
    if(events.filter(e => e.event.data.method === 'ExtrinsicSuccess').length > 0) {
      return "Success";
    }
  }

  return "Fail";
}

function sendTransactionAsync(sender, transaction, releaseSender) {
  let statusNotifications = 0;
  return new Promise(async (resolve, reject) => {
    try {
      let unsub = await transaction.signAndSend(sender, ({ events = [], status }) => {
        if(statusNotifications >= 1) {
          releaseSender && releaseSender();
        }
        statusNotifications++;

        const transactionStatus = getTransactionStatus(events, status);

        if (transactionStatus === "Success") {
          log(`Transaction successful`);
          resolve(events);
          unsub();
        } else if (transactionStatus === "Fail") {
          log(`Something went wrong with transaction. Status: ${status}`);
          reject(events);
          unsub();
        }
      });
    } catch (e) {
      log('Error: ' + e.toString(), "ERROR");
      reject(e);
    }
  });
}

function adminFromSeed(seed, keyring) {
  const admin = keyring.addFromUri(seed);
  admin.address = admin.address.toString();
  return admin;
}

async function createUniqueClient(config) {
  const api = await connect(config);

  const keyring = new Keyring({ type: 'sr25519' });

  const escrowAdmin = adminFromSeed(config.adminSeed, keyring);
  const contractAdmins = (config.admins.contractAdmins || []).map(a => adminFromSeed(a, keyring));
  const collectionAdmins = {};
  const collectionAdminsAddresses = {};
  for(let collectionId of Object.keys(config.collectionAdmins)) {
    collectionAdmins[collectionId] = (config.collectionAdmins[collectionId] || []).map(a => adminFromSeed(a, keyring));
    collectionAdminsAddresses[collectionId] = collectionAdmins[collectionId].map(a => a.address);
  }

  const admins = {
    escrowAdmin: escrowAdmin,
    contractAdmins: contractAdmins,
    collectionAdmins: collectionAdmins
  }


  const adminsPool = new AdminPool(admins);

  const adminsAddresses = JSON.stringify({
    escrowAdmin: escrowAdmin.address,
    contractAdmins: contractAdmins.map(a => a.address),
    collectionAdmins: collectionAdminsAddresses
  }, null, '  ');

  log(`Admins:
${adminsAddresses}`);

  return new UniqueClient(api, config, adminsPool, escrowAdmin.address.toString());
}

class UniqueClient {
  constructor(api, config, adminsPool, mainAdminAddress) {
    this.api = api;

    this.adminsPool = adminsPool;

    this.abi = new Abi(contractAbi);
    this.matcherAddress = config.marketContractAddress;
    this.useWhiteLists = config.whiteList;
    this.mainAdminAddress = mainAdminAddress;
  }

  async subscribeToBlocks(onNewBlock) {
    await this.api.rpc.chain.subscribeNewHeads((header) => {
      onNewBlock(header);
    });
  }

  async readBlock(blockNumber) {
    const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);

    // Memo: If it fails here, check custom types
    const [signedBlock, events] = await Promise.all([this.api.rpc.chain.getBlock(blockHash), this.api.query.system.events.at(blockHash)]);
    return {
      signedBlock,
      blockHash,
      events
    };
  }

  sendAsContractAdmin(tx) {
    return this.adminsPool.rentContractAdmin((admin, isMain, release) => sendTransactionAsync(admin, tx, release));
  }

  parseExtrinsic(extrinsic, extrinsicIndex, events, blockNum) {
    return parseExtrinsic(extrinsic, extrinsicIndex, events, this.matcherAddress, this.abi, this.mainAdminAddress, blockNum);
  }

  async sendNftTxAsync(recipient, collection_id, token_id, admin) {
    await this.adminsPool.rentCollectionAdmin(collection_id, async (admin, isMainAdmin, release) => {
      const tx = isMainAdmin
        ? this.api.tx.nft.transfer(recipient, collection_id, token_id, 0)
        : this.api.tx.nft.transferFrom(this.mainAdminAddress, recipient, collection_id, token_id, 0);
      await sendTransactionAsync(admin, tx, release);
    });
  }

  async registerQuoteDepositAsync(depositorAddress, amount) {
    log(`${depositorAddress} deposited ${amount} in ${quoteId} currency`);

    const contract = new ContractPromise(this.api, this.abi, this.matcherAddress);

    const value = 0;
    const maxgas = 1000000000000;

    let amountBN = new BigNumber(amount);
    const tx = contract.tx.registerDeposit(value, maxgas, quoteId, amountBN.toString(), depositorAddress);
    await this.sendAsContractAdmin(tx);
  }

  async registerNftDepositAsync(depositorAddress, collection_id, token_id) {
    log(`${depositorAddress} deposited ${collection_id}, ${token_id}`);
    const contract = new ContractPromise(this.api, this.abi, this.matcherAddress);

    const value = 0;
    const maxgas = 1000000000000;

    // if (blackList.includes(token_id)) {
    //   log(`Blacklisted NFT received. Silently returning.`, "WARNING");
    //   return;
    // }

    const tx = contract.tx.registerNftDeposit(value, maxgas, collection_id, token_id, depositorAddress);
    await this.sendAsContractAdmin(tx);
  }

  async addWhiteList(userAddress) {
    if (!this.useWhiteLists) return;

    const whiteListedBefore = (await api.query.nft.contractWhiteList(this.matcherAddress, userAddress)).toJSON();
    if (!whiteListedBefore) {
      try {
        const addTx = api.tx.nft.addToContractWhiteList(this.matcherAddress, userAddress);
        //await this.sendAsAdmin(addTx {{{{
        // To do rent escrow admin.
      } catch(error) {
        log(`Failed add to while list. Address: ${userAddress}`);
      }
    }
  }

}

module.exports = {
  createUniqueClient,
  ...types
};