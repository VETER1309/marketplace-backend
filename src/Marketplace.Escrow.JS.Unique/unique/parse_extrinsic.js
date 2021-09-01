const { hexToU8a } = require('@polkadot/util');
const {log, BigNumber} = require('../lib');

const EXTRINSIC_TYPE_ADMIN_RECEIVED_TOKEN = 'ADMIN_RECEIVED_TOKEN';
const EXTRINSIC_TYPE_ASK_CONTRACT_CALL = 'ASK_CONTRACT_CALL';
const EXTRINSIC_TYPE_BUY_CONTRACT_CALL = 'BUY_CONTRACT_CALL';
const EXTRINSIC_TYPE_CANCEL_CONTRACT_CALL = 'CANCEL_CONTRACT_CALL';
const EXTRINSIC_TYPE_WITHDRAW_CONTRACT_CALL = 'WITHDRAW_CONTRACT_CALL';

function parseExtrinsic(extrinsic, extrinsicIndex, events, matcherAddress, abi, adminAddress, blockNum) {
  if(!isSuccessfulExtrinsic(events, extrinsicIndex)) {
    return undefined;
  }

  const { _isSigned, _meta, method: { args, method, section } } = extrinsic;
  if ((section == "nft") && (method == "transfer") && (args[0] == adminAddress)) {
    const address = extrinsic.signer.toString();
    const collectionId = args[1];
    const tokenId = args[2];

    return {
      type: EXTRINSIC_TYPE_ADMIN_RECEIVED_TOKEN,
      address,
      collectionId,
      tokenId
    }
  }

  if ((section == "contracts") && (method == "call") && (args[0].toString() == matcherAddress)) {
    log(`Contract call in block ${blockNum}: ${args[0].toString()}, ${args[1].toString()}, ${args[2].toString()}, ${args[3].toString()}`);

    let data = args[3].toString();
    log(`data = ${data}`);

    const askTx = parseAskContractCall(data);
    if(askTx) {
      return {
        ...askTx,
        type: EXTRINSIC_TYPE_ASK_CONTRACT_CALL
      };
    }

    const buyTx = parseBuyContractCall(abi, data, events, extrinsicIndex, matcherAddress);
    if(buyTx) {
      return {
        ...buyTx,
        type: EXTRINSIC_TYPE_BUY_CONTRACT_CALL
      };
    }

    const cancelTx = parseCancelCall(abi, data, events, extrinsicIndex, matcherAddress);
    if(cancelTx) {
      return {
        ...cancelTx,
        type: EXTRINSIC_TYPE_CANCEL_CONTRACT_CALL
      };
    }

    const withdrawTx = parseWithdrawCall(abi, data, events, extrinsicIndex, matcherAddress);
    if(withdrawTx) {
      return {
        ...withdrawTx,
        type: EXTRINSIC_TYPE_WITHDRAW_CONTRACT_CALL
      };
    }
  }

  return undefined;
}

function parseAskContractCall(data) {
  // Ask call
  if (!data.startsWith("0x020f741e")) {
    return undefined;
  }
  //    CallID   collection       token            quote            price
  // 0x 020f741e 0300000000000000 1200000000000000 0200000000000000 0080c6a47e8d03000000000000000000
  //    0        4                12               20               28

  if (data.substring(0,2) === "0x") data = data.substring(2);
  const collectionIdHex = "0x" + data.substring(8, 24);
  const tokenIdHex = "0x" + data.substring(24, 40);
  const quoteIdHex = "0x" + data.substring(40, 56);
  const priceHex = "0x" + data.substring(56);
  const collectionId = beHexToNum(collectionIdHex).toString();
  const tokenId = beHexToNum(tokenIdHex).toString();
  const quoteId = beHexToNum(quoteIdHex).toString();
  const price = beHexToNum(priceHex).toString();

  return {
    collectionId,
    tokenId,
    quoteId,
    price
  };
}

function parseBuyContractCall(abi, data, events, extrinsicIndex, matcherAddress) {
  if (!data.startsWith("0x15d62801")) {
    return undefined;
  }

  const withdrawNFTEvent = findMatcherEvent(events, abi, extrinsicIndex, 'WithdrawNFT', matcherAddress);
  if(!withdrawNFTEvent) {
    throw `Couldn't find WithdrawNFT event in Buy call`;
  }
  const withdrawQuoteMatchedEvent = findMatcherEvent(events, abi, extrinsicIndex, 'WithdrawQuoteMatched', matcherAddress);
  if(!withdrawQuoteMatchedEvent) {
    throw `Couldn't find WithdrawQuoteMatched event in Buy call`;
  }

  const buyerAddress = withdrawNFTEvent.args[0].toString();
  const collectionId = withdrawNFTEvent.args[1];
  const tokenId = withdrawNFTEvent.args[2];

  const sellerAddress = withdrawQuoteMatchedEvent.args[0].toString();
  const quoteId = withdrawQuoteMatchedEvent.args[1].toNumber();
  const price = withdrawQuoteMatchedEvent.args[2].toString();
  return {
    buyerAddress,
    collectionId,
    tokenId,
    sellerAddress,
    quoteId,
    price
  };
}

function parseCancelCall(abi, data, events, extrinsicIndex, matcherAddress) {
  if (!data.startsWith("0x9796e9a7")) {
    return undefined;
  }
  const withdrawNFTEvent = findMatcherEvent(events, abi, extrinsicIndex, 'WithdrawNFT', matcherAddress);
  const sellerAddress = withdrawNFTEvent.args[0];
  const collectionId = withdrawNFTEvent.args[1];
  const tokenId = withdrawNFTEvent.args[2];

  return {
    sellerAddress,
    collectionId,
    tokenId
  };
}

function parseWithdrawCall(abi, data, events, extrinsicIndex, matcherAddress) {
  if (!data.startsWith("0x410fcc9d")) {
    return undefined;
  }
  const withdrawQuoteUnusedEvent = findMatcherEvent(events, abi, extrinsicIndex, 'WithdrawQuoteUnused', matcherAddress);

  const withdrawerAddress = withdrawQuoteUnusedEvent.args[0];
  const quoteId = parseInt(withdrawQuoteUnusedEvent.args[1].toString());
  const price = withdrawQuoteUnusedEvent.args[2].toString();

  return {
    withdrawerAddress,
    quoteId,
    price
  };
}

function findMatcherEvent(allRecords, abi, extrinsicIndex, eventName, matcherAddress) {
  return allRecords
    .filter(r =>
      r.event.method.toString() === 'ContractEmitted'
      && r.phase.isApplyExtrinsic
      && r.phase.asApplyExtrinsic.toNumber() === extrinsicIndex
      && r.event.data[0]
      && r.event.data[0].toString() === matcherAddress
    )
    .map(r => abi.decodeEvent(r.event.data[1]))
    .filter(r => r.event.identifier === eventName)[0];
}

function isSuccessfulExtrinsic(eventRecords, extrinsicIndex) {
  const events = eventRecords
    .filter(({ phase }) =>
      phase.isApplyExtrinsic &&
      phase.asApplyExtrinsic.eq(extrinsicIndex)
    )
    .map(({ event }) => `${event.section}.${event.method}`);

  return events.includes('system.ExtrinsicSuccess');
}

function beHexToNum(beHex) {
  const arr = hexToU8a(beHex);
  let strHex = '';
  for (let i=arr.length-1; i>=0; i--) {
    let digit = arr[i].toString(16);
    if (arr[i] <= 15) digit = '0' + digit;
    strHex += digit;
  }
  return new BigNumber(strHex, 16);
}

module.exports = {
  parseExtrinsic,
  EXTRINSIC_TYPE_ADMIN_RECEIVED_TOKEN,
  EXTRINSIC_TYPE_ASK_CONTRACT_CALL,
  EXTRINSIC_TYPE_BUY_CONTRACT_CALL,
  EXTRINSIC_TYPE_CANCEL_CONTRACT_CALL,
  EXTRINSIC_TYPE_WITHDRAW_CONTRACT_CALL
}