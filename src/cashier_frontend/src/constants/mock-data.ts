import { Chain } from "@/services/types/link.service.types";
import { TransactionType } from "@/types/transaction-type";
import { TransactionRecord } from "@/types/transaction-record.speculative";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";

export const MOCK_TX_DATA: TransactionRecord[] = [
    {
        id: "1",
        chain: Chain.IC,
        type: TransactionType.Send,
        from: { address: "my-wallet", chain: Chain.IC },
        to: { address: "other-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 1.5,
        usdEquivalent: 4500,
        createdAt: new Date("2024-02-25T12:00:00Z"),
    },
    {
        id: "2",
        chain: Chain.IC,
        type: TransactionType.Receive,
        from: { address: "other-wallet", chain: Chain.IC },
        to: { address: "my-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 60,
        usdEquivalent: 65.33,
        createdAt: new Date("2024-02-25T15:30:00Z"),
    },
    {
        id: "3",
        chain: Chain.IC,
        type: TransactionType.Send,
        from: { address: "my-wallet", chain: Chain.IC },
        to: { address: "other-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 0.1,
        usdEquivalent: 5000,
        createdAt: new Date("2024-02-26T09:45:00Z"),
    },
];

export const MOCK_TOKEN_DATA: FungibleToken = {
    address: "73mez-iiaaa-aaaaq-aaasq-cai",
    chain: Chain.IC,
    name: "Kinic",
    symbol: "KINIC",
    logo: `${IC_EXPLORER_IMAGES_PATH}73mez-iiaaa-aaaaq-aaasq-cai`,
    decimals: 8,
    amount: 60,
    usdEquivalent: 65.33,
};

export const MOCK_TOKENS_LIST: FungibleToken[] = [
    {
        address: "mxzaz-hqaaa-aaaar-qaada-cai",
        chain: Chain.IC,
        name: "Bitcoin",
        symbol: "ckBTC",
        logo: `${IC_EXPLORER_IMAGES_PATH}mxzaz-hqaaa-aaaar-qaada-cai`,
        decimals: 8,
        amount: 0.5432,
        usdEquivalent: 51_961.31,
    },
    {
        address: "ss2fx-dyaaa-aaaar-qacoq-cai",
        chain: Chain.IC,
        name: "Etherium",
        symbol: "ckETH",
        logo: `${IC_EXPLORER_IMAGES_PATH}ss2fx-dyaaa-aaaar-qacoq-cai`,
        decimals: 8,
        amount: 4.46,
        usdEquivalent: 15_986.77,
    },
    {
        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        chain: Chain.IC,
        name: "ICP",
        symbol: "ICP",
        logo: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
        decimals: 8,
        amount: 10,
        usdEquivalent: 110,
    },
    {
        address: "",
        chain: Chain.IC,
        name: "Solana",
        symbol: "SOL",
        logo: "",
        decimals: 8,
        amount: 1,
        usdEquivalent: null,
    },
];
