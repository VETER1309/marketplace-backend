
//const BridgeGate = artifacts.require('BridgeGate.sol');
const MarketPlaceKSM = artifacts.require('MarketPlaceKSM.sol');


//const ERC721example = artifacts.require('ERC721example.sol');


module.exports = async function(deployer,_network, addresses) {
   

      await deployer.deploy(MarketPlaceKSM, addresses[0]);
      const mpKSM = await MarketPlaceKSM.deployed();
      console.log ("MarketPlaceKSM:",  mpKSM.address)

  
};
