const { hexToU8a } = require('@polkadot/util');
const { decodeAddress, encodeAddress } = require('@polkadot/util-crypto');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');
const { log, BigNumber } = require('./lib');
const {createUniqueClient,
  EXTRINSIC_TYPE_ADMIN_RECEIVED_TOKEN,
  EXTRINSIC_TYPE_ASK_CONTRACT_CALL,
  EXTRINSIC_TYPE_BUY_CONTRACT_CALL,
  EXTRINSIC_TYPE_CANCEL_CONTRACT_CALL,
  EXTRINSIC_TYPE_WITHDRAW_CONTRACT_CALL
} = require('./unique');
const { connect, log } = require('./lib');
const fs = require('fs');

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const { Client } = require('pg');
let dbClient = null;

const incomingTxTable = "NftIncomingTransaction";
const incomingQuoteTxTable = "QuoteIncomingTransaction";
const offerTable = "Offer";
const tradeTable = "Trade";
const outgoingQuoteTxTable = "QuoteOutgoingTransaction";
// const outgoingTxTable = "NftOutgoingTransaction";
const uniqueBlocksTable = "UniqueProcessedBlock";
let adminAddress;

const quoteId = 2; // KSM

let bestBlockNumber = 0; // The highest block in chain (not final)
let timer;

let resolver = null;
function delay(ms) {
  return new Promise(async (resolve, reject) => {
    resolver = resolve;
    timer = setTimeout(() => {
      resolver = null;
      resolve();
    }, ms);
  });
}

function cancelDelay() {
  clearTimeout(timer);
  if (resolver) resolver();
}


async function getDbConnection() {
  if (!dbClient) {
    dbClient = new Client({
      user: config.dbUser,
      host: config.dbHost,
      database: config.dbName,
      password: config.dbPassword,
      port: config.dbPort
    });
    dbClient.connect();
    log("Connected to the DB");
  }
  return dbClient;
}

async function getLastHandledUniqueBlock() {
  const conn = await getDbConnection();
  const selectLastHandledUniqueBlockSql = `SELECT * FROM public."${uniqueBlocksTable}" ORDER BY public."${uniqueBlocksTable}"."BlockNumber" DESC LIMIT 1;`;
  const res = await conn.query(selectLastHandledUniqueBlockSql);
  const lastBlock = (res.rows.length > 0) ? res.rows[0].BlockNumber : 0;
  return lastBlock;
}

async function addHandledUniqueBlock(blockNumber) {
  const conn = await getDbConnection();
  const insertHandledBlocSql = `INSERT INTO public."${uniqueBlocksTable}" VALUES ($1, now());`;
  await conn.query(insertHandledBlocSql, [blockNumber]);
}

async function addIncomingNFTTransaction(address, collectionId, tokenId, blockNumber) {
  const conn = await getDbConnection();

  // Convert address into public key
  const publicKey = Buffer.from(decodeAddress(address), 'binary').toString('base64');

  // Clear all previous appearances of this NFT with status 0, update to error
  const errorMessage = "Failed to register (sync err)";
  const updateIncomingNftSql = `UPDATE public."${incomingTxTable}" 
    SET  "Status" = 2, "ErrorMessage" = $1 
    WHERE "Status" = 0 AND "CollectionId" = $2 AND "TokenId" = $3;`;
  await conn.query(updateIncomingNftSql, [errorMessage, collectionId, tokenId]);

  // Clear all previous appearances of this NFT with null orderId
  const updateNftIncomesSql = `DELETE FROM public."${incomingTxTable}"
    WHERE "OfferId" IS NULL AND "CollectionId" = $1 AND "TokenId" = $2;`
  await conn.query(updateNftIncomesSql, [collectionId, tokenId]);

  // Add incoming NFT with Status = 0
  const insertIncomingNftSql = `INSERT INTO public."${incomingTxTable}"("Id", "CollectionId", "TokenId", "Value", "OwnerPublicKey", "UniqueProcessedBlockId", "Status", "LockTime", "ErrorMessage") VALUES ($1, $2, $3, 0, $4, $5, 0, now(), '');`;
  await conn.query(insertIncomingNftSql, [uuidv4(), collectionId, tokenId, publicKey, blockNumber]);
}

async function setIncomingNftTransactionStatus(id, status, error = "OK") {
  const conn = await getDbConnection();

  const updateIncomingNftStatusSql = `UPDATE public."${incomingTxTable}" SET "Status" = $1, "ErrorMessage" = $2 WHERE "Id" = $3`;

  // Get one non-processed Kusama transaction
  await conn.query(updateIncomingNftStatusSql, [status, error, id]);
}

