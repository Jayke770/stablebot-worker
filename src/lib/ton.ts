import "buffer"
import type { IBroadcastTx, IChain, ITokenMetaData, IUserToken, IWallet } from "../types";
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
import BN from 'bn.js'
import TonWeb from "tonweb";
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
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
        wallet_type: z.string().nullish(),
        seqno: z.number().nullable().default(0),
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
const getJettonDataResponse = z.object({
    ok: z.boolean(),
    result: z.object({
        total_supply: z.number(),
        mintable: z.boolean(),
        admin_address: z.string(),
        jetton_content: z.object({
            type: z.string(),
            data: z.object({
                uri: z.string(),
                decimals: z.string()
            })
        }),
        jetton_wallet_code: z.string(),
        contract_type: z.string(),
    })
})

const getJettonWalletAddressResponse = z.object({
    ok: z.boolean(),
    result: z.object({
        "@type": z.literal("smc.runResult"),
        gas_used: z.number(),
        stack: z.array(z.tuple([
            z.literal("cell"),
            z.object({
                bytes: z.string(),
                object: z.object({
                    data: z.object({
                        b64: z.string(),
                        len: z.number()
                    }),
                    refs: z.array(z.any()),
                    special: z.boolean()
                }).optional()
            })
        ])),
        exit_code: z.number(),
        "@extra": z.string()
    })
})
const getTransactionsResponse = z.array(z.object({
    "@type": z.literal("raw.transaction"),
    address: z.object({
        "@type": z.literal("accountAddress"),
        account_address: z.string(),
    }),
    utime: z.number(),
    data: z.string(),
    transaction_id: z.object({
        "@type": z.literal("internal.transactionId"),
        lt: z.string(),
        hash: z.string()
    }),
    fee: z.string(),
    storage_fee: z.string(),
    other_fee: z.string(),
    in_msg: z.object({
        "@type": z.literal("raw.message"),
        source: z.string(),
        destination: z.string(),
        value: z.string(),
        fwd_fee: z.string(),
        ihr_fee: z.string(),
        created_lt: z.string(),
        body_hash: z.string(),
        msg_data: z.object({
            "@type": z.literal("msg.dataRaw"),
            body: z.string(),
            init_state: z.string(),
        }),
        message: z.string(),
    }),
    out_msgs: z.array(z.any())
}))
export class Ton extends Encryption {
    private chainData?: IChain;
    client: TonWeb
    constructor() {
        super()
        this.chainData = utils.getChain("ton");
        this.client = new TonWeb(new TonWeb.HttpProvider(this.chainData?.rpc))
    }
    setChain(chainId: string) {
        const chainData = utils.getChain(chainId);
        this.chainData = chainData
        this.client = new TonWeb(new TonWeb.HttpProvider(chainData?.rpc))
    }
    base64ToHex = (str: string) => {
        const raw = atob(str);
        let result = '';

        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
        }

