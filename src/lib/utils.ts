import type { InlineKeyboard } from "grammy";
import type { InlineKeyboardButton, WebAppInfo } from "grammy/types";
import { generateMnemonic, english } from "viem/accounts";
import { DEFAULT_CHAINS, DEFAULT_TOKENS } from "./config";
import * as lodash from 'lodash'
import * as viemUtils from 'viem/utils'
import { TronWeb } from 'tronweb'
import { customAlphabet } from 'nanoid'
import Ton from '@ton/ton'
import type { IUserToken } from "../types";
export class Utils {
    mnemonic = () => generateMnemonic(english)
    generateId = (size: number = 15) => customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", size)()
    format = {
        code: (value: string | number) => `<code>${value}</code>`,
        link: (link: string, value: string | number) => `<a href='${link}'>${value}</a>`,
        italic: (value: string | number) => `<i>${value}</i>`,
        bold: (value: string | number) => `<b>${value}</b>`,
    }
    isEVM = (chainId: string) => lodash.includes(["1", "84532"], chainId)
    isTRON = (chainId: string) => lodash.includes(["tron", "shasta"], chainId)
    isTON = (chainId: string) => lodash.includes(["ton", "ton-testnet"], chainId)
    getWalletType = (chainId: string): "ton" | "evm" | "tron" => {
        let walletType: "ton" | "evm" | "tron" = "evm"
        if (this.isTRON(chainId)) walletType = "tron"
        if (this.isTON(chainId)) walletType = "ton"
        return walletType
    }
    backbutton(params?: { text?: string, callback_data?: string }): InlineKeyboardButton {
        return { text: params?.text || "⬅️ Back", callback_data: params?.callback_data || "menu" }
    }
    inlineButton(params: { text: string, callback_data?: string, url?: string, web_app?: WebAppInfo }): InlineKeyboardButton {
        return { text: params.text, callback_data: params?.callback_data, url: params?.url, web_app: params?.web_app ?? { url: "" } }
    }
    getChain(chainId: string) {
        return DEFAULT_CHAINS.find(e => chainId.toLowerCase().trim() === e.chainId.toLowerCase().trim())
    }
    unitToUsd = (unitAmount: number, unitPrice: number) => unitAmount * unitPrice
    usdToUnit = (usdAmount: number, unitPrice: number) => usdAmount / unitPrice
    formatNumber(num: string | number, isDollar: boolean = false): number {
        const numValue = parseFloat(num?.toString());
        if (isDollar) return parseFloat(numValue.toFixed(2));
        const [integerPart, decimalPart = ""] = numValue.toFixed(18).split(".");
        let significantDecimals = "";
        let significantCount = 0;
        for (const char of decimalPart) {
            significantDecimals += char;
            if (char !== "0") {
                significantCount++;
            } else if (significantCount === 1) {
                significantCount++;
            }
            if (significantCount === 2) {
                break;
            }
        }
        return significantCount === 2
            ? parseFloat(`${integerPart}.${significantDecimals}`)
            : parseFloat(numValue.toFixed(2));
    }
    isValidAddress = (address?: string): boolean => {
        try {
            const isValid = viemUtils.isAddress(address || "") || TronWeb.isAddress(address) || Ton.Address.isAddress(Ton.address(address || ""))
            return isValid
        } catch (e) {
            console.log(e)
            return false
        }
    }

    txLink = (chainId: string, txHash: string) => {
        const chainData = this.getChain(chainId)
        const txLink = `${chainData?.explorer.url}${chainData?.explorer.txPath}${txHash}`
        return txLink
    }

    getChainTokens = (chainId: string, userId: number) => {
        return DEFAULT_TOKENS.filter(e => e.chainId === chainId).map(e => ({
            ...e,
            userId,
            queryAddress: e.address.toLowerCase().trim(),
            tokenId: (`${userId}-${e.chainId}-${e.address}`).toLowerCase()
        })) as IUserToken[]
    }

    parseSeconds = (startTime: number) => parseInt(`${(Date.now() - startTime) / 1000}`)

}
export const utils = new Utils()