async function getIncomingNFTTransaction() {
  const conn = await getDbConnection();

  const getIncomingNftsSql = `SELECT * FROM public."${incomingTxTable}"
    WHERE "Status" = 0`;
  // Get one non-processed incoming NFT transaction
  // Id | CollectionId | TokenId | Value | OwnerPublicKey | Status | LockTime | ErrorMessage | UniqueProcessedBlockId
  const res = await conn.query(getIncomingNftsSql);

  let nftTx = {
    id: '',
    collectionId: 0,
    tokenId: 0,
    sender: null
  };

  if (res.rows.length > 0) {
    let publicKey = Buffer.from(res.rows[0].OwnerPublicKey, 'base64');

    try {
      // Convert public key into address
      const address = encodeAddress(publicKey);

      nftTx.id = res.rows[0].Id;
      nftTx.collectionId = res.rows[0].CollectionId;
      nftTx.tokenId = res.rows[0].TokenId;
      nftTx.sender = address;
    }
    catch (e) {
      setIncomingNftTransactionStatus(res.rows[0].Id, 2, e.toString());
      log(e, "ERROR");
    }

  }

  return nftTx;
}

async function addOffer(seller, collectionId, tokenId, quoteId, price) {
  const conn = await getDbConnection();

  // Convert address into public key
  const publicKey = Buffer.from(decodeAddress(seller), 'binary').toString('base64');

  const inserOfferSql = `INSERT INTO public."${offerTable}"("Id", "CreationDate", "CollectionId", "TokenId", "Price", "Seller", "Metadata", "OfferStatus", "SellerPublicKeyBytes", "QuoteId")
    VALUES ($1, now(), $2, $3, $4, $5, '', 1, $6, $7);`;
  const offerId = uuidv4();
  //Id | CreationDate | CollectionId | TokenId | Price | Seller | Metadata | OfferStatus | SellerPublicKeyBytes | QuoteId
  await conn.query(inserOfferSql, [offerId, collectionId, tokenId, price, publicKey, decodeAddress(seller), quoteId]);

  const updateNftIncomesSql = `UPDATE public."${incomingTxTable}"
	SET "OfferId"=$1
	WHERE "CollectionId" = $2 AND "TokenId" = $3 AND "OfferId" IS NULL;`
  await conn.query(updateNftIncomesSql, [offerId, collectionId, tokenId]);
}

async function getOpenOfferId(collectionId, tokenId) {
  const conn = await getDbConnection();
  const selectOpenOffersSql = `SELECT * FROM public."${offerTable}" WHERE "CollectionId" = ${collectionId} AND "TokenId" = ${tokenId} AND "OfferStatus" = 1;`;
  const res = await conn.query(selectOpenOffersSql);
  const id = (res.rows.length > 0) ? res.rows[0].Id : '';
  return id;
}

async function updateOffer(collectionId, tokenId, newStatus) {
  const conn = await getDbConnection();

  const id = await getOpenOfferId(collectionId, tokenId);

  const updateOfferSql = `UPDATE public."${offerTable}" SET "OfferStatus" = ${newStatus} WHERE "Id" = '${id}'`;
  // Only update active offer (should be one)
  await conn.query(updateOfferSql);

  return id;
}

async function addTrade(offerId, buyer) {
  const conn = await getDbConnection();

  // Convert address into public key
  const publicKey = Buffer.from(decodeAddress(buyer), 'binary').toString('base64');

  const insertTradeSql = `INSERT INTO public."${tradeTable}"("Id", "TradeDate", "Buyer", "OfferId")
    VALUES ($1, now(), $2, $3);`;
  await conn.query(insertTradeSql,
    [uuidv4(), publicKey, offerId]);
}

async function addOutgoingQuoteTransaction(quoteId, amount, recipient, withdrawType) {
  const conn = await getDbConnection();

  // Convert address into public key
  const publicKey = Buffer.from(decodeAddress(recipient), 'binary').toString('base64');

  const insertOutgoingQuoteTransactionSql = `INSERT INTO public."${outgoingQuoteTxTable}"("Id", "Status", "ErrorMessage", "Value", "QuoteId", "RecipientPublicKey", "WithdrawType")
    VALUES ($1, 0, '', $2, $3, $4, $5);`;
  // Id | Status | ErrorMessage | Value | QuoteId | RecipientPublicKey | WithdrawType
  // WithdrawType == 1 => Withdraw matched
  //                 0 => Unused
  await conn.query(insertOutgoingQuoteTransactionSql, [uuidv4(), amount, parseInt(quoteId), publicKey, withdrawType]);
}

async function setIncomingKusamaTransactionStatus(id, status, error = "OK") {
  const conn = await getDbConnection();

  const updateIncomingKusamaTransactionStatusSql = `UPDATE public."${incomingQuoteTxTable}" SET "Status" = $1, "ErrorMessage" = $2 WHERE "Id" = $3`;
  // Get one non-processed Kusama transaction
  await conn.query(updateIncomingKusamaTransactionStatusSql, [status, error, id]);
}

