//collections 
export interface IUser {
    userId: number;
    firstName?: string;
    lastName?: string;
    userName?: string;
    wallets: IWallet[];
    tokens: IUserToken[];
    mnemonic: string
    referrals: number,
    referralId?: string,
    referrer?: string
    webAppMessageId?: number
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IWallet {
    address: string
    mnemonic: string,
    type: "evm" | "tron" | "ton"
}
export interface IUserToken extends ITokenMetaData {
    userId: number,
    balance: number,
    usdValue: number
    queryAddress: string
    tokenId: string
}
export interface ITokenMetaData {
    decimals: number,
    name: string,
    symbol: string,
    chainId: string,
    isNative?: boolean,
    address: string
    emoji?: string,
    icon?: string
}
export interface ITokenInfo extends ITokenMetaData {
    priceUSD: string
    marketCap: number;
    volume: number;
}
export interface IBridge {
    bridgeId: string,
    srcChainId: string,
    destChainId: string,
    srcToken: ITokenMetaData,
    destToken: ITokenMetaData,
    srcSeconds: number,
    destSeconds?: number,
    userId: number,
    dpTxHash: string,
    wdTxHash: string
    srcTokenAmountInUsd: number,
    srcTokenAmountInUnit: number,
    destTokenAmountInUsd: number,
    destTokenAmountInUnit: number,
    senderAddress: string,
    receiverAddress: string,
    messageId: number,
    srcFeeAmountInUnit: number,
    destFeeAmountInUnit: number
    status: "pending" | "completed",
    messageData: string
}
export interface IBridgeConfigs {
    wallets: IWallet[],
    totalBridgeTx: number
    mnemonic: string
    configId: string
}
export interface IChain {
    emoji: string
    chainId: string;
    name: string;
    symbol: string;
    isTestNet?: boolean,
    explorer: {
        url: string;
        accountPath: string;
        txPath: string;
        params?: string;
        apiEndpoint?: string;
    };
    rpc: string;
    restApi?: string,
    nativeTokenAddress?: string;
    nativeTokenDecimal: number;
    geckoTerminalId?: string;
    coingeckoId: string;
    v2RouterAddress?: `0x${string}`;
    wethAddress?: `0x${string}`;
    dexAddress?: `0x${string}`;
    pancakeSwapv2Subgraph?: string;
    pancakeSwapv3Subgraph?: string;
}

//tasks 
export enum ITasks {
    balance = "balance",
    sendMessage = "sendMessage",
    bridge = "bridge",
    retryFailedBridge = "retryFailedBridge"
}
// tx 
export interface IBroadcastTx {
    txHash: string
    status: boolean
    message?: string
    fee: number
}
export interface IValidateBridgeTx extends IBroadcastTx {
    fromAddress: string
    toAddress: string
    tokenAmountInUnit: number
}
//config 

export interface IGc {
    gcId: number
    threadId?: number
}
export interface INotificationGc {
    withdrawals: IGc[]
    bridge: IGc[]
}