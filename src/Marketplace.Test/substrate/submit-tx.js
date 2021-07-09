const SUCCESS = 'SUCCESS';
const FAIL = 'FAIL';
const NOT_READY = 'NOT_READY';

function getTransactionStatus(events, status) {
  if (status.isReady) {
    return NOT_READY;
  }
  if (status.isBroadcast) {
    return NOT_READY;
  }
  if (status.isInBlock || status.isFinalized) {
    if (events.filter(e => e.event.data.method === 'ExtrinsicFailed').length > 0) {
      return FAIL;
    }
    if (events.filter(e => e.event.data.method === 'ExtrinsicSuccess').length > 0) {
      return SUCCESS;
    }
  }

  return FAIL;
}

function submitTx(sender, transaction) {
  return new Promise(async (resolve, reject) => {
    try {
      await transaction.signAndSend(sender, ({ events = [], status }) => {
        const transactionStatus = getTransactionStatus(events, status);

        if (transactionStatus === SUCCESS) {
          resolve(events);
        } else if (transactionStatus === FAIL) {
          console.log(`Something went wrong with transaction. Status: ${status}`);
          reject(events);
        }
      });
    } catch (e) {
      console.log('Error: ', e);
      reject(e);
    }
  });
}

module.exports = submitTx;