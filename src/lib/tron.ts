import { TronWeb } from "tronweb";
import type { IBroadcastTx, IChain, ITokenMetaData, IUserToken, IWallet } from "../types";
import { Encryption } from "./encryption";
import { utils } from "./utils";
import { formatUnits, parseUnits } from "viem";
import { ERC20_ABI } from "./abi";
import { AbiCoder } from 'ethers'
export class Tron extends Encryption {
    tronweb: TronWeb;
    private chainData?: IChain;
    constructor() {
        super();
        this.chainData = utils.getChain("tron");
        this.tronweb = new TronWeb({ fullHost: this.chainData?.rpc, solidityNode: this.chainData?.rpc, eventServer: this.chainData?.rpc });
    }
    setChain(chainId: string) {
        this.chainData = utils.getChain(chainId);
        this.tronweb = new TronWeb({ fullHost: this.chainData?.rpc, solidityNode: this.chainData?.rpc, eventServer: this.chainData?.rpc });
    }
    createWallet(mnemonic: string): IWallet {
        const wallet = TronWeb.fromMnemonic(mnemonic);
        return {
            address: wallet.address,
            mnemonic: this.encrypt(mnemonic),
            type: "tron",
        };
    }
    private recoverWallet(encMnemonic: string) {
        const mnemonic = this.decrypt(encMnemonic);
        const wallet = TronWeb.fromMnemonic(mnemonic);
        return {
            address: wallet.address,
            mnemonic: this.encrypt(mnemonic),
            type: "tron",
        };
    }
    async getTokenBalance(userAddress: string, token: IUserToken): Promise<IUserToken> {
        try {
            if (token.isNative) {
                //@ts-ignore
                const balanceInWei = await this.tronweb.trx.getBalance(userAddress);
                const balance = parseFloat(this.tronweb.fromSun(balanceInWei).toString());
                return { ...token, balance };
            } else {
                this.tronweb.setAddress(userAddress)
                const contract = tronHandler.tronweb.contract(ERC20_ABI, token.address)
                const [decimals, balanceInWei]: bigint[] = await Promise.all([
                    contract.methods.decimals().call(),
                    contract.methods.balanceOf(userAddress).call()
                ]) as any
                const balance = parseFloat(formatUnits(balanceInWei, parseInt(`${decimals}`)))
                return { ...token, balance };
            }
        } catch (e) {
            return token;
        }
    }
    async transferToken({ amountInUnit, receiverAddress, userWallet, token, useMax }: { userWallet: IWallet, token: ITokenMetaData, receiverAddress: string, amountInUnit: number, useMax?: boolean }): Promise<IBroadcastTx> {
        try {
            const mnemonic = this.decrypt(userWallet.mnemonic);
            const wallet = TronWeb.fromMnemonic(mnemonic);
            if (!amountInUnit || isNaN(amountInUnit) || amountInUnit <= 0) {
                throw new Error("❌ Invalid amount provided.");
            }

            let fee = 0;

            if (token.isNative) {
                const amountInSun = Math.floor(Number(this.tronweb.toSun(useMax ? amountInUnit - 2 : amountInUnit)));
                console.log(`🚀 Sending ${amountInUnit} TRX (${amountInSun} SUN) to ${receiverAddress}`);
                const txn = await this.tronweb.transactionBuilder.sendTrx(receiverAddress, amountInSun, wallet.address)
                const signedTxn = await this.tronweb.trx.sign(txn, wallet.privateKey.replace(/^0x/, ""))
                const tx = await this.tronweb.trx.sendRawTransaction(signedTxn)
                console.log(tx)
                if (!tx.result) {
                    return {
                        status: false,
                        message: "❌ TRX Transfer Failed!",
                        txHash: "",
                        fee: Number(this.tronweb.fromSun(0)),
                    };
                }
                return {
                    status: true,
                    message: "✅ TRX Transfer Successful!",
                    txHash: tx.transaction.txID,
                    fee: Number(this.tronweb.fromSun(fee)),
                };
            } else {
                this.tronweb.setAddress(wallet.address)
                this.tronweb.setPrivateKey(wallet.privateKey.replace(/^0x/, ""))
                const contract = this.tronweb.contract(ERC20_ABI, token.address);
                const amountInSun = Number(parseUnits(`${amountInUnit}`, token.decimals));
                console.log(`🚀 Sending ${amountInUnit} ${token.symbol} (${amountInSun} SUN) to ${receiverAddress}`);
                const tx = await contract.methods.transfer(receiverAddress, amountInSun).send({ feeLimit: parseInt(this.tronweb.toSun(30).toString()) });
                return {
                    status: true,
                    message: "✅ Token Transfer Successful!",
                    txHash: tx,
                    fee: 0
                };
            }
        } catch (e: any) {
            console.error("❌ Error in transfer:", e.message);
            return { status: false, message: `❌ Transfer Failed: ${e.message}`, txHash: "", fee: 0 };
        }
    }
    async decodeParams(types: string[], output: string, ignoreMethodHash: boolean) {
        const ADDRESS_PREFIX = "41";

        if (ignoreMethodHash && output.replace(/^0x/, '').length % 64 === 8)
            output = '0x' + output.replace(/^0x/, '').substring(8);

        const abiCoder = new AbiCoder();

        if (output.replace(/^0x/, '').length % 64)
            throw new Error('The encoded string is not valid. Its length must be a multiple of 64.');
        return abiCoder.decode(types, output).reduce((obj, arg, index) => {
            if (types[index] == 'address')
                arg = ADDRESS_PREFIX + arg.substr(2).toLowerCase();
            obj.push(arg);
            return obj;
        }, []);
    }

    async waitForTx(
        txHash: string,
        timeout: number = 60000,
        interval: number = 100
    ) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
        try {
            const tx = await this.tronweb.trx.getTransaction(txHash);
            if (tx?.ret?.[0]?.contractRet === "SUCCESS") {
                const txInfo = await this.tronweb.trx.getTransactionInfo(txHash)
                if (txInfo) return { tx, txInfo }
            }
            } catch (error) {

            }
            await Bun.sleep(interval)
        }

        return null
    }
}
export const tronHandler = new Tron();
