import { ERC20_ABI } from "./src/lib/abi";
import { tonHandler } from "./src/lib/ton";
import { tronHandler } from "./src/lib/tron";
import { AbiCoder as abicod } from 'ethers'
import { web3Handler } from "./src/lib/web3";
import { evmHandler } from "./src/lib/evm";
import { TonApiClient } from '@ton-api/client';
tonHandler.setChain("ton");
tronHandler.setChain("tron");
(async () => {
    const data = await web3Handler.waitForTx({ chainId: "tron", txHash: "acba9e0f73a1a9c050e9e88c407e80e9a6dca73e916f6073f4b27539c869fe8e" })
    console.dir(data)
})()
// import { taskQueue } from './src/lib/worker.config'
// import { bridge } from './src/models/collections'
// import dbConnect from './src/models/dbConnect'
// import { ITasks } from './src/types'
// // const h = await taskQueue.add(ITasks.balance, { userId: 1391502332 })
// // console.log(h)
// await taskQueue.add(ITasks.bridge, {bridgeId: "bridge-xYbofoh1YzfTMGm"})