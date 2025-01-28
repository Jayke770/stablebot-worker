import type { ITokenInfo } from "../types";
import { envconfig, STABLE_TOKEN_ADDRESS } from "./config";
import queryString from 'node:querystring'
import * as lodash from 'lodash'
class Dex {
    private headers = {
        "x-dex-api-key": envconfig.DEX_API_KEY
    }
    private endpoint = envconfig.DEX_ENDPOINT

    async getTokenInfo(chainId: string, tokenAddress: string): Promise<ITokenInfo & { status: boolean }> {
        try {
            const isStable = lodash.find(STABLE_TOKEN_ADDRESS, e => e.toString().toLowerCase().trim() === tokenAddress.toLowerCase().trim())
            if (isStable) return {
                address: tokenAddress,
                chainId,
                decimals: 6,
                priceUSD: "1",
                name: "",
                status: true,
                symbol: "",
                isNative: false,
                volume: 0,
                marketCap: 0
            }
            const query = queryString.stringify({ chainId, address: tokenAddress })
            //@ts-ignore
            const res = await fetch(new URL(`${this.endpoint}/api/token?${query}`), {
                headers: this.headers
            }).then(e => e.json())
            return res
        } catch (e) {
            //@ts-ignore
            return { status: false }
        }
    }
}
export const dexHandler = new Dex()