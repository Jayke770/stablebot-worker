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
    const data = await web3Handler.waitForTx({
        chainId: "ton", txHash: "f8f95d093c86ebd565ccd3cfb203a3890adaf05948bffd17a28af1bdb25e7d8c"
    })
    console.dir(data)
})()
// import { taskQueue } from './src/lib/worker.config'
// import { bridge } from './src/models/collections'
// import dbConnect from './src/models/dbConnect'
// import { ITasks } from './src/types'
// // const h = await taskQueue.add(ITasks.balance, { userId: 1391502332 })
// // console.log(h)
// await taskQueue.add(ITasks.bridge, {bridgeId: "bridge-xYbofoh1YzfTMGm"})
