const { ApiPromise, WsProvider } = require('@polkadot/api');
const rtt = require("../runtime_types.json");

module.exports = async function (endpoint) {
  const wsProvider = new WsProvider(endpoint);

  // Create the API and wait until ready
  const api = new ApiPromise({
    provider: wsProvider,
    types: rtt
  });

  api.on('disconnected', async (value) => {
    process.exit();
  });
  api.on('error', async (value) => {
    console.error(`error: ${value.toString()}`);
    process.exit();
  });

  await api.isReady;

  return api;
}