import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import pool from '@ricokahler/pool';
import AsyncLock from 'async-lock';

import { FlashBot } from '../typechain/FlashBot';
import { Network, tryLoadPairs, getTokens } from './tokens';
import { getBnbPrice, getEthPrice } from './basetoken-price';
import log from './log';
import config from './config';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function calcNetProfit(profitWei: BigNumber, address: string, baseTokens: Tokens): Promise<number> {
  let price = 1;
  let bnb_price = 1;
  bnb_price = await getBnbPrice();
  if (baseTokens.wbnb.address == address) {
    price = bnb_price;
  }else if (baseTokens.weth.address == address){
    price = await getEthPrice();
  }

  let profit = parseFloat(ethers.utils.formatEther(profitWei));
  profit = profit * price;

  const gasCost = bnb_price * parseFloat(ethers.utils.formatEther(config.gasPrice)) * (config.gasLimit as number);
  return profit - gasCost;
}

function arbitrageFunc(flashBot: FlashBot, baseTokens: Tokens, invalidTokens: any) {
  const lock = new AsyncLock({ timeout: 500000, maxPending: 200 });
  return async function arbitrage(pair: ArbitragePair) {
    const [pair0, pair1] = pair.pairs;
    if (invalidTokens.includes(pair.symbols)){
      return;
    }
    let res: [BigNumber, string] & {
      profit: BigNumber;
      baseToken: string;
    };
    try {
      res = await flashBot.getProfit(pair0, pair1);
      log.debug(`Profit on ${pair.symbols}: ${ethers.utils.formatEther(res.profit)}`);
    } catch (err) {
      log.debug(err);
      return;
    }

    if (res.profit.gt(BigNumber.from('0'))) {
      const netProfit = await calcNetProfit(res.profit, res.baseToken, baseTokens);
      if (netProfit < config.minimumProfit) {
        log.debug(`${pair.symbols} profit is not enough ${netProfit}`)
        return;
      }

      log.info(`Calling flash arbitrage, ${pair.symbols} net profit: ${netProfit}`);
      try {
        // lock to prevent tx nonce overlap
        await lock.acquire('flash-bot', async () => {
          const response = await flashBot.flashArbitrage(pair0, pair1, {
            gasPrice: config.gasPrice,
            gasLimit: config.gasLimit,
          });
          const receipt = await response.wait(1);
          log.info(`Tx: ${receipt.transactionHash}`);
        });
      } catch (err: any) {
        if (err.message === 'Too much pending tasks' || err.message === 'async-lock timed out') {
          return;
        }
        log.error(`${pair.symbols} ${err}`);
        invalidTokens.push(pair.symbols);
      }
    }
  };
}

function get_pending_arb(contract_address: string) {
  let provider = new ethers.providers.WebSocketProvider("ws://127.0.0.1:8548")
  provider.on("pending", (tx) => {
    console.log(tx);
  })
}

async function main() {
  get_pending_arb("");
  /*
  const flashBot = (await ethers.getContractAt('FlashBot', config.contractAddr)) as FlashBot;
  const pairs = await tryLoadPairs(Network.BSC);
  const [baseTokens] = getTokens(Network.BSC);
  let invalidTokens: any = []
  let new_pairs: any = [];
  let new_pair: any = [];
  let pair_count: number = 0;
  for(let pair of pairs){
    new_pair.push(pair)
    pair_count ++;
    if(pair_count >= 100){
      new_pairs.push(new_pair);
      pair_count = 0;
      new_pair = []
    }
  }
  new_pairs.push(new_pair);
  log.info('Start arbitraging');
  while (true) {
    console.log(invalidTokens);
    for(let sep_pairs of new_pairs){
      await pool({
        collection: sep_pairs,
        task: arbitrageFunc(flashBot, baseTokens, invalidTokens),
        // maxConcurrency: config.concurrency,
      });
    }
    await sleep(1000);
  }
  */
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    log.error(err);
    process.exit(1);
  });