async function getIncomingKusamaTransaction() {
  const conn = await getDbConnection();

  const selectIncomingQuoteTxsSql = `SELECT * FROM public."${incomingQuoteTxTable}"
    WHERE
      "Status" = 0
      AND "QuoteId" = 2 LIMIT 1
  `;
  // Get one non-processed incoming Kusama transaction
  // Id | Amount | QuoteId | Description | AccountPublicKey | BlockId | Status | LockTime | ErrorMessage
  const res = await conn.query(selectIncomingQuoteTxsSql);

  let ksmTx = {
    id: '',
    amount: '0',
    sender: null
  };

  if (res.rows.length > 0) {
    let publicKey = res.rows[0].AccountPublicKey;

    try {
      if ((publicKey[0] != '0') || (publicKey[1] != 'x'))
        publicKey = '0x' + publicKey;

      // Convert public key into address
      const address = encodeAddress(hexToU8a(publicKey));

      ksmTx.id = res.rows[0].Id;
      ksmTx.sender = address;
      ksmTx.amount = res.rows[0].Amount;
    }
    catch (e) {
      setIncomingKusamaTransactionStatus(res.rows[0].Id, 2, e.toString());
      log(e, "ERROR");
    }

  }

  return ksmTx;
}

async function scanNftBlock(uniqueClient, blockNum) {

  if (blockNum % 10 == 0) log(`Scanning Block #${blockNum}`);

  const {
    blockHash,
    signedBlock,
    events
  } = await uniqueClient.readBlock(blockNum);

  // log(`Reading Block ${blockNum} Transactions`);

  for (let [extrinsicIndex, ex] of signedBlock.block.extrinsics.entries()) {
    try {
      const parsedExtrinsic = uniqueClient.parseExtrinsic(ex, extrinsicIndex, events, blockNum);
      if(!parsedExtrinsic) {
        continue;
      }

      switch (parsedExtrinsic.type) {
        case EXTRINSIC_TYPE_ADMIN_RECEIVED_TOKEN: {
          await handleIncomintNftTx(parsedExtrinsic, blockNum);
          break;
        }
        case EXTRINSIC_TYPE_ASK_CONTRACT_CALL: {
          await handleAskCall(ex, parsedExtrinsic, blockNum, blockHash);
          break;
        }
        case EXTRINSIC_TYPE_BUY_CONTRACT_CALL: {
          await handleBuyCall(uniqueClient, parsedExtrinsic);
          break;
        }
        case EXTRINSIC_TYPE_CANCEL_CONTRACT_CALL: {
          await handleCancelCall(uniqueClient, parsedExtrinsic);
          break;
        }
        case EXTRINSIC_TYPE_WITHDRAW_CONTRACT_CALL: {
          await handleWithdrawCall(parsedExtrinsic);
          break;
        }
      }

    }
    catch (e) {
      log(e, "ERROR");
    }
  }
}

async function handleIncomintNftTx(tx, blockNum) {
  const {
    address,
    collectionId,
    tokenId
  } = tx;
  log(`NFT deposit from ${tx.address.toString()} id (${collectionId}, ${tokenId})`, "RECEIVED");

  // Save in the DB
  await addIncomingNFTTransaction(address, collectionId, tokenId, blockNum);
}

async function handleAskCall(ex, askTx, blockNum, blockHash){
  log(`======== Ask Call`);
  const {
    collectionId,
    tokenId,
    quoteId,
    price
  } = askTx;

  log(`${ex.signer.toString()} listed ${collectionId}-${tokenId} in block ${blockNum} hash: ${blockHash} for ${quoteId}-${price}`);

  await addOffer(ex.signer.toString(), collectionId, tokenId, quoteId, price);
}

async function handleBuyCall(uniqueClient, buyTx) {
  const {
    buyerAddress,
    collectionId,
    tokenId,
    sellerAddress,
    quoteId,
    price
  } = buyTx;
  log(`======== Buy call`);

  log(`NFT Buyer address: ${buyerAddress}`);
  log(`collectionId = ${collectionId.toString()}`);
  log(`tokenId = ${tokenId.toString()}`);
  log(`NFT Seller address: ${sellerAddress}`);
  log(`Price: ${quoteId} - ${price.toString()}`);

  // Update offer to done (status = 3 = Traded)
  const id = await updateOffer(collectionId.toString(), tokenId.toString(), 3);

  // Record trade
  await addTrade(id, buyerAddress);

  // Record outgoing quote tx
  await addOutgoingQuoteTransaction(quoteId, price.toString(), sellerAddress, 1);

  // Execute NFT transfer to buyer
  await uniqueClient.sendNftTxAsync(buyerAddress.toString(), collectionId, tokenId);
}

