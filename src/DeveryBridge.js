const crossFetch = require('cross-fetch')
const { DeveryRegistry, DeveryERC721, EveToken, Utils } = require('@devery/devery')
var Tx = require('ethereumjs-tx').Transaction
const ethers = require('ethers')

global.fetch = crossFetch // just don't as me why is that
global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;


const networkId =  parseInt( process.env.NETWORK_ID ) ; // use 1 for mainnnet, 3 for ropsten 

const appAddress = "YOUR_APP_ADDRESS";
const appPrivKey = "YOUR_APP_PRIVKEY";
const erc721ContractAddress = '0x032EF0359EB068d3DddD6E91021c02F397AfcE5a'
const registryContractAddress = '0x0364a98148b7031451e79b93449b20090d79702a'


/* creates brand in network.
 returns structure:
 wallet: brand wallet
 transaction: transaction for wallet createion

*/
const addBrand = async (brandName) =>{

    // here you will have the code which registers brand 


    return { wallet: brandWallet, transaction: transaction }

}

/* creates and claims product in network
   return nothing
   Params are self-descriptive 

*/
const addAndClaimProduct = async (productAddr, walletPrivKey, brandAddress, userAccountAddress, productName, productDetails, productYear, productOrigin) => {

 // here you will have the code which creates product in Devery.


}
/* Returns networkID

*/
function getNetworkId(){
    return networkId;
}

/* Generates new address for the product
  returns product address
*/
const safeGenerateProductAddress = async () => {
  // here you will generate the new product address
 
  return prodWalletAddress;
}

module.exports = { addBrand, addAndClaimProduct, getNetworkId, safeGenerateProductAddress }