        return result;
    }

    readIntFromBitString = (bs: any, cursor: number, bits: number) => {
        let n = BigInt(0);
        for (let i = 0; i < bits; i++) {
            n *= BigInt(2);
            n += BigInt(bs.get(cursor + i));
        }
        return n;
    }

    parseAddress = (cell: any) => {
        let n = this.readIntFromBitString(cell.bits, 3, 8);
        if (n > BigInt(127)) {
            n = n - BigInt(256);
        }
        const hashPart = this.readIntFromBitString(cell.bits, 3 + 8, 256);
        if (n.toString(10) + ":" + hashPart.toString(16) === '0:0') return null;
        const s = n.toString(10) + ":" + hashPart.toString(16).padStart(64, '0');
        return new TonWeb.Address(s);
    }

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
    async transferToken({ amountInUnit, receiverAddress, userWallet, token, useMax }: { userWallet: IWallet, token: ITokenMetaData, receiverAddress: string, amountInUnit: number, useMax?: boolean }): Promise<IBroadcastTx> {
        try {
            const mnemonic = this.decrypt(userWallet.mnemonic);
            const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
            const wallet = new TonWeb.Wallets.all.v4R2(this.client.provider, { publicKey: keyPair.publicKey, wc: 0 })
            const walletAddress = (await wallet.getAddress()).toString(true, true, false)
            const walletInfo = await this.getWalletInformation(walletAddress)
            if (!walletInfo) return { status: false, message: "❌ Tx Failed: 0xw", txHash: "", fee: 0 };
            if (token.isNative) {
                const transferQuery = await wallet.methods.transfer({
                    secretKey: keyPair.secretKey,
                    toAddress: new TonWeb.utils.Address(receiverAddress),
                    seqno: walletInfo.seqno || 0,
                    sendMode: 3,
                    amount: new BN(parseUnits(amountInUnit.toString(), token.decimals).toString())
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
                const jettonWalletAddress = await this.getJettonWalletAddress(token.address, walletAddress)
                if (!jettonWalletAddress) return { status: false, message: `❌ Invalid Jetton`, txHash: "", fee: 0 };
                const jettonWallet = new TonWeb.token.jetton.JettonWallet(tonHandler.client.provider, {
                    address: jettonWalletAddress
                });
                const transferQuery = await wallet.methods.transfer({
                    secretKey: keyPair.secretKey,
                    toAddress: jettonWalletAddress,
                    amount: this.client.utils.toNano("0.02"),
                    seqno: walletInfo.seqno || 0,
                    payload: await jettonWallet.createTransferBody({
                        toAddress: new this.client.utils.Address(receiverAddress),
                        responseAddress: new this.client.utils.Address(walletAddress),
                        //@ts-ignore
                        jettonAmount: new BN(parseUnits(amountInUnit.toString(), token.decimals).toString())
                    }),
                    sendMode: 3,
                }).getQuery()
                const boc = await transferQuery.toBoc(false)
                const signedBoc = TonWeb.utils.bytesToBase64(boc)
                const estFee = await this.estimateFee(walletAddress, signedBoc)
                if (!estFee) return { status: false, message: "❌ Tx Failed", txHash: "", fee: 0 };
                const fee = parseFloat(formatUnits(BigInt(estFee.source_fees.fwd_fee + estFee.source_fees.storage_fee + estFee.source_fees.gas_fee + estFee.source_fees.in_fwd_fee), this.chainData?.nativeTokenDecimal || 9))
                const tx = await this.sendBoc(signedBoc)
                if (!tx) return { status: false, message: `❌ Tx Failed`, txHash: "", fee: 0 };
                return {
                    status: true,
                    message: "",
                    txHash: this.base64ToHex(tx.hash),
                    fee
                };
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
                const balance = getBalanceResponse.safeParse(response)
                if (!balance.success) return token
                if (!balance.data.ok) return token
                return { ...token, balance: parseFloat(fromNano(balance.data.result)) }
            } else {
                const jettonData = await this.getJettonData(token.address)
                if (!jettonData) return token
                const jettonWalletAddress = await this.getJettonWalletAddress(token.address, userAddress)
                if (!jettonWalletAddress) return token
                const jettonWallet = new TonWeb.token.jetton.JettonWallet(tonHandler.client.provider, {
                    address: jettonWalletAddress
                });
                const jettonBalance = await jettonWallet.getData();
                return { ...token, balance: parseFloat(formatUnits(parseInt(jettonBalance.balance.toString()) as any, 6)) }
            }
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
            console.log(walletInfo.error)
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
            console.log("feeeee", endpoint.toString())
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
    async getJettonData(tokenAddress: string): Promise<z.infer<typeof getJettonDataResponse>['result'] | null> {
        try {
            const endpoint = new URL(`${this.chainData?.restApi}/getTokenData?address=${tokenAddress}`)
            const response = await fetch(endpoint).then(e => e.json()).catch(e => undefined)
            const jettonData = getJettonDataResponse.safeParse(response)
            if (!jettonData.success) return null
            if (!jettonData.data.ok) return null
            return jettonData.data.result
        } catch (e) {
            console.log(e)
            return null
        }
    }
    async getJettonWalletAddress(tokenAddress: string, ownerAddress: string) {
        const cell = new TonWeb.boc.Cell()
        cell.bits.writeAddress(new TonWeb.utils.Address(ownerAddress))
        const body = {
            address: tokenAddress,
            method: "get_wallet_address",
            stack: [
                ["tvm.Slice", TonWeb.utils.bytesToBase64(await cell.toBoc(false))]
            ]
        }
        const endpoint = new URL(`${this.chainData?.restApi}/runGetMethod`)
        const response = await fetch(endpoint, {
            method: "post",
            body: JSON.stringify(body)
        }).then(e => e.json()).catch(e => undefined)
        const walletData = getJettonWalletAddressResponse.safeParse(response)
        if (!walletData.success) return null
        if (!walletData.data.ok) return null
        const cellAddress = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(walletData.data.result.stack[0][1].bytes))
        return tonHandler.parseAddress(cellAddress)
    }
    async waitForTx(
        address: string,
        txHash: string,
        timeout: number = 30000,
        interval: number = 1000
    ) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                // Get transactions with matching hash
                const txnsData = await this.client.getTransactions(address, 1, undefined, txHash, 0);
                const tx = getTransactionsResponse.safeParse(txnsData)
                if (tx.success) {
                    if (tx.data.length > 0) {
                        return tx.data[0];
                    }
                }
            } catch (error) {
                console.error('Error checking transaction:', error);
            }
            await Bun.sleep(interval)
        }
        return null
    }
}
export const tonHandler = new Ton()