async function handleCancelCall(uniqueClient, cancelTx) {
  log(`======== Cancel call`);

  const {
    sellerAddress,
    collectionId,
    tokenId
  } = cancelTx;
  // WithdrawNFT
  log(`NFT Seller address: ${sellerAddress.toString()}`);
  log(`collectionId = ${collectionId.toString()}`);
  log(`tokenId = ${tokenId.toString()}`);


  // Update offer to calceled (status = 2 = Canceled)
  await updateOffer(collectionId.toString(), tokenId.toString(), 2);

  // Execute NFT transfer back to seller
  await uniqueClient.sendNftTxAsync(sellerAddress.toString(), collectionId, tokenId);
}

async function handleWithdrawCall(withdrawTx) {
  log(`======== Withdraw call`);
  const {
    withdrawerAddress,
    quoteId,
    price
  } = withdrawTx;

  log(`--- Event 1: ${event.event.identifier}`);
  log(`Withdrawing address: ${withdrawerAddress.toString()}`);
  log(`Price: ${quoteId} - ${price.toString()}`);

  // Record outgoing quote tx
  await addOutgoingQuoteTransaction(quoteId, price.toString(), withdrawerAddress, 0);
}

function onNewBlock(header) {
  bestBlockNumber = header.number;
  cancelDelay();
}

async function addWhiteList({
  api, 
  userAddress, 
  sender, 
  marketContractAddress
}) {
  if (!config.whiteList) return;

  const whiteListedBefore = (await api.query.nft.contractWhiteList(marketContractAddress, userAddress)).toJSON();
  if (!whiteListedBefore) {
    try {
      const addTx = api.tx.nft.addToContractWhiteList(marketContractAddress, userAddress);
      await sendTransactionAsync(sender, addTx);
    } catch(error) {
      log(`Failed add to while list. Address: ${userAddress}`);
    }
  }
}

async function handleUnique() {
  const uniqueClient = await createUniqueClient(config);

  await uniqueClient.subscribeToBlocks(onNewBlock);

  // Work indefinitely
  while (true) {

    // 1. Catch up with blocks
    while (true) {
      // Get last processed block
      let blockNum = parseInt(await getLastHandledUniqueBlock()) + 1;

      try {
        if (blockNum <= bestBlockNumber) {
          await addHandledUniqueBlock(blockNum);

          // Handle NFT Deposits (by analysing block transactions)
          await scanNftBlock(uniqueClient, blockNum);
        } else break;

      } catch (ex) {
        log(ex);
        if (!ex.toString().includes("State already discarded"))
          await delay(1000);
      }
    }

    // Handle queued NFT deposits
    let deposit = false;
    do {
      deposit = false;
      const nftTx = await getIncomingNFTTransaction();
      if (nftTx.id.length > 0) {
        deposit = true;

        try {
          await uniqueClient.registerNftDepositAsync(nftTx.sender, nftTx.collectionId, nftTx.tokenId);
          await setIncomingNftTransactionStatus(nftTx.id, 1);
          log(`NFT deposit from ${nftTx.sender} id (${nftTx.collectionId}, ${nftTx.tokenId})`, "REGISTERED");
        } catch (e) {
          log(`NFT deposit from ${nftTx.sender} id (${nftTx.collectionId}, ${nftTx.tokenId})`, "FAILED TO REGISTER");
          await delay(6000);
        }
      }
    } while (deposit);

    // Handle queued KSM deposits
    do {
      deposit = false;
      const ksmTx = await getIncomingKusamaTransaction();
      if (ksmTx.id.length > 0) {
        deposit = true;

        try {
          const paraments = {
            api,
            userAddress: ksmTx.sender,
            sender: admin,
            marketContractAddress: config.marketContractAddress
          };
          // Add sender to contract white list
          await addWhiteList(paraments);
          
          await uniqueClient.registerQuoteDepositAsync(ksmTx.sender, ksmTx.amount);
          await setIncomingKusamaTransactionStatus(ksmTx.id, 1);
          log(`Quote deposit from ${ksmTx.sender} amount ${ksmTx.amount.toString()}`, "REGISTERED");
        } catch (e) {
          log(`Quote deposit from ${ksmTx.sender} amount ${ksmTx.amount.toString()}`, "FAILED TO REGISTER");
          await delay(6000);
        }
      }

    } while (deposit);

    await delay(6000);
  }

}

async function migrateDb(){
  const conn = await getDbConnection();
  const migrationSql = fs.readFileSync('migration-script.sql').toString();
  await conn.query(migrationSql);
}

async function main() {
  log(`config.wsEndpoint: ${config.marketContractAddress}`);
  log(`config.marketContractAddress: ${config.marketContractAddress}`);
  await migrateDb();
  await handleUnique();
}

main().catch(console.error).finally(() => process.exit());
