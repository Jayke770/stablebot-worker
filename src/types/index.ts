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
    userId: number;
    balance: number;
    usdValue: number;
    queryAddress: string;
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
    balance = "userBalance"
}
// tx 
export interface IBroadcastTx {
    txHash: string
    status: boolean
    message: string
    fee: number
}