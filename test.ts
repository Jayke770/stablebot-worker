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
    const data = await web3Handler.waitForTx({ chainId: "ton", txHash: "fc5281a8ef81fe13c0e38d16e7fc3a016ae7f5895fb220de6289765775320f01" })
    console.dir(data)
})()
// import { taskQueue } from './src/lib/worker.config'
// import { bridge } from './src/models/collections'
// import dbConnect from './src/models/dbConnect'
// import { ITasks } from './src/types'
// // const h = await taskQueue.add(ITasks.balance, { userId: 1391502332 })
// // console.log(h)
// await taskQueue.add(ITasks.bridge, {bridgeId: "bridge-xYbofoh1YzfTMGm"})
