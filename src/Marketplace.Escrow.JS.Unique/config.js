function parseArray(value, separator) {
  if(!value){
    return value;
  }

  return value.split(separator).map(s => s.trim()).filter(s => s.length > 0);
}

const config = {
  wsEndpoint : process.env.wsEndpoint || 'wss://testnet2.uniquenetwork.io',

  adminSeed : process.env.ADMIN_SEED || '//Alice',
  additionalAdminSeeds : parseArray(process.env.ADMIN_SEED, ',') || [],
  marketContractAddress : process.env.MatcherContractAddress || "5HGaEHg8PDhcEZGkfe6Tr9xmaroXjY5xX2c3NBdshoMkgZb6",

  whiteList : false,

  dbHost : process.env.DB_HOST || 'localhost',
  dbPort : process.env.DB_PORT || 5432,
  dbName : process.env.DB_NAME|| 'marketplace',
  dbUser : process.env.DB_USER || 'marketplace',
  dbPassword : process.env.DB_PASSWORD || '12345'
};

module.exports = config;