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
    async waitForTx(params: { chainId: string, txHash: string }): Promise<IValidateBridgeTx> {
        try {
            const chainData = this.getChain(params.chainId)
            if (this.isEVM(params.chainId)) {
                evmHandler.setChain(params.chainId)
                const txData = await evmHandler.waitForTx(params.txHash)
                //@ts-ignore
                if (!txData || !txData?.tx || !txData?.tx) return { status: false, message: "❌ Tx Failed" }
                //@ts-ignore
                if (txData?.txReceipt?.status === "reverted") return { status: false, message: "❌ Tx Failed" }
                let txFee = (txData?.txReceipt?.effectiveGasPrice * txData?.txReceipt?.gasUsed),
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
                    const decimals = 6
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
                const txData = await tonHandler.waitForTx(params.txHash)
                //@ts-ignore
                if (txData?.txInfo?.aborted || txData?.txInfo?.destroyed || !txData?.txInfo?.actionPhase?.success) return { status: false, message: "❌ Tx Failed" }
                const transferEvent = txData?.txEvent.actions.find(e => e.type === "TonTransfer" || e.type === "JettonTransfer")
                let txFee = Number(formatUnits(BigInt(txData?.txInfo.actionPhase.totalFees), chainData?.nativeTokenDecimal || 6)),
                    fromAddress = "",
                    toAddress = "",
                    tokenAmountInUnit = 0
                if (transferEvent?.type === "JettonTransfer") {
                    fromAddress = transferEvent?.JettonTransfer?.sender?.address?.toString({ bounceable: false, urlSafe: true })!
                    toAddress = transferEvent?.JettonTransfer?.recipient?.address?.toString({ bounceable: false, urlSafe: true })!
                    tokenAmountInUnit = Number(formatUnits(transferEvent.JettonTransfer?.amount!, transferEvent.JettonTransfer?.jetton.decimals!))
                } else {
                    fromAddress = transferEvent?.TonTransfer?.sender.address?.toString({ urlSafe: true, bounceable: false })!
                    toAddress = transferEvent?.TonTransfer?.recipient.address?.toString({ urlSafe: true, bounceable: false })!
                    tokenAmountInUnit = Number(formatUnits(transferEvent?.TonTransfer?.amount!, chainData?.nativeTokenDecimal!))
                }
                //@ts-ignore
                if (!txData) return { status: false, message: "❌ Tx Failed" }
                return {
                    status: true,
                    fromAddress,
                    toAddress,
                    txHash: params.txHash,
                    fee: txFee,
                    tokenAmountInUnit
                }
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