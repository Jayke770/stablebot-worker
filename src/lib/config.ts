import { config } from 'dotenv'
if (process.env.NODE_ENV !== "production") config()
import * as envalid from 'envalid'
import type { IChain, ITokenMetaData, IWallet } from '../types'
export const envconfig = envalid.cleanEnv(process.env, {
    ENABLE_TESTNETS: envalid.bool({ default: true }),
    PORT: envalid.num({ default: 3000 }),
    BOT_TOKEN: envalid.str(),
    BOT_WEBHOOK_URI: envalid.str(),
    TELEGRAM_API_SERVER: envalid.str(),
    BOT_SECRET_TOKEN: envalid.str(),
    MONGODB_URI: envalid.str(),
    DEX_ENDPOINT: envalid.url(),
    DEX_API_KEY: envalid.str(),
    ENCRYPTION_KEY: envalid.str(),
    WORKER_DB_HOST: envalid.str(),
    WORKER_DB_PORT: envalid.port(),
    WORKER_DB_NAME: envalid.num(),
    WORKER_DB_USERNAME: envalid.str(),
    WORKER_DB_PASSWORD: envalid.str(),
    CHAIN_RPC_1: envalid.str(),
    CHAIN_RPC_84532: envalid.url({ default: "" }),
    CHAIN_RPC_TRON: envalid.url(),
    CHAIN_RPC_SHASTA: envalid.url({ default: "" }),
    CHAIN_TON_TESTNET_RPC: envalid.url({ default: "" }),
    CHAIN_TON_RPC: envalid.url(),
    CHAIN_TON_REST_API: envalid.url(),
    CHAIN_TON_TESTNET_REST_API: envalid.url(),
})
export const MAINNET_TOKENS: ITokenMetaData[] = [
    {
        chainId: "tron",
        decimals: 6,
        name: "TRON",
        symbol: "TRX",
        address: "0",
        isNative: true,
        emoji: "🟥"
    },
    {
        chainId: "tron",
        decimals: 6,
        name: "Tether USD",
        symbol: "USDT",
        address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        emoji: "🟩"
    },
    {
        chainId: "1",
        decimals: 18,
        isNative: true,
        name: "Ethereum",
        symbol: "ETH",
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        emoji: "💠"
    },
    {
        chainId: "1",
        decimals: 6,
        name: "Tether USD",
        symbol: "USDT",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        emoji: "♻️"
    },
    {
        chainId: "ton",
        decimals: 9,
        name: "Ton",
        symbol: "TON",
        address: "ton",
        emoji: "💎",
        isNative: true
    },
    {
        chainId: "ton",
        decimals: 6,
        name: "Tether USD",
        symbol: "USD₮",
        address: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
        emoji: "🟩"
    },
]
export const TESTNET_TOKENS: ITokenMetaData[] = [
    {
        chainId: "shasta",
        decimals: 6,
        name: "TRON",
        symbol: "TRX",
        address: "0",
        isNative: true,
        emoji: "🟥"
    },
    {
        chainId: "84532",
        decimals: 18,
        isNative: true,
        name: "Ethereum",
        symbol: "ETH",
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        emoji: "💠"
    },
    {
        chainId: "ton-testnet",
        decimals: 9,
        name: "Ton",
        symbol: "tTON",
        address: "ton-testnet",
        emoji: "💎",
        isNative: true
    }
]
export const NEW_TOKENS: ITokenMetaData[] = [
    {
        chainId: "ton",
        decimals: 6,
        name: "Tether USD",
        symbol: "USD₮",
        address: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
        emoji: "🟩"
    }
]
export const DEFAULT_TOKENS: ITokenMetaData[] = envconfig.ENABLE_TESTNETS ? [...MAINNET_TOKENS, ...TESTNET_TOKENS] : MAINNET_TOKENS
export const TESTNET_CHAINS: IChain[] = [
    {
        chainId: "84532",
        emoji: "💠",
        name: "Ethereum",
        symbol: "ETH",
        nativeTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        nativeTokenDecimal: 18,
        rpc: envconfig.CHAIN_RPC_84532,
        coingeckoId: "ethereum",
        geckoTerminalId: "eth",
        isTestNet: true,
        explorer: {
            accountPath: "/address/",
            txPath: "/tx/",
            url: "https://sepolia.basescan.org",
            apiEndpoint: "https://api.etherscan.io/api",
        },
        v2RouterAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        wethAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        dexAddress: "0xe3090eba3F23f5Fd5e48d63deE4A4b36E043B49B",
    },
    {
        chainId: "shasta",
        emoji: "🟥",
        name: "Tron",
        symbol: "TRX",
        nativeTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        nativeTokenDecimal: 6,
        rpc: envconfig.CHAIN_RPC_SHASTA,
        coingeckoId: "tron",
        explorer: {
            accountPath: "/address/",
            txPath: "/transaction/",
            url: "https://shasta.tronscan.org/#",
        },
    },
    {
        chainId: "ton-testnet",
        emoji: "💎",
        name: "tToncoin",
        symbol: "tTON",
        nativeTokenAddress: "ton-testnet",
        nativeTokenDecimal: 9,
        rpc: envconfig.CHAIN_TON_TESTNET_RPC,
        restApi: envconfig.CHAIN_TON_TESTNET_REST_API,
        coingeckoId: "the-open-network",
        explorer: {
            accountPath: "/address/",
            txPath: "/tx/",
            url: "https://testnet.tonscan.org",
        },
    },
]
export const MAINNET_CHAINS: IChain[] = [
    {
        chainId: "1",
        emoji: "💠",
        name: "Ethereum",
        symbol: "ETH",
        nativeTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        nativeTokenDecimal: 18,
        rpc: envconfig.CHAIN_RPC_1,
        coingeckoId: "ethereum",
        geckoTerminalId: "eth",
        explorer: {
            accountPath: "/address/",
            txPath: "/tx/",
            url: "http://etherscan.io",
            apiEndpoint: "https://api.etherscan.io/api",
        },
        v2RouterAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        wethAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        dexAddress: "0xe3090eba3F23f5Fd5e48d63deE4A4b36E043B49B",
    },
    {
        chainId: "tron",
        emoji: "🟥",
        name: "Tron",
        symbol: "TRX",
        nativeTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        nativeTokenDecimal: 6,
        rpc: envconfig.CHAIN_RPC_TRON,
        coingeckoId: "tron",
        explorer: {
            accountPath: "/address/",
            txPath: "/transaction/",
            url: "https://tronscan.org/#",
        },
    },
    {
        chainId: "ton",
        emoji: "💎",
        name: "Toncoin",
        symbol: "TON",
        nativeTokenAddress: "ton", //EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c
        nativeTokenDecimal: 9,
        rpc: envconfig.CHAIN_TON_RPC,
        restApi: envconfig.CHAIN_TON_REST_API,
        coingeckoId: "the-open-network",
        explorer: {
            accountPath: "/address/",
            txPath: "/tx/",
            url: "https://tonscan.org",
        },
    },
]
export const DEFAULT_CHAINS: IChain[] = envconfig.ENABLE_TESTNETS ? [...TESTNET_CHAINS, ...MAINNET_CHAINS] : MAINNET_CHAINS
