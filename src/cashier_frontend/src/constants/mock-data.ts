import { Chain } from "@/services/types/link.service.types";
import { TransactionType } from "@/types/transaction-type";
import { TransactionRecord } from "@/types/transaction-record.speculative";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { CHAIN, FEE_TYPE } from "@/services/types/enum";
import { FeeModel } from "@/services/types/intent.service.types";
import { convertTokenAmountToNumber } from "@/utils";

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
    amount: BigInt(convertTokenAmountToNumber(20, 8)),
    usdEquivalent: 65.33,
    usdConversionRate: 1.9288,
};

export const MOCK_TOKENS_LIST: FungibleToken[] = [
    {
        address: "x5qut-viaaa-aaaar-qajda-cai",
        chain: Chain.IC,
        name: "tICP",
        symbol: "tICP",
        logo: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
        decimals: 8,
        amount: BigInt(convertTokenAmountToNumber(0.5432, 8)),
        usdEquivalent: 51_961.31,
        usdConversionRate: 96_216.2,
    },
    {
        address: "k64dn-7aaaa-aaaam-qcdaq-cai",
        chain: Chain.IC,
        name: "tChat",
        symbol: "tCHAT",
        logo: `${IC_EXPLORER_IMAGES_PATH}2ouva-viaaa-aaaaq-aaamq-cai`,
        decimals: 8,
        amount: BigInt(convertTokenAmountToNumber(4.457, 8)),
        usdEquivalent: 15_986.77,
        usdConversionRate: 3_584.4,
    },
    {
        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        chain: Chain.IC,
        name: "ICP",
        symbol: "ICP",
        logo: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
        decimals: 8,
        amount: BigInt(convertTokenAmountToNumber(10, 8)),
        usdEquivalent: 110,
        usdConversionRate: 11,
    },
    {
        address: "7pail-xaaaa-aaaas-aabmq-cai",
        chain: Chain.IC,
        name: "BOB",
        symbol: "BOB",
        logo: `${IC_EXPLORER_IMAGES_PATH}7pail-xaaaa-aaaas-aabmq-cai`,
        decimals: 8,
        amount: BigInt(convertTokenAmountToNumber(1, 8)),
        usdEquivalent: null,
        usdConversionRate: null,
    },
];

export const MOCK_TOTAL_USD_EQUIVALENT = 42_475.1;

export const MOCK_CASHIER_FEES: FeeModel[] = [
    {
        type: FEE_TYPE.LINK_CREATION,
        amount: BigInt(convertTokenAmountToNumber(0.001, 8)),
        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        chain: CHAIN.IC,
    },
];
