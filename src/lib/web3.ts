import { Utils } from "./utils";
import type { IWallet, IUserToken, IBroadcastTx, ITokenMetaData, IValidateBridgeTx } from '../types'
import { evmHandler } from "./evm";
import { tronHandler } from "./tron";
import { formatEther, formatUnits, parseEther, parseEventLogs, parseUnits } from "viem";
import { tonHandler } from "./ton";
import { ERC20_ABI } from "./abi";
class Web3Handler extends Utils {
    constructor() {
        super()
    }
    async transferToken(params: {
        chainId: string, data: {
            userWallet: IWallet,
            token: ITokenMetaData,
            receiverAddress: string,
            amountInUnit: number,
            useMax?: boolean
        }
    }): Promise<IBroadcastTx> {
        try {
            if (this.isEVM(params.chainId)) {
                evmHandler.setChain(params.chainId)
                const transferTx = await evmHandler.transferToken(params.data)
                return transferTx
            } else if (this.isTRON(params.chainId)) {
                tronHandler.setChain(params.chainId)
                const transferTx = await tronHandler.transferToken(params.data)
                return transferTx
            } else if (this.isTON(params.chainId)) {
                tonHandler.setChain(params.chainId)
                const transferTx = await tonHandler.transferToken(params.data)
                return transferTx
            } else {
                return {
                    status: false,
                    fee: 0,
                    message: "⚠️ Invalid Chain",
                    txHash: ""
                }
            }
        } catch (e) {
            console.error("transfer", e)
            return {
                status: false,
                fee: 0,
                message: `⚠️ Tx Failed: ${e}`,
                txHash: ""
            }
        }
    }
    async waitForTx(params: { chainId: string, txHash: string, walletAddress?: string }): Promise<IValidateBridgeTx> {
        try {
            const chainData = this.getChain(params.chainId)
            if (this.isEVM(params.chainId)) {
                evmHandler.setChain(params.chainId)
                const txData = await evmHandler.waitForTx(params.txHash)
                //@ts-ignore
                if (!txData || !txData?.tx || !txData?.tx) return { status: false, message: "❌ Tx Failed" }
                //@ts-ignore
                if (txData?.txReceipt?.status === "reverted") return { status: false, message: "❌ Tx Failed" }
                let txFee = (txData?.txReceipt?.effectiveGasPrice || txData?.txReceipt?.cumulativeGasUsed * txData?.txReceipt?.gasUsed),
                    fromAddress = "",
                    toAddress = "",
                    tokenAmountInUnit = 0
                //check sa contract padulong
                if (txData?.txReceipt?.logs?.length > 0) {
                    const transferEvent = parseEventLogs({
                        abi: ERC20_ABI,
                        logs: txData?.txReceipt?.logs
                    }).find(e => e.eventName === "Transfer")
                    //@ts-ignore
                    if (!transferEvent) return { status: false, message: "❌ Tx Failed" }
                    const [decimals] = await evmHandler.client.multicall({
                        contracts: [
                            {
                                abi: ERC20_ABI,
                                address: txData.txReceipt.to!,
                                functionName: "decimals"
                            }
                        ]
                    })
                    fromAddress = transferEvent.args.from
                    toAddress = transferEvent.args.to
                    tokenAmountInUnit = Number(formatUnits(transferEvent.args.value, decimals.result || 18))
                } else {
                    console.log(txData)
                    fromAddress = txData.tx.from
                    toAddress = txData.tx.to || ""
                    tokenAmountInUnit = Number(formatEther(txData.tx.value))
                }
                return {
                    fee: Number(formatEther(txFee)) || 0,
                    status: true,
                    txHash: txData.txReceipt.transactionHash,
                    fromAddress,
                    toAddress,
                    tokenAmountInUnit
                }
            } else if (this.isTRON(params.chainId)) {
                tronHandler.setChain(params.chainId)
                const txData = await tronHandler.waitForTx(params.txHash)
                //@ts-ignore
                if (!txData || !txData?.tx || !txData?.txInfo) return { status: false, message: "❌ Tx Failed" }
                let txFee = Number(formatUnits(Number(txData.txInfo.fee) as any, chainData?.nativeTokenDecimal || 6)),
                    fromAddress = "",
                    toAddress = "",
                    tokenAmountInUnit = 0
                const txType = txData?.tx.raw_data.contract[0].type
                // contract
                if (txType === "TriggerSmartContract") {
                    //@ts-ignore
                    const parameters = txData?.tx.raw_data.contract[0].parameter.value.data as string
                    const arr = parameters.split("");
                    arr[30] = '0';
                    arr[31] = '0';
                    const decodeResult = await tronHandler.decodeParams(['address', 'uint256'], arr.join(''), true);
                    fromAddress = tronHandler.tronweb.utils.address.fromHex(txData?.tx.raw_data.contract[0].parameter.value.owner_address)
                    toAddress = tronHandler.tronweb.utils.address.fromHex(decodeResult[0])
                    tronHandler.tronweb.setAddress(fromAddress)
                    //@ts-ignore
                    const contract = tronHandler.tronweb.contract(ERC20_ABI, txData?.tx.raw_data.contract[0].parameter.value.contract_address);
                    const decimals = await contract.methods.decimals().call()
                    tokenAmountInUnit = Number(formatUnits(Number(decodeResult[1]) as any, Number(decimals)))
                } else {
                    fromAddress = tronHandler.tronweb.utils.address.fromHex(txData?.tx.raw_data.contract[0].parameter.value.owner_address)
                    //@ts-ignore
                    toAddress = tronHandler.tronweb.utils.address.fromHex(txData?.tx.raw_data.contract[0].parameter.value.to_address)
                    //@ts-ignore
                    tokenAmountInUnit = Number(formatUnits(Number(txData?.tx.raw_data.contract[0].parameter.value.amount) as any, chainData?.nativeTokenDecimal || 6))
                }
                return {
                    fee: Number(txFee) || 0,
                    status: true,
                    txHash: params.txHash,
                    fromAddress,
                    toAddress,
                    tokenAmountInUnit
                }
            } else if (this.isTON(params.chainId)) {
                tonHandler.setChain(params.chainId)
                const txData = await tonHandler.waitForTx(params.walletAddress!, params.txHash)
                //@ts-ignore
                if (!txData) return { status: false, message: "❌ Tx Failed" }
                //@ts-ignore
                return { status: true, message: "" }
            } else {
                //@ts-ignore
                return { status: false, message: "❌ Tx Failed" }
            }
        } catch (e) {
            console.log(e)
            //@ts-ignore
            return { status: false, message: `❌ Tx Failed: ${e}` }
        }
    }
}
export const web3Handler = new Web3Handler()