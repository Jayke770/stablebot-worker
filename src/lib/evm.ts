import { mnemonicToAccount } from "viem/accounts";
import type { IBroadcastTx, IChain, ITokenMetaData, IUserToken, IWallet } from "../types";
import { Encryption } from "./encryption";
import { utils } from "./utils";
import { createPublicClient, createWalletClient, http, publicActions, formatEther, parseUnits, formatUnits, formatGwei } from "viem";
import { mainnet, baseSepolia } from "viem/chains";
import { ERC20_ABI } from "./abi";
import { userHandler } from "../services/user"
export class EVM extends Encryption {
    private chainData?: IChain;
    private chains = {
        "1": mainnet,
        "84532": baseSepolia,
    };
    client: ReturnType<typeof createPublicClient>;
    constructor() {
        super();
        this.chainData = utils.getChain("1");
        this.client = createPublicClient({
            chain: this.chains["1"],
            transport: http(this.chainData?.rpc),
        });
    }
    setChain(chainId: string) {
        this.chainData = utils.getChain(chainId);
        //@ts-ignore
        this.client = createPublicClient({
            //@ts-ignore
            chain: this.chains[chainId as any],
            transport: http(this.chainData?.rpc),
        });
    }
    createWallet(mnemonic: string): IWallet {
        const wallet = mnemonicToAccount(mnemonic);
        return {
            address: wallet.address,
            mnemonic: this.encrypt(mnemonic),
            type: "evm",
        };
    }

    async getTokenBalance(userAddress: `0x${string}`, token: IUserToken): Promise<IUserToken> {
        try {
            if (token.isNative) {
                const balanceInWei = await this.client.getBalance({ address: userAddress });
                const balance = Number(formatEther(balanceInWei));
                return { ...token, balance };
            } else {
                const [balanceInWei] = await this.client.multicall({
                    allowFailure: true,
                    contracts: [
                        {
                            abi: ERC20_ABI,
                            address: token.address as `0x${string}`,
                            functionName: "balanceOf",
                            args: [userAddress],
                        },
                    ],
                });
                if (balanceInWei?.status === "failure") return token;
                const balance = parseFloat(formatUnits(balanceInWei.result, token.decimals));
                return { ...token, balance };
            }
        } catch (e) {
            return token;
        }
    }

    async transferToken({ userWallet, amountInUnit, receiverAddress, token }: {
        userWallet: IWallet,
        token: ITokenMetaData,
        receiverAddress: string,
        amountInUnit: number,
        useMax?: boolean
    }): Promise<IBroadcastTx> {
        try {
            const account = mnemonicToAccount(this.decrypt(userWallet.mnemonic));
            const walletClient = createWalletClient({
                account: account,
                chain: this.client.chain,
                transport: http(this.chainData?.rpc),
            }).extend(publicActions);

            if (!amountInUnit || isNaN(amountInUnit) || amountInUnit <= 0) {
                throw new Error("❌ Invalid amount provided.");
            }

            let txHash: `0x${string}` | undefined
            let fee: number = 0;

            if (token.isNative) {
                console.log(`🚀 Sending ${amountInUnit} ETH to ${receiverAddress}`);
                txHash = await walletClient.sendTransaction({
                    to: receiverAddress as `0x${string}`,
                    value: parseUnits(amountInUnit.toString(), token.decimals),
                    chain: this.client.chain,
                });
                console.log(`✅ Native ETH TX Hash: ${txHash}`);
                return {
                    status: true,
                    message: "✅ Transfer Successful!",
                    txHash,
                    fee
                };
            } else {
                console.log(`🚀 Sending ${amountInUnit} ${token.symbol} to ${receiverAddress}`);
                txHash = await walletClient.writeContract({
                    abi: ERC20_ABI,
                    address: token.address as `0x${string}`,
                    functionName: "transfer",
                    args: [receiverAddress as `0x${string}`, parseUnits(amountInUnit.toString(), token.decimals)],
                    chain: this.client.chain,
                });
                console.log(`✅ ERC-20 Token TX Hash: ${txHash}`);
                return {
                    status: true,
                    message: "✅ Transfer Successful!",
                    txHash,
                    fee
                };
            }
        } catch (e: any) {
            console.error("❌ Error in transfer:", e.message);
            return {
                status: false,
                message: `❌ Transfer Failed`,
                txHash: "",
                fee: 0,
            };
        }
    }

    async waitForTx(
        txHash: string,
        timeout: number = 60000 * 5,
        interval: number = 1000
    ) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                // Get transactions with matching hash
                const txReceipt = await this.client.getTransactionReceipt({ hash: txHash as `0x${string}` })
                const tx = await this.client.getTransaction({ hash: txHash as `0x${string}` })
                return { txReceipt, tx }
            } catch (error) {
                console.error(`Error checking transaction: ${this.chainData?.chainId} ${txHash}`,);
            }
            await Bun.sleep(interval)
        }
        return null
    }
}
export const evmHandler = new EVM();
