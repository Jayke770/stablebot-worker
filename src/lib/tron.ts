import { TronWeb } from 'tronweb'
import type { IBroadcastTx, IChain, IUserToken, IWallet } from '../types'
import { Encryption } from "./encryption"
import { utils } from './utils'
import { formatUnits } from 'viem'
import { ERC20_ABI } from './abi'
export class Tron extends Encryption {
    private tronweb: TronWeb
    private chainData?: IChain
    constructor() {
        super()
        this.chainData = utils.getChain("tron")
        this.tronweb = new TronWeb({ fullHost: this.chainData?.rpc })
    }
    setNetwork(chainId: string) {
        this.chainData = utils.getChain(chainId)
        this.tronweb = new TronWeb({ fullHost: this.chainData?.rpc })
    }
    createWallet(mnemonic: string): IWallet {
        const wallet = TronWeb.fromMnemonic(mnemonic)
        return {
            address: wallet.address,
            mnemonic: this.encrypt(mnemonic),
            type: "tron"
        }
    }
    private recoverWallet(encMnemonic: string) {
        const mnemonic = this.decrypt(encMnemonic)
        const wallet = TronWeb.fromMnemonic(mnemonic)
        return {
            address: wallet.address,
            mnemonic: this.encrypt(mnemonic),
            type: "tron"
        }
    }
    async getTokenBalance(userAddress: string, token: IUserToken): Promise<IUserToken> {
        try {
            if (token.isNative) {
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
    async transferToken(token: IUserToken, wallet: IWallet): Promise<IBroadcastTx> {
        try {
            // @ts-ignore
            return { status: false, message: "Tx Failed" }
        } catch (e) {
            console.dir(e)
            // @ts-ignore
            return { status: false, message: "Tx Failed" }
        }
    }
}
export const tronHandler = new Tron()