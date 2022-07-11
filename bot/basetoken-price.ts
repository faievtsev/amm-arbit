import axios from 'axios';
import AsyncLock from 'async-lock';

import config from './config';
import log from './log';

const lock = new AsyncLock();

let bnbPrice = 0;
let ethPrice = 0;

// clear bnb price every hour
setInterval(() => {
  lock
    .acquire('bnb-price', () => {
      bnbPrice = 0;
      return;
    })
    .then(() => {});
}, 3600000);

// clear eth price every hour
setInterval(() => {
  lock
    .acquire('eth-price', () => {
      ethPrice = 0;
      return;
    })
    .then(() => {});
}, 3600000);

export async function getBnbPrice(): Promise<number> {
  return await lock.acquire('bnb-price', async () => {
    if (bnbPrice !== 0) {
      return bnbPrice;
    }
    const res = await axios.get(config.bscScanUrl);
    bnbPrice = parseFloat(res.data.result.ethusd);
    log.info(`BNB price: $${bnbPrice}`);
    return bnbPrice;
  });
}

export async function getEthPrice(): Promise<number> {
  return await lock.acquire('eth-price', async () => {
    if (ethPrice !== 0) {
      return ethPrice;
    }
    const res = await axios.get(config.ethScanUrl);
    ethPrice = parseFloat(res.data.result.ethusd);
    log.info(`eth price: $${ethPrice}`);
    return ethPrice;
  });
}
