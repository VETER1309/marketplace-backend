async function getKsmBalance(api, account) {
  const accountInfo = await api.query.system.account(account.address.toString());
  return accountInfo.data.free.toString();
}

module.exports = getKsmBalance;