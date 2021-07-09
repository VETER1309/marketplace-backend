const { Abi, ContractPromise } = require("@polkadot/api-contract");
const contractAbi = require("./market_metadata.json");
const submitTx = require('../substrate/submit-tx');

class Matcher {
  value = 0;
  maxgas = '1000000000000';

  constructor(api, contractAddress, contractAdmin) {
    const abi = new Abi(contractAbi);
    this.contract = new ContractPromise(api, abi, contractAddress);
    this.admin = contractAdmin;
  }

  async getNftDeposit(collectionId, tokenId) {
    const result = await this.contract.query.getNftDeposit(this.admin.address, {}, collectionId, tokenId);
    if(result.result.isErr) {
      throw result.result;
    }

    return result.output.toString();
  }

  async ask(owner, collectionId, tokenId, price) {
    const tx = this.contract.tx.ask(this.value, this.maxgas, collectionId, tokenId, 2, price);
    const response = await submitTx(owner, tx);
  }

  async cancel(owner, collectionId, tokenId) {
    const tx = this.contract.tx.cancel(this.value, this.maxgas, collectionId, tokenId);
    await submitTx(owner, tx);
  }

  async getBalance(owner) {
    const result = await this.contract.query.getBalance(owner.address, {}, 2);
    if(result.result.isErr) {
      throw result.result;
    }

    return result.output.toString();
  }

  async buy(buyer, collectionId, tokenId) {
    const tx = this.contract.tx.buy(this.value, this.maxgas, collectionId, tokenId);
    await submitTx(buyer, tx);
  }

  async withdraw(account, balance) {
    const tx = this.contract.tx.withdraw(this.value, this.maxgas, 2, balance);
    await submitTx(account, tx);
  }
}

module.exports = Matcher;
