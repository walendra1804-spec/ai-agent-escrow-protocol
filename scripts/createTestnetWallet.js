const { ethers } = require("ethers");

const wallet = ethers.Wallet.createRandom();

console.log("New testnet wallet generated.");
console.log("Use this only for testnet funds.");
console.log("");
console.log("Address:");
console.log(wallet.address);
console.log("");
console.log("Private key:");
console.log(wallet.privateKey);
console.log("");
console.log("Mnemonic:");
console.log(wallet.mnemonic.phrase);
