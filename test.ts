import { ERC20_ABI } from "./src/lib/abi";
import { tonHandler } from "./src/lib/ton";
import { tronHandler } from "./src/lib/tron";
import { AbiCoder as abicod } from 'ethers'
import { web3Handler } from "./src/lib/web3";
import { evmHandler } from "./src/lib/evm";
tonHandler.setChain("ton");
tronHandler.setChain("shasta");
(async () => {
    const data = await web3Handler.waitForTx({ chainId: "shasta", txHash: "ca3f872533b53174c12dea270a67ebefde7251eb7d33f1e443938500dc1100d3" })
    console.dir(data, { depth: 10 })
})()