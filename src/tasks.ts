import { Job } from "bullmq";
import { userHandler } from "./services/user";
import dayjs from 'dayjs'
import { userData, userToken } from "./models/collections";
import { utils } from "./lib/utils";
import { evmHandler } from "./lib/evm";
import * as lodash from 'lodash'
import { tronHandler } from "./lib/tron";
import { dexHandler } from "./lib/dex";
import { bot } from "./lib/bot";
import type { InlineKeyboardButton } from "grammy/types";
import { InlineKeyboard } from "grammy";
import { tonHandler } from "./lib/ton";
import { NEW_TOKENS } from "./lib/config";
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
                        evmHandler.setNetwork(token.chainId)
                        const wallet = lodash.find(user?.wallets, function (e) { return e.type === "evm" })
                        if (wallet) {
                            const [tokenData, tokenInfo] = await Promise.all([
                                evmHandler.getTokenBalance(wallet.address, token),
                                dexHandler.getTokenInfo(token.chainId, token.address)
                            ])
                            token.balance = tokenData.balance
                            token.usdValue = utils.unitToUsd(tokenData.balance, parseFloat(tokenInfo.priceUSD || "0"))
                        }
                    }
                    if (utils.isTRON(token.chainId)) {
                        tronHandler.setNetwork(token.chainId)
                        const wallet = lodash.find(user?.wallets, function (e) { return e.type === "tron" })
                        if (wallet) {
                            const [tokenData, tokenInfo] = await Promise.all([
                                tronHandler.getTokenBalance(wallet.address, token),
                                token?.symbol.toLowerCase().includes("usdt") ? { priceUSD: "1" } : dexHandler.getTokenInfo(token.chainId, token.address)
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
                                tonHandler.getTokenBalance(wallet.address, token),
                                dexHandler.getTokenInfo(token.chainId, token.address)
                            ])
                            token.balance = tokenData.balance
                            token.usdValue = utils.unitToUsd(tokenData.balance, parseFloat(tokenInfo.priceUSD || "0"))
                        }
                    }
                    await token.save()
                })
            await userHandler.updateUser({ userId: { $eq: jobData.userId } }, { updatedAt: Date.now() })
            //insert new tokens
            for (const token of NEW_TOKENS) {
                try {
                    const newToken = await new userToken({
                        ...token,
                        userId: user.userId,
                        queryAddress: token.address,
                        tokenId: (`${user.userId}-${token.chainId}-${token.address}`).toLowerCase()
                    }).save()
                    await userHandler.updateUser({ userId: { $eq: jobData.userId } }, { $push: { tokens: newToken._id } })
                } catch (e) {

                }
            }
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
}
export const tasksHandler = new Tasks()