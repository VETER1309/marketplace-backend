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

async function registerQuoteDepositAsync(api, sender, depositorAddress, amount, matcherAddress) {
  log(`${depositorAddress} deposited ${amount} in ${quoteId} currency`);

  const abi = new Abi(contractAbi);
  const contract = new ContractPromise(api, abi, matcherAddress);

  const value = 0;
  const maxgas = 1000000000000;

  let amountBN = new BigNumber(amount);
  const tx = contract.tx.registerDeposit(value, maxgas, quoteId, amountBN.toString(), depositorAddress);
  await sendTransactionAsync(sender, tx);
}

async function registerNftDepositAsync(api, sender, depositorAddress, collection_id, token_id, matcherAddress) {
  log(`${depositorAddress} deposited ${collection_id}, ${token_id}`);
  const abi = new Abi(contractAbi);
  const contract = new ContractPromise(api, abi, matcherAddress);

  const value = 0;
  const maxgas = 1000000000000;

  // if (blackList.includes(token_id)) {
  //   log(`Blacklisted NFT received. Silently returning.`, "WARNING");
  //   return;
  // }

  const tx = contract.tx.registerNftDeposit(value, maxgas, collection_id, token_id, depositorAddress);
  await sendTransactionAsync(sender, tx);
}

async function sendNftTxAsync(api, recipient, collection_id, token_id, admin) {
  const tx = api.tx.nft
    .transfer(recipient, collection_id, token_id, 0);
  await sendTransactionAsync(admin, tx);
}

async function subscribeToBlocks(api, onNewBlock) {
  await api.rpc.chain.subscribeNewHeads((header) => {
    onNewBlock(header);
  });
}

async function readBlock(api, blockNumber) {
  const blockHash = await api.rpc.chain.getBlockHash(blockNumber);

  // Memo: If it fails here, check custom types
  const [signedBlock, events] = await Promise.all([api.rpc.chain.getBlock(blockHash), api.query.system.events.at(blockHash)]);
  return {
    signedBlock,
    blockHash,
    events
  };
}

async function createUniqueClient(config) {
  const api = await connect(config);

  const keyring = new Keyring({ type: 'sr25519' });

  const admin = keyring.addFromUri(config.adminSeed);
  adminAddress = admin.address.toString();
  log(`Escrow admin address: ${adminAddress}`);


  const abi = new Abi(contractAbi);
  const matcherAddress = config.marketContractAddress;


  return {
    subscribeToBlocks: (onNewBlock) => subscribeToBlocks(api, onNewBlock),
    readBlock: (blockNumber) => readBlock(api, blockNumber),
    parseExtrinsic: (extrinsic, extrinsicIndex, events, blockNum) => parseExtrinsic(extrinsic, extrinsicIndex, events, matcherAddress, abi, admin, blockNum),
    sendNftTxAsync: (recipient, collection_id, token_id) => sendNftTxAsync(api, recipient, collection_id, token_id, admin),
    registerQuoteDepositAsync: (depositorAddress, amount) => registerQuoteDepositAsync(api, admin, depositorAddress, amount, matcherAddress),
    registerNftDepositAsync: (depositorAddress, collection_id, token_id) => registerNftDepositAsync(api, admin, depositorAddress, collection_id, token_id, matcherAddress),
  };
}

module.exports = {
  createUniqueClient,
  ...types
};