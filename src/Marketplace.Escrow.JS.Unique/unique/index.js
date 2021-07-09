const { log } = require('../lib');
const connect = require('./connect');
const { Abi, ContractPromise } = require("@polkadot/api-contract");
const contractAbi = require("../market_metadata.json");
const { Keyring } = require('@polkadot/api');
const {parseExtrinsic, ...types} = require('./parse_extrinsic');

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

function sendTransactionAsync(sender, transaction) {
  return new Promise(async (resolve, reject) => {
    try {
      let unsub = await transaction.signAndSend(sender, ({ events = [], status }) => {
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


async function createUniqueClient(config) {
  const api = await connect(config);

  return {
    registerQuoteDepositAsync: (depositorAddress, amount) => registerQuoteDepositAsync(api, admin, depositorAddress, amount, matcherAddress),
    registerNftDepositAsync: (depositorAddress, collection_id, token_id) => registerNftDepositAsync(api, admin, depositorAddress, collection_id, token_id, matcherAddress),
  };
}

class UniqueClient {
  async static create(config) {
    const api = await connect(config);

    const keyring = new Keyring({ type: 'sr25519' });

    const mainAdmin = keyring.addFromUri(config.adminSeed);
    adminAddress = admin.address.toString();
    log(`Escrow admin address: ${adminAddress}`);

    const otherAdmins = config.additionalAdminSeeds.map(a => keyring.addFromUri(a));
    log('Additional admins addresses');
    for(let a of otherAdmins) {
      log(a.address.toString());
    }

    const adminsPool = new AdminPool(mainAdmin, otherAdmins);

    return new UniqueClient(api, config, adminsPool);
  }

  constructor(api, config, adminsPool) {
    this.api = api;

    this.adminsPool = adminsPool;

    this.abi = new Abi(contractAbi);
    this.matcherAddress = config.marketContractAddress;
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

  parseExtrinsic(extrinsic, extrinsicIndex, events, blockNum) {
    return parseExtrinsic(extrinsic, extrinsicIndex, events, this.matcherAddress, this.abi, this.admin, blockNum);
  }

  async sendNftTxAsync(recipient, collection_id, token_id, admin) {
    const tx = this.api.tx.nft.transfer(recipient, collection_id, token_id, 0);
      await this.adminsPool.rent((admin, isMain) => sendTransactionAsync(admin, tx));
    }

  async registerQuoteDepositAsync(depositorAddress, amount) {
    log(`${depositorAddress} deposited ${amount} in ${quoteId} currency`);

    const contract = new ContractPromise(this.api, this.abi, this.matcherAddress);

    const value = 0;
    const maxgas = 1000000000000;

    let amountBN = new BigNumber(amount);
    const tx = contract.tx.registerDeposit(value, maxgas, quoteId, amountBN.toString(), depositorAddress);
    await this.adminsPool.rent((admin, isMain) => sendTransactionAsync(admin, tx));

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
    await this.adminsPool.rent((admin, isMain) => sendTransactionAsync(admin, tx));
  }

}

module.exports = {
  createUniqueClient,
  ...types
};