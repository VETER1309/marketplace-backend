const { Client } = require('pg');

async function getDbConnection(config) {
  const dbClient = new Client({
    user: config.dbUser,
    host: config.dbHost,
    database: config.dbName,
    password: config.dbPassword,
    port: config.dbPort
  });
  await dbClient.connect();
  return dbClient;
}

class Db {
  constructor(dbClient) {
    this.dbClient = dbClient;
  }

  async findOffer(collectionId, tokenId) {
    const findOfferSql =
`SELECT "Id", "CreationDate", "CollectionId", "TokenId", "Price", "Seller", "Metadata", "OfferStatus", "SellerPublicKeyBytes", "QuoteId"
    FROM public."Offer"
    WHERE "CollectionId" = $1 AND "TokenId" = $2
;`;

    const offers = await this.dbClient.query(findOfferSql, [collectionId, tokenId]);
    return offers.rows;
  }

  async findTrade(collectionId, tokenId) {
    return (await this.dbClient.query(
`SELECT t."Id", t."TradeDate", t."Buyer", t."OfferId"
    FROM public."Trade" t
    JOIN public."Offer" o ON o."Id" = t."OfferId"
    WHERE o."CollectionId" = $1 AND o."TokenId" = $2;`,
    [collectionId, tokenId])).rows;
  }
}

module.exports = async function(config) {
  const client = await getDbConnection(config);
  return new Db(client);
};