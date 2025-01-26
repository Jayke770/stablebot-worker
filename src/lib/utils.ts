import type { InlineKeyboard } from "grammy";
import type { InlineKeyboardButton, WebAppInfo } from "grammy/types";
import { generateMnemonic, english } from "viem/accounts";
import { DEFAULT_CHAINS } from "./config";
import * as lodash from 'lodash'
export class Utils {
    mnemonic() {
        return generateMnemonic(english)
    }
    format = {
        code: (value: string | number) => `<code>${value}</code>`,
        link: (link: string, value: string | number) => `<a href='${link}'>${value}</a>`,
        italic: (value: string | number) => `<i>${value}</i>`,
        bold: (value: string | number) => `<b>${value}</b>`,
    }
    backbutton(text: string = "⬅️ Back",): InlineKeyboardButton {
        return { text, callback_data: "menu" }
    }
    inlineButton(params: { text: string, callback_data?: string, url?: string, web_app?: WebAppInfo }): InlineKeyboardButton {
        return { text: params.text, callback_data: params?.callback_data, url: params?.url, web_app: params?.web_app ?? { url: "" } }
    }
    isEVM = (chainId: string) => lodash.includes(["1", "84532"], chainId)
    isTRON = (chainId: string) => lodash.includes(["tron", "shasta"], chainId)
    isTON = (chainId: string) => lodash.includes(["ton", "ton-testnet"], chainId)
    getChain(chainId: string) {
        return DEFAULT_CHAINS.find(e => chainId.toLowerCase().trim() === e.chainId.toLowerCase().trim())
    }
    unitToUsd = (unitAmount: number, unitPrice: number) => unitAmount * unitPrice
    usdToUnit = (usdAmount: number, unitPrice: number) => usdAmount / unitPrice
}
export const utils = new Utils()