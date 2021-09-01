const defaultAdmins = `
{
  "contract": [],
  "collection": {
    "25": []
  }
}
`;

const config = {
  wsEndpoint : process.env.wsEndpoint || 'wss://testnet2.uniquenetwork.io',

  escrowAdminSeed : process.env.ADMIN_SEED || '//Alice',
  otherAdminSeeds : JSON.parse(process.env.OTHER_ADMINS_SEEDS || defaultAdmins),
  marketContractAddress : process.env.MatcherContractAddress || "5HGaEHg8PDhcEZGkfe6Tr9xmaroXjY5xX2c3NBdshoMkgZb6",

  whiteList : false,

  dbHost : process.env.DB_HOST || 'localhost',
  dbPort : process.env.DB_PORT || 5432,
  dbName : process.env.DB_NAME|| 'marketplace',
  dbUser : process.env.DB_USER || 'marketplace',
  dbPassword : process.env.DB_PASSWORD || '12345',

  startFromBlock : process.env.START_FROM_BLOCK || 'current', // Either block number or 'current' to start from current block.
};

module.exports = config;