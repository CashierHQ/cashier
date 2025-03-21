import { UserToken } from "../icExplorer.service";
import { ITokenProviderService } from "./ITokenProviderService";

export const ASSET_LIST: UserToken[] = [
    {
        symbol: "tICP",
        amount: "0",
        ledgerId: "x5qut-viaaa-aaaar-qajda-cai",
        accountId: "",
        valueUSD: "",
    },
    {
        symbol: "tCHAT",
        amount: "0",
        ledgerId: "k64dn-7aaaa-aaaam-qcdaq-cai",
        accountId: "",
        valueUSD: "",
    },
    // {
    //     symbol: "ICP",
    //     amount: "0",
    //     ledgerId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    //     accountId: "",
    //     valueUSD: "",
    // },
    {
        symbol: "BOB",
        amount: "0",
        ledgerId: "7pail-xaaaa-aaaas-aabmq-cai",
        accountId: "",
        valueUSD: "",
    },
    {
        symbol: "ckETH",
        amount: "0",
        ledgerId: "ss2fx-dyaaa-aaaar-qacoq-cai",
        accountId: "",
        valueUSD: "",
    },
    {
        symbol: "DOGMI",
        amount: "0",
        ledgerId: "np5km-uyaaa-aaaaq-aadrq-cai",
        accountId: "",
        valueUSD: "",
    },
];

export class DevTokenProviderService implements ITokenProviderService {
    getUserTokens(): Promise<UserToken[]> {
        return new Promise<UserToken[]>((resolve) => {
            setTimeout(() => {
                resolve(ASSET_LIST);
            }, 500);
        });
    }
}
