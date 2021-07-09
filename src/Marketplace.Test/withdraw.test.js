const getApi = require('./substrate/get-api');
const config = require('./config');
const keys = require('./keys');
const Matcher = require('./matcher-contract');
const getKsmBalance = require('./substrate/get-ksm-balance');
const {logLabelAndValues} = require('./lib/log');
const transferKsmToBuy = require('./substrate/transfer-ksm-to-buy');
const delay = require('./lib/delay');
const blockProductionRate = require('./substrate/block-production-rate');

const amountToTransfer = '110000000000000000';
const amountToWithdraw = '100000000000000000';

async function waitForDepositToRegister(matcher, buyer, initialDeposit) {
  let waitsCount = 10;
  initialDeposit = BigInt(initialDeposit);
  while(waitsCount > 0) {
    await delay(blockProductionRate);

    const currentBalance = await matcher.getBalance(buyer);
    if(BigInt(currentBalance) > initialDeposit) {
      return currentBalance;
    }

    waitsCount--;
  }

  throw 'Timeout on waiting for ksm deposit to register';
}

async function waitForWithdraw(api, buyer, balanceBefore) {
  let waitsCount = 10;
  balanceBefore = BigInt(balanceBefore);
  while(waitsCount > 0) {
    await delay(blockProductionRate);

    const currentBalance = await  await getKsmBalance(api, buyer);
    if(BigInt(currentBalance) > balanceBefore) {
      return currentBalance;
    }

    waitsCount--;
  }

  throw 'Timeout on waiting for ksm deposit to register';
}

describe('Withdraw', function() {
  it('Withdrawing returns money.', async function() {
    this.timeout(100000000);
    const api = await getApi(config.wsEndpoint);
    const ksmAdmin = await keys.ksmAdmin();
    const buyer = await keys.buyer();
    const admin = await keys.admin();
    const matcher = new Matcher(api, config.marketContractAddress, admin);

    const balanceBefore = await getKsmBalance(api, buyer);
    const ksmAdminBalanceBefore = await getKsmBalance(api, ksmAdmin);
    const depositBefore = await matcher.getBalance(buyer);
    console.info('');
    console.info('Balances before');
    logLabelAndValues([
      ['Balance:', balanceBefore],
      ['Admin Balance:', ksmAdminBalanceBefore],
      ['Deposit:', depositBefore],
    ]);

    await transferKsmToBuy(api, buyer, ksmAdmin, amountToTransfer);
    await waitForDepositToRegister(matcher, buyer, depositBefore);
    const balanceAfterTransfer = await getKsmBalance(api, buyer);
    await matcher.withdraw(buyer, amountToWithdraw);
    await waitForWithdraw(api, buyer, balanceAfterTransfer);

    const balanceAfter = await getKsmBalance(api, buyer);
    const ksmAdminBalanceAfter = await getKsmBalance(api, ksmAdmin);
    const depositAfter = await matcher.getBalance(buyer);

    console.info('');
    console.info('Balances after');
    logLabelAndValues([
      ['Balance:', balanceAfter],
      ['Admin Balance:', ksmAdminBalanceAfter],
      ['Deposit:', depositAfter],
    ]);

    console.info('');
    console.info('Diff');
    logLabelAndValues([
      ['Withdraw amount:', amountToWithdraw],
      ['Balance:', BigInt(balanceAfter) - BigInt(balanceBefore)],
      ['Admin Balance:', BigInt(ksmAdminBalanceAfter) - BigInt(ksmAdminBalanceBefore)],
      ['Deposit:', BigInt(depositAfter) - BigInt(depositBefore)],
    ]);
  });
});