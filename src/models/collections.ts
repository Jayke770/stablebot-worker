import { Schema, model } from 'mongoose'
import type { IUser, IUserToken } from "../types"
const userSchema = new Schema<IUser>({
    userId: { type: Number, required: true, index: { unique: true } },
    firstName: { default: undefined, type: String },
    lastName: { type: String, default: undefined },
    userName: { type: String, default: undefined },
    wallets: [],
    tokens: [{ type: Schema.Types.ObjectId, ref: "userToken" }],
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