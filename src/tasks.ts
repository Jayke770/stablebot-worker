import { Job } from "bullmq";
import { userHandler } from "./services/user";
import dayjs from 'dayjs'
import { userData, userToken, bridge } from "./models/collections";
import { utils } from "./lib/utils";
import { evmHandler } from "./lib/evm";
import * as lodash from 'lodash'
import { tronHandler } from "./lib/tron";
import { dexHandler } from "./lib/dex";
import { bot } from "./lib/bot";
import type { InlineKeyboardButton } from "grammy/types";
import { InlineKeyboard } from "grammy";
import { tonHandler } from "./lib/ton";
import { bridgeHandler } from "./services/bridge";
import { web3Handler } from "./lib/web3";
import { NOTIFICATIONS, SUCCESS_EFFECT_IDS } from "./lib/config";
import { taskQueue } from "./lib/worker.config";
import { ITasks } from "./types";
class Tasks {
    async updateBalance(job: Job) {
        try {
            const jobData: { userId: number } = job.data
            const user = await userHandler.getUser(jobData.userId)
            if (!user) return
            const elapse = dayjs().diff(user?.updatedAt, "seconds")
            if (elapse < 1) return
            userToken.find({ userId: { $eq: jobData.userId } })
                .cursor()
                .eachAsync(async function (token) {
                    if (utils.isEVM(token.chainId)) {
                        evmHandler.setChain(token.chainId)
                        const wallet = lodash.find(user?.wallets, function (e) { return e.type === "evm" })
                        if (wallet) {
                            const [tokenData, tokenInfo] = await Promise.all([
                                evmHandler.getTokenBalance(wallet.address as `0x${string}`, token.toJSON()),
                                dexHandler.getTokenInfo(token.chainId, token.address)
                            ])
                            token.balance = tokenData.balance
                            token.usdValue = utils.unitToUsd(tokenData.balance, parseFloat(tokenInfo.priceUSD || "0"))
                        }
                    }
                    if (utils.isTRON(token.chainId)) {
                        tronHandler.setChain(token.chainId)
                        const wallet = lodash.find(user?.wallets, function (e) { return e.type === "tron" })
                        if (wallet) {
                            const [tokenData, tokenInfo] = await Promise.all([
                                tronHandler.getTokenBalance(wallet.address, token.toJSON()),
                                dexHandler.getTokenInfo(token.chainId, token.address)
                            ])
                            token.balance = tokenData.balance
                            token.usdValue = utils.unitToUsd(tokenData.balance, parseFloat(tokenInfo.priceUSD || "0"))
                        }
                    }
                    if (utils.isTON(token.chainId)) {
                        tonHandler.setChain(token.chainId)
                        const wallet = lodash.find(user?.wallets, function (e) { return e.type === "ton" })
                        if (wallet) {
                            const [tokenData, tokenInfo] = await Promise.all([
                                tonHandler.getTokenBalance(wallet.address, token.toJSON()),
                                dexHandler.getTokenInfo(token.chainId, token.address)
                            ])
                            token.balance = tokenData.balance
                            token.usdValue = utils.unitToUsd(tokenData.balance, parseFloat(tokenInfo.priceUSD || "0"))
                        }
                    }
                    await token.save()
                })
            await userHandler.updateUser({ userId: { $eq: jobData.userId } }, { updatedAt: Date.now() })
        } catch (e) {
            return
        }
    }
    bot = {
        async sendMessage(job: Job) {
            try {
                const params: { chatId: number, message: string, threadId: number, buttons: InlineKeyboardButton[][] } = job.data
                await bot.api.sendMessage(params.chatId, params.message, {
                    message_thread_id: params.threadId,
                    reply_markup: new InlineKeyboard(params.buttons),
                    link_preview_options: {
                        is_disabled: true
                    }
                })
            } catch (e) {
                console.error(e)
            }
        }
    }
    async scanFailedBridge() {
        try {
            bridge.find({ status: { $eq: "pending" } }).cursor().eachAsync(async function (bridge) {
                const jobData = await taskQueue.getJob(bridge.bridgeId)
                if (!jobData) await taskQueue.add(ITasks.bridge, { bridgeId: bridge.bridgeId }, { jobId: bridge.bridgeId })
            })
        } catch (e) {
            console.error(e)
        }
    }
    async bridge(job: Job) {
        try {
            const startTime = Date.now()
            const jobData: { bridgeId: string } = job.data
            const bridgeData = await bridgeHandler.getBridgeData(jobData.bridgeId)
            if (!bridgeData) {
                console.info(`Bridge not found ${jobData.bridgeId}`)
                return
            }
            if (bridgeData?.status !== "pending") {
                console.info(`Bridge is already completd ${jobData.bridgeId}`)
                return
            }
            await bot.api.editMessageText(bridgeData.userId, bridgeData.messageId, `${bridgeData.messageData}\n✅${parseInt(`${utils.parseSeconds(startTime) + bridgeData.srcSeconds}`)}s ${utils.format.italic("Processing.")}`)
            const srcChainData = utils.getChain(bridgeData.srcChainId)
            const destChainData = utils.getChain(bridgeData.destChainId)
            if (!srcChainData || !destChainData) {
                console.info(`Bridge ${jobData.bridgeId} chain invalid`)
                return
            }
            //get user 
            const [userData, bridgeWallet, srcNativeTokenInfo, destNativeTokenInfo] = await Promise.all([
                userHandler.getUser(bridgeData.userId),
                bridgeHandler.getWallet(bridgeData.srcChainId),
                dexHandler.getTokenInfo(bridgeData.srcToken.chainId, srcChainData?.nativeTokenAddress || srcChainData?.chainId),
                dexHandler.getTokenInfo(bridgeData.destToken.chainId, destChainData?.nativeTokenAddress || destChainData?.chainId)
            ])
            if (!userData) {
                console.info(`Bridge ${jobData.bridgeId} user not found`)
                return
            }
            if (userData.userId !== bridgeData.userId) {
                console.info(`Bridge ${jobData.bridgeId} invalid user`)
                return
            }
            if (!srcNativeTokenInfo?.status || !destNativeTokenInfo?.status) {
                console.info(`Bridge ${jobData.bridgeId} chain native token not found`)
                return
            }
            if (!bridgeWallet) {
                console.info(`Bridge wallet invalid ${jobData.bridgeId}`)
                return
            }
            await bot.api.editMessageText(bridgeData.userId, bridgeData.messageId, `${bridgeData.messageData}\n✅${parseInt(`${utils.parseSeconds(startTime) + bridgeData.srcSeconds}`)}s ${utils.format.italic("Processing..")}`)
            //get deposit tx 
            const txReceipt = await web3Handler.waitForTx({ chainId: bridgeData.srcChainId, txHash: bridgeData.dpTxHash })
            console.log("dp tx receipt", txReceipt)
            if (utils.isTON(bridgeData.srcChainId)) {
                if (bridgeData.senderAddress.toLowerCase().trim() !== txReceipt.fromAddress.toLowerCase().trim()) {
                    console.info(`Invalid Sender ${jobData.bridgeId}`)
                    return
                }
                if (bridgeWallet?.address.toLowerCase().trim() !== txReceipt.toAddress.toLowerCase().trim()) {
                    console.info(`Invalid Sender ${jobData.bridgeId}`)
                    return
                }
                if (bridgeData.srcTokenAmountInUnit < txReceipt.tokenAmountInUnit) {
                    console.info(`Invalid Src Amount${jobData.bridgeId}`)
                    return
                }
            }
            await bot.api.editMessageText(bridgeData.userId, bridgeData.messageId, `${bridgeData.messageData}\n✅${parseInt(`${utils.parseSeconds(startTime) + bridgeData.srcSeconds}`)}s ${utils.format.italic("Sending...")}`)
            //validation pass 
            const transferTx = await web3Handler.transferToken({
                chainId: bridgeData.destChainId, data: {
                    amountInUnit: bridgeData.destTokenAmountInUnit,
                    receiverAddress: bridgeData.receiverAddress as any,
                    token: bridgeData.destToken,
                    userWallet: bridgeWallet
                }
            })
            await bot.api.editMessageText(bridgeData.userId, bridgeData.messageId, `${bridgeData.messageData}\n✅${parseInt(`${utils.parseSeconds(startTime) + bridgeData.srcSeconds}`)}s ${utils.format.italic("Sending.")}`)
            if (!transferTx.status) {
                await job.retry()
                return
            }
            const wadtxReceipt = await web3Handler.waitForTx({ chainId: bridgeData.destChainId, txHash: transferTx.txHash })
            if (!wadtxReceipt?.status) {
                await job.retry()
                return
            }
            await bot.api.editMessageText(bridgeData.userId, bridgeData.messageId, `${bridgeData.messageData}\n✅${parseInt(`${utils.parseSeconds(startTime) + bridgeData.srcSeconds}`)}s ${utils.format.italic("Sending...")}`)
            const seconds = parseInt(`${utils.parseSeconds(startTime) + bridgeData.srcSeconds}`)
            const srcFeeAmountInUsd = utils.unitToUsd(bridgeData.srcFeeAmountInUnit, Number(srcNativeTokenInfo.priceUSD))
            const srcTxLink = utils.txLink(srcChainData.chainId, bridgeData.dpTxHash)
            const destTxLink = utils.txLink(destChainData.chainId, wadtxReceipt.txHash)
            const destFeeAmountInUnit = wadtxReceipt.fee || 0
            const destFeeAmountInUsd = utils.unitToUsd(destFeeAmountInUnit, Number(destNativeTokenInfo.priceUSD))
            const totalFeeInUsd = utils.formatNumber(srcFeeAmountInUsd + destFeeAmountInUsd, true)
            const srcFeeMessage = utils.format.link(srcTxLink, `${srcChainData.emoji} $${utils.formatNumber(srcFeeAmountInUsd, true)}`)
            const destFeeMessage = utils.format.link(destTxLink, `${destChainData.emoji} $${utils.formatNumber(destFeeAmountInUsd, true)}`)
            const feeMessage = `\n✅${seconds}s ⛽️ $${totalFeeInUsd} ${srcFeeMessage} ${destFeeMessage}`
            const messageData = `${bridgeData.messageData}${feeMessage}`
            const chat = await bot.api.sendMessage(bridgeData.userId, messageData, {
                link_preview_options: { is_disabled: true },
                message_effect_id: SUCCESS_EFFECT_IDS[lodash.random(0, SUCCESS_EFFECT_IDS.length - 1, false)]
            })
            //update bridge data 
            await bridgeHandler.updateBridge({ bridgeId: { $eq: jobData.bridgeId } }, {
                $set: {
                    wdTxHash: wadtxReceipt.txHash,
                    destSeconds: seconds,
                    status: "completed",
                    destFeeAmountInUnit: destFeeAmountInUnit,
                    messageId: chat.message_id,
                    messageData: messageData
                }
            })
            await bridgeHandler.updateBridgeConfig({ $inc: { totalBridgeTx: 1 } })
            //delete old message 
            await bot.api.deleteMessage(bridgeData.userId, bridgeData.messageId)
            //send notification 
            for (const gc of NOTIFICATIONS.bridge) {
                await bot.api.sendMessage(gc.gcId, messageData, {
                    link_preview_options: { is_disabled: true },
                    message_thread_id: gc.threadId
                })
            }
            return
        } catch (e) {
            console.log(e)
        }
    }
}
export const tasksHandler = new Tasks()