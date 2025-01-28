import { Schema, model } from 'mongoose'
import type { IBridge, IBridgeConfigs, IUser, IUserToken } from "../types"
const userSchema = new Schema<IUser>({
    userId: { type: Number, required: true, index: { unique: true } },
    firstName: { default: undefined, type: String },
    lastName: { type: String, default: undefined },
    userName: { type: String, default: undefined },
    wallets: [],
    mnemonic: { type: String, required: true },
    referrals: { type: Number, default: 0 },
    referrer: { type: String },
    referralId: { type: String, index: { unique: true } },
    webAppMessageId: { type: Number }
}, {
    timestamps: true
})
export const userData = model("users", userSchema)
const userTokenSchema = new Schema<IUserToken>({
    balance: { type: Number, default: 0 },
    tokenId: { type: String, required: true, index: { unique: true } },
    chainId: { type: String, required: true },
    decimals: { type: Number, required: true },
    name: { type: String, default: "" },
    queryAddress: { type: String, required: true, trim: true, lowercase: true },
    symbol: { type: String, default: "" },
    usdValue: { type: Number, default: 0 },
    userId: { type: Number, required: true },
    isNative: { type: Boolean, default: false },
    address: { type: String, required: true },
    emoji: { type: String, default: "" },
    icon: { type: String, default: "" }
}, {
    timestamps: true
})
export const userToken = model("userToken", userTokenSchema)
const bridgeSchema = new Schema<IBridge>({
    bridgeId: { type: String, unique: true, index: { unique: true } },
    srcChainId: { type: String, required: true },
    destChainId: { type: String, required: true },
    srcToken: { type: Object, required: true },
    destToken: { type: Object, required: true },
    srcSeconds: { type: Number, default: 0 },
    destSeconds: { type: Number, default: 0 },
    userId: { type: Number, required: true },
    dpTxHash: { type: String, required: true },
    wdTxHash: { type: String, default: null },
    srcTokenAmountInUsd: { type: Number, required: true },
    srcTokenAmountInUnit: { type: Number, required: true },
    destTokenAmountInUsd: { type: Number, default: 0 },
    destTokenAmountInUnit: { type: Number, default: 0 },
    senderAddress: { type: String, required: true },
    receiverAddress: { type: String, required: true },
    messageId: { type: Number, required: true },
    srcFeeAmountInUnit: { type: Number, default: 0 },
    destFeeAmountInUnit: { type: Number, default: 0 },
    status: { type: String, default: "pending", enum: ["pending", "completed"] },
    messageData: { type: String, default: "" }
}, {
    timestamps: true
})
export const bridge = model("bridge", bridgeSchema)

const bridgeConfigSchema = new Schema<IBridgeConfigs>({
    mnemonic: { type: String, required: true },
    totalBridgeTx: { type: Number, default: 0 },
    wallets: [],
    configId: { type: String, unique: true, index: { unique: true } }
})
export const bridgeConfig = model("bridgeConfig", bridgeConfigSchema)