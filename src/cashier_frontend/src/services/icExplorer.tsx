import icExplorerAxiosClient from "@/axios/axiosClient";
import { AssetSelectItem } from "@/components/asset-select";

export const IC_EXPLORER_IMAGES_PATH = "https://api.icexplorer.io/images/";

export interface GetUserTokensRequest {
    principal: string;
    isDesc: boolean;
    page: number;
    size: number;
}

// This interface is created based on the response from the icexplorer.io API
export interface UserToken {
    accountId: string;
    amount: string;
    ledgerId: string;
    symbol: string;
    valueUSD: string;
}

export const initializeDefautGetUserTokenRequest = (princical: string): GetUserTokensRequest => {
    return {
        principal: princical,
        isDesc: true,
        page: 1,
        size: 100,
    };
};

export const mapAPITokenModelToAssetSelectModel = (token: UserToken): AssetSelectItem => {
    return {
        name: token.symbol,
        amount: Number.parseFloat(token.amount),
        tokenAddress: token.ledgerId,
    };
};

export const icExplorerService = {
    getUserTokens: (data: GetUserTokensRequest) => {
        const url = "holder/user";
        return icExplorerAxiosClient.post(url, data);
    },
};
