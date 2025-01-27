import type { RootFilterQuery, Types, UpdateQuery, UpdateWithAggregationPipeline } from "mongoose";
import { DEFAULT_TOKENS } from "../lib/config"
import { userData, userToken } from "../models/collections"
import type { IUser, IUserToken, IWallet } from "../types"
export class User {
    async getUser(userId: number): Promise<IUser & { _id: Types.ObjectId } | null> {
        try {
            return await userData.findOne({ userId: { $eq: userId } })
        } catch (e) {
            console.log(e)
            return null
        }
    }
    async create(data: IUser): Promise<IUser & { _id: Types.ObjectId } | null> {
        try {
            const tokens = DEFAULT_TOKENS.map(e => ({
                ...e, userId: data.userId,
                queryAddress: e.address
            }))
            const userTokens = await userToken.insertMany(tokens)
            const user = await userData.create({ ...data, tokens: userTokens.map(e => e._id) })
            return { ...user.toJSON(), tokens: userTokens }
        } catch (e) {
            return null
        }
    }
    async getWallet(userId: number, chainId: string): Promise<IWallet | undefined> {
        const walletType = chainId === "tron" ? "tron" : "evm"
        const user = await userData.findOne({ userId: { $eq: userId } }, { wallets: 1 })
        if (!user) return undefined
        return user.wallets.find(e => e.type === walletType)
    }
    async getTokens(userId: number, chainId: string) {
        return await userToken.find({ userId: { $eq: userId }, chainId: { $eq: chainId } })
    }
    async getToken(userId: number, chainId: string, tokenAddress: string) {
        const token = await userToken.findOne({
            userId: { $eq: userId },
            chainId: { $eq: chainId },
            queryAddress: { $eq: tokenAddress.trim().toLowerCase() }
        }).lean()
        return token
    }
    async updateUser(filter: RootFilterQuery<IUser>, update: UpdateWithAggregationPipeline | UpdateQuery<IUser>) {
        try {
            await userData.updateOne(filter, update)
        } catch (e) {
            console.error(e)
        }
    }
}
export const userHandler = new User()