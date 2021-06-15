// Returns tokens and kusamas back to their owners stuck due to a bug with hardcoded event indexes.
const { log } = require('./lib');
const contractAbi = require("./market_metadata.json");
const fs = require("fs");
const { Abi } = require("@polkadot/api-contract");
const config = require('./config');

const log463File = '463_logs';

function log463(str, status) {
  fs.appendFileSync(log463File, `${new Date().toISOString()}: `);
  fs.appendFileSync(log463File, JSON.stringify(str));
  fs.appendFileSync(log463File, '\n');
  log(str, status);
}

function callLog(str) {
  log463(str, 'INFO');
  fs.appendFileSync('463_call_logs', str);
  fs.appendFileSync('463_call_logs', '\n');
}

async function findStuckTokens(api, dbConnection, contract, admin) {
  const adminOwnedTokens = await dbConnection.query(
    `SELECT n."CollectionId", n."TokenId", max(n."UniqueProcessedBlockId") as "UniqueProcessedBlockId"
      FROM public."Offer" o
      inner join public."NftIncomingTransaction" n on o."CollectionId" = n."CollectionId" and o."TokenId" = n."CollectionId"
      where "OfferStatus" = 1
      group by n."CollectionId", n."TokenId";`
  );

  const notAskedTokens = await Promise.all(adminOwnedTokens.rows
    .map(row => contract.query.getAskIdByToken(admin.address, {}, row.CollectionId, row.TokenId).then(r => r.result.isErr ? row : undefined, e => row)));

  return notAskedTokens.filter(r => !!r);
}


async function rehandleBlock(api, admin, blockNum, tokens, updateOffer, sendToken, addTrade, addOutgoingQuoteTransaction) {

  if (blockNum % 10 == 0) log(`Rescanning Block #${blockNum}`);
  const blockHash = await api.rpc.chain.getBlockHash(blockNum);

  // Memo: If it fails here, check custom types
  const signedBlock = await api.rpc.chain.getBlock(blockHash);
  const allRecords = await api.query.system.events.at(blockHash);

  const abi = new Abi(contractAbi);

  for (let [extrinsicIndex, ex] of signedBlock.block.extrinsics.entries()) {
    const events = allRecords
      .filter(({ phase }) =>
        phase.isApplyExtrinsic &&
        phase.asApplyExtrinsic.eq(extrinsicIndex)
      )
      .map(({ event }) => `${event.section}.${event.method}`);

    // skip unsuccessful  extrinsics.
    if (!events.includes('system.ExtrinsicSuccess')) {
      continue;
    }

    const { _isSigned, _meta, method: { args, method, section } } = ex;

    if ((section == "contracts") && (method == "call") && (args[0].toString() == config.marketContractAddress)) {
      try {
        log(`Contract call in block ${blockNum}: ${args[0].toString()}, ${args[1].toString()}, ${args[2].toString()}, ${args[3].toString()}`);
        let data = args[3].toString();

        // Buy call
        if (data.startsWith("0x15d62801")) {
          const [withdrawNftIndex, withdrawNFTEvent] = findMatcherEventAndIndex(allRecords, abi, extrinsicIndex, 'WithdrawNFT');
          const [withdrawQuoteMatchedIndex, withdrawQuoteMatchedEvent] = findMatcherEventAndIndex(allRecords, abi, extrinsicIndex, 'WithdrawQuoteMatched');
          if(!withdrawNFTEvent || !withdrawQuoteMatchedEvent){
            continue;
          }

          // In the bugged version allRecords[1] was WithdrawNFT and allRecords[2] was WithdrawQuoteMatched.
          //if(withdrawNftIndex !== 1 || withdrawQuoteMatchedIndex !== 2)
          {
            const buyerAddress = withdrawNFTEvent.args[0].toString();
            const collectionId = withdrawNFTEvent.args[1].toString();
            const tokenId = withdrawNFTEvent.args[2].toString();
            if(tokens.filter(t => t.CollectionId === collectionId && t.TokenId === tokenId).length <= 0) {
              log(`Admin doesn't own bought token: CollectionId ${collectionId} TokenId ${tokenId}`, 'WARN');
              continue;
            }

            await handleBuyCall(api, admin, withdrawNFTEvent, withdrawQuoteMatchedEvent, updateOffer, sendToken, addTrade, addOutgoingQuoteTransaction);
            const sellerAddress = withdrawQuoteMatchedEvent.args[0].toString();
            const quoteId = withdrawQuoteMatchedEvent.args[1].toNumber();
            const price = withdrawQuoteMatchedEvent.args[2].toString();
            const tradeIndfo = {
              collectionId,
              tokenId,
              sellerAddress,
              quoteId,
              price,
              buyerAddress
            };
            const tradeInfoStr = JSON.stringify(tradeIndfo);
            log463(`Kusama of trade wasn't handled ${tradeInfoStr}`, 'WARN');

            tokens = tokens.filter(t => t.CollectionId !== collectionId || t.TokenId !== tokenId);
          }

        }

        // Cancel: 0x9796e9a703000000000000000100000000000000
        if (data.startsWith("0x9796e9a7")) {
          const [index, event] = findMatcherEventAndIndex(allRecords, abi, extrinsicIndex, 'WithdrawNFT');
          if(!event){
            continue;
          }

          /// used allRecords[1] in the bugged version.
          //if(index !== 1)
          {
            const collectionId = event.args[1].toString();
            const tokenId = event.args[2].toString();
            if(tokens.filter(t => t.CollectionId === collectionId && t.TokenId === tokenId).length <= 0) {
              log(`Admin doesn't own cancelled token: CollectionId ${collectionId} TokenId ${tokenId}`, 'WARN');
              continue;
            }

            await handleCancelCall(api, admin, event, updateOffer, sendToken);

            tokens = tokens.filter(t => t.CollectionId !== collectionId || t.TokenId !== tokenId);
          }
        }

      }
      catch (e) {
        log463(e, "ERROR");
      }
    }
  }

  return tokens;
}

async function handleBuyCall(api, admin, withdrawNFTEvent, withdrawQuoteMatchedEvent, updateOffer, sendToken, addTrade, addOutgoingQuoteTransaction){

  const buyerAddress = withdrawNFTEvent.args[0].toString();
  const collectionId = withdrawNFTEvent.args[1];
  const tokenId = withdrawNFTEvent.args[2];

  log(`Buy CollectionId ${collectionId} ${tokenId}`, 'INFO');

  const sellerAddress = withdrawQuoteMatchedEvent.args[0].toString();
  const quoteId = withdrawQuoteMatchedEvent.args[1].toNumber();
  const price = withdrawQuoteMatchedEvent.args[2].toString();


  // Update offer to done (status = 3 = Traded)
  const id = await updateOffer(collectionId.toString(), tokenId.toString(), 3);

  log(`Updated offer CollectionId ${collectionId} ${tokenId}`, 'INFO');

  // Record trade
  await addTrade(id, buyerAddress);
  log(`Added trade CollectionId ${collectionId} ${tokenId}`, 'INFO');

  await addOutgoingQuoteTransaction(quoteId, price.toString(), sellerAddress, 1);


  // Execute NFT transfer to buyer
  await sendToken(api, admin, buyerAddress.toString(), collectionId, tokenId);
  log(`Sent token to buyer CollectionId ${collectionId} ${tokenId}, buyer: ${buyerAddress}`, 'INFO');
}

async function handleCancelCall(api, admin, event, updateOffer, sendToken) {
  const sellerAddress = event.args[0];
  const collectionId = event.args[1];
  const tokenId = event.args[2];

  log(`Cancelling CollectionId ${collectionId} ${tokenId}, owner: ${sellerAddress}`, 'INFO');

  // Update offer to calceled (status = 2 = Canceled)
  await updateOffer(collectionId.toString(), tokenId.toString(), 2);

  log(`Canceled offer CollectionId ${collectionId} ${tokenId}, owner: ${sellerAddress}`, 'INFO');

  // Execute NFT transfer back to seller
  await sendToken(api, admin, sellerAddress.toString(), collectionId, tokenId);

  log(`Sent token CollectionId ${collectionId} ${tokenId}, owner: ${sellerAddress}`, 'INFO');
}

function findMatcherEventAndIndex(allRecords, abi, extrinsicIndex, eventName) {
  for(let [index, record] of allRecords.entries()) {
    if(record.event.method.toString() === 'ContractEmitted'
      && record.phase.isApplyExtrinsic
      && record.phase.asApplyExtrinsic.toNumber() === extrinsicIndex
      && record.event.data[0]
      && record.event.data[0].toString() === config.marketContractAddress) {
        const contractEvent = abi.decodeEvent(record.event.data[1]);
        if(contractEvent.event.identifier === eventName) {
          return [index, contractEvent];
        }
      }
  }

  return [];
}

async function returnTokensStuckDueTo463(api, dbConnection, contract, admin, lastHandledBlock) {
  log463('Started 463');
  try {
    let tokens = await findStuckTokens(api, dbConnection, contract, admin);
    if(tokens.length === 0) {
      log463('No owned tokens without ask found.', 'INFO');
      return;
    }

    const logLines = tokens.map(t => `Collection: ${t.CollectionId} Token: ${t.TokenId}`);
    log463(`Found ${tokens.length} owned tokens without an ask:
${logLines.join('\n')}`, 'INFO');

    const firstBlock = Math.min(...tokens.map(t => t.UniqueProcessedBlockId));

    for(let i = firstBlock; i < lastHandledBlock; i++) {
      tokens = await rehandleBlock(api, admin, i, tokens, updateOfferMock, sendTokenMock, addTradeMock, addOutgoingQuoteTransactionMock);
      if(tokens.length === 0) {
        break;
      }
    }

    if(tokens.length > 0) {
      log463(`Alarm, not all tokens have benn returned:
${tokens.map(JSON.stringify).join('\n')}`, 'WARN');
    }
  } finally {
    log463('Done with 463');
  }
}


async function updateOfferMock(collectionId, tokenId, newStatus) {
  callLog(`Call updateOffer(${collectionId}, ${tokenId}, ${newStatus})`)
}

async function sendTokenMock(api, sender, recipient, collection_id, token_id) {
  callLog(`Call sendToken(api, sender, ${recipient}, ${collection_id}, ${token_id})`);
}

async function addTradeMock(offerId, buyer) {
  callLog(`Call addTrade(${offerId}, ${buyer})`);
}

async function addOutgoingQuoteTransactionMock(quoteId, price, sellerAddress, type){
  callLog(`Call addOutgoingQuoteTransactionMock(${quoteId}, ${price}, ${sellerAddress}, ${type})`);
}

module.exports = returnTokensStuckDueTo463;