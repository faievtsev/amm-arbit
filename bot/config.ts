import { BigNumber, BigNumberish, utils } from 'ethers';

interface Config {
  contractAddr: string;
  logLevel: string;
  minimumProfit: number;
  gasPrice: BigNumber;
  gasLimit: BigNumberish;
  bscScanUrl: string;
  ethScanUrl: string;
  concurrency: number;
}

const contractAddr = '0xcD2D9c70F7c9FC46435f1cbb7d2B04F814d8E156'; // flash bot contract address
const gasPrice = utils.parseUnits('5', 'gwei');
const gasLimit = 500000;

const bscScanApiKey = 'CUR1A1E5G8D575SI6D4SS4RST613YFKSQ6'; // bscscan API key
const bscScanUrl = `https://api.bscscan.com/api?module=stats&action=bnbprice&apikey=${bscScanApiKey}`;

const ethScanApiKey = 'F7Q7FPSGFUN6HYDU8Z3HIJH5D9YQXQYD5S';
const ethScanUrl = `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${ethScanApiKey}`;

const config: Config = {
  contractAddr: contractAddr,
  logLevel: 'info',
  concurrency: 50,
  minimumProfit: 0, // in USD
  gasPrice: gasPrice,
  gasLimit: gasLimit,
  bscScanUrl: bscScanUrl,
  ethScanUrl: ethScanUrl
};

export default config;
