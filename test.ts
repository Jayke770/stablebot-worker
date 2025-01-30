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
    const balance = await tronHandler.tronweb.trx.getBalance("TVGLZ3fqj8q8cZtrJ2SmM8xLPbL3aLgZNq")
    console.log(balance)
    // const jettonTx = "fc5281a8ef81fe13c0e38d16e7fc3a016ae7f5895fb220de6289765775320f01", nativetx = "7b9c7f8d495c187190f5a08131a1933d2309cf2722bae2ab04374a58246157f7"
    // const cl = new TonApiClient();
    // const d = await cl.traces.getTrace(nativetx)
    // console.log({
    //     fromAddress: d.children?.[0].transaction.inMsg?.source?.address.toString({ urlSafe: true, bounceable: false }),
    //     toAddress: d.children?.[0].transaction.inMsg?.destination?.address.toString({ urlSafe: true, bounceable: false })
    // })
    // // const data = await tonHandler.waitForTx("UQCUHFgOhnGl8FRjcnOap-v7smQ0Ti6EdUixJHqLyd0Uct7G", jettonTx)
    // // console.log(data)
})()