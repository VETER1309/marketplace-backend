const config = {
  wsEndpoint : process.env.wsEndpoint || 'ws://localhost:9944/',

  adminSeed : process.env.ADMIN_SEED || '//Alice',
  ksmAdminSeed : process.env.KSM_ADMIN_SEED || '//Dave',
  marketContractAddress : process.env.MatcherContractAddress || "5HGaEHg8PDhcEZGkfe6Tr9xmaroXjY5xX2c3NBdshoMkgZb6",

  // Account whom sells token in tests
  sellerSeed: process.env.SELLER_SEED || '//Bob',
  buyerSeed: process.env.BUYER_SEED || '//Charlie',
  seller2Seed: process.env.SELLER_2_SEED || '//Eve',
  buyer2Seed: process.env.BUYER_2_SEED || '//Ferdie',

  dbHost : process.env.DB_HOST || 'localhost',
  dbPort : process.env.DB_PORT || 5432,
  dbName : process.env.DB_NAME|| 'marketplace',
  dbUser : process.env.DB_USER || 'marketplace',
  dbPassword : process.env.DB_PASSWORD || 'marletplace12345'
};

module.exports = config;