import "buffer"
import type { IBroadcastTx, IChain, IUserToken, IWallet } from "../types";
import { Encryption } from "./encryption";
import {
    TonClient,
    WalletContractV4,
    WalletContractV5R1,
    internal,
    external,
    toNano,
    HttpApi,
    fromNano,
    address,
    Address,
    SendMode,
    beginCell,
    storeMessage
} from "@ton/ton";
import TonWeb from "tonweb";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { utils } from "./utils";
import { z } from 'zod'
import { parseUnits, formatUnits } from "viem";
const getBalanceResponse = z.object({
    ok: z.boolean(),
    result: z.string()
})
const getWalletInformationResponse = z.object({
    ok: z.boolean(),
    result: z.object({
        wallet: z.boolean(),
        balance: z.string(),
        account_state: z.union([z.literal("uninitialized"), z.literal("active")]),
        wallet_type: z.string().optional(),
        seqno: z.number().default(0),
        last_transaction_id: z.object({
            "@type": z.string(),
            lt: z.string(),
            hash: z.string(),
        }).optional()
    })
})
const estimateFeeResponse = z.object({
    ok: z.boolean(),
    result: z.object({
        "@type": z.literal("query.fees"),
        source_fees: z.object({
            "@type": z.literal("fees"),
            in_fwd_fee: z.number(),
            storage_fee: z.number(),
            gas_fee: z.number(),
            fwd_fee: z.number(),
        }),
        destination_fees: z.array(z.any()),
        "@extra": z.string()
    })
})
const sendBocResponse = z.object({
    ok: z.boolean(),
    result: z.object({
        "@type": z.literal("raw.extMessageInfo"),
        hash: z.string(),
        "@extra": z.string()
    })
})
export class Ton extends Encryption {
    private chainData?: IChain;
    private client: TonWeb
    constructor() {
        super()
        this.chainData = utils.getChain("ton");
        this.client = new TonWeb(new TonWeb.HttpProvider(this.chainData?.rpc))
    }
    setChain(chainId: string) {
        const chainData = utils.getChain(chainId);
        this.chainData = chainData
        this.client = new TonWeb(new TonWeb.HttpProvider(this.chainData?.rpc))
    }
    base64ToHex = (str: string) => {
        const raw = atob(str);
        let result = '';

        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
        }

        return result;
    };
    async createWallet(mnemonic: string): Promise<IWallet> {
        const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
        const wallet = new TonWeb.Wallets.all.v4R2(this.client.provider, { publicKey: keyPair.publicKey, wc: 0 })
        const walletAddress = (await wallet.getAddress()).toString(true, true, false)
        return {
            address: walletAddress,
            mnemonic: this.encrypt(mnemonic),
            type: 'ton'
        }
    }
    async transferToken({ amountInUnit, receiverAddress, userWallet, token, useMax }: { userWallet: IWallet, token: IUserToken, receiverAddress: string, amountInUnit: number, useMax?: boolean }): Promise<IBroadcastTx> {
        try {
            const mnemonic = this.decrypt(userWallet.mnemonic);
            const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
            const wallet = new TonWeb.Wallets.all.v4R2(this.client.provider, { publicKey: keyPair.publicKey, wc: 0 })
            const walletAddress = (await wallet.getAddress()).toString(true, true, false)
            const walletInfo = await this.getWalletInformation(walletAddress)
            if (!walletInfo) return { status: false, message: "❌ Tx Failed", txHash: "", fee: 0 };
            if (token.isNative) {
                if (walletInfo.account_state !== "active") await wallet.deploy(keyPair.secretKey).send()
                const transferQuery = await wallet.methods.transfer({
                    secretKey: keyPair.secretKey,
                    toAddress: new TonWeb.utils.Address(receiverAddress),
                    seqno: walletInfo.seqno,
                    sendMode: 3,
                    amount: parseUnits(amountInUnit.toString(), token.decimals)
                }).getQuery()
                const boc = await transferQuery.toBoc(false)
                const signedBoc = TonWeb.utils.bytesToBase64(boc)
                const estFee = await this.estimateFee(walletAddress, signedBoc)
                if (!estFee) return { status: false, message: "❌ Tx Failed", txHash: "", fee: 0 };
                const fee = parseFloat(formatUnits(BigInt(estFee.source_fees.fwd_fee + estFee.source_fees.storage_fee + estFee.source_fees.gas_fee + estFee.source_fees.in_fwd_fee), token.decimals))
                const tx = await this.sendBoc(signedBoc)
                if (!tx) return { status: false, message: `❌ Tx Failed`, txHash: "", fee: 0 };
                return {
                    status: true,
                    message: "",
                    txHash: this.base64ToHex(tx.hash),
                    fee
                };
            } else {
                return { status: false, message: `❌ Not yet implemented`, txHash: "", fee: 0 };
            }
        } catch (e: any) {
            console.error("ton transfer", e)
            return { status: false, message: `❌ Transfer Failed: ${e.message}`, txHash: "", fee: 0 };
        }
    }
    async sendBoc(boc: string): Promise<z.infer<typeof sendBocResponse>['result'] | null> {
        try {
            const endpoint = new URL(`${this.chainData?.restApi}/sendBocReturnHash`)
            const response = await fetch(endpoint, {
                method: "post",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({ boc })
            }).then(e => e.json()).catch(e => undefined)
            const bocResponse = sendBocResponse.safeParse(response)
            if (!bocResponse.success) return null
            if (!bocResponse.data.ok) return null
            return bocResponse.data.result
        } catch (e) {
            console.error("send boc", e)
            return null
        }
    }
    async getTokenBalance(userAddress: string, token: IUserToken): Promise<IUserToken> {
        try {
            if (token.isNative) {
                const endpoint = new URL(`${this.chainData?.restApi}/getAddressBalance?address=${userAddress}`)
                const response = await fetch(endpoint).then(e => e.json()).catch(e => undefined)
                console.log("fasfa", response)
                const balance = getBalanceResponse.safeParse(response)
                if (!balance.success) return token
                if (!balance.data.ok) return token
                return { ...token, balance: parseFloat(fromNano(balance.data.result)) }
            }
            return token
        } catch (e: any) {
            console.error(e)
            return token
        }
    }
    async getWalletInformation(address: string): Promise<z.infer<typeof getWalletInformationResponse>['result'] | null> {
        try {
            const endpoint = new URL(`${this.chainData?.restApi}/getWalletInformation?address=${address}`)
            const response = await fetch(endpoint).then(e => e.json()).catch(e => undefined)
            console.log("wallet info", response)
            const walletInfo = getWalletInformationResponse.safeParse(response)
            if (!walletInfo.success) return null
            if (!walletInfo.data.ok) return null
            return walletInfo.data.result
        } catch (e) {
            console.error("wallet info", e)
            return null
        }
    }
    async estimateFee(address: string, body: string): Promise<z.infer<typeof estimateFeeResponse>['result'] | null> {
        try {
            const endpoint = new URL(`${this.chainData?.restApi}/estimateFee`)
            const response = await fetch(endpoint, {
                method: "post",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    address,
                    body,
                    ignore_chksig: false
                })
            }).then(e => e.json()).catch(e => undefined)
            console.log("fee", response)
            const fee = estimateFeeResponse.safeParse(response)
            if (!fee.success) return null
            if (!fee.data.ok) return null
            return fee.data.result
        } catch (e) {
            console.error("wallet info", e)
            return null
        }
    }
}
export const tonHandler = new Ton()