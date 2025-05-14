import { Chain } from "@/services/types/link.service.types";
import { TransactionType } from "./transaction-type";
import { AssetModel, WalletModel } from "@/services/types/intent.service.types";

export type TransactionRecord = {
    id: string;
    chain: Chain;
    type: TransactionType;
    from: WalletModel;
    to: WalletModel;
    asset: AssetModel;
    amount: number; // TODO: change to BigNumber bignumber.js lib
    usdEquivalent: number; // TODO: change to BigNumber bignumber.js lib
    createdAt: Date;
};
