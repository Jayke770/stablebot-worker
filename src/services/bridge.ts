import type { IWallet, IBridge } from "../types";
import { bridgeConfig, bridge } from '../models/collections'
import { BRIDGE_CONFIG_ID } from '../lib/config'
import { utils } from "../lib/utils";
import type { RootFilterQuery, UpdateWithAggregationPipeline, UpdateQuery } from "mongoose";
export class Bridge {
    async getWallet(chainId: string) {
        const walletType = utils.getWalletType(chainId)
        const bridgeData = await bridgeConfig.findOne({ configId: { $eq: BRIDGE_CONFIG_ID }, wallets: { $elemMatch: { type: walletType } } }, { wallets: { $elemMatch: { type: walletType } } })
        return bridgeData?.wallets?.[0]
    }
    async create(data: IBridge) {
        return await bridge.create(data)
    }
    async getBridgeData(bridgeId: string) {
        return await bridge.findOne({ bridgeId: { $eq: bridgeId } })
    }
    async updateBridge(filter: RootFilterQuery<IBridge>, update: UpdateWithAggregationPipeline | UpdateQuery<IBridge>) {
        await bridge.updateOne(filter, update)
    }
}
export const bridgeHandler = new Bridge()