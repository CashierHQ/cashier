import icExplorerAxiosClient from "@/axios/axiosClient";
import { Principal } from "@dfinity/principal";
import { toNullable } from "@dfinity/utils";

export const IC_EXPLORER_IMAGES_PATH = "https://api.icexplorer.io/images/";

export interface GetUserTokensRequest {
    principal: string;
    isDesc: boolean;
    page: number;
    size: number;
}

// This interface is created based on the response from the icexplorer.io API
export interface DataSourceToken {
    accountId: string;
    amount: string;
    ledgerId: string;
    symbol: string;
    valueUSD: string;
    // Additional fields from the response
    totalSupply?: string;
    owner?: string;
    subaccount?: string;
    tokenDecimal?: number;
    snapshotTime?: number;
}

/**
 * Maps a DataSourceToken to the target interface needed by the token storage
 * @param token The source token data from icExplorer API
 * @returns An object with the target structure
 */
export function mapDataSourceTokenToAddTokenInput(token: DataSourceToken): {
    decimals: [] | [number];
    chain: string;
    name: [] | [string];
    ledger_id: [] | [Principal];
    index_id: [] | [Principal];
    symbol: [] | [string];
} {
    return {
        // Convert tokenDecimal to optional array format
        decimals: toNullable(token.tokenDecimal),

        // Always set chain to 'IC' because úing ICExplorer API
        chain: "IC",

        // Symbol is mapped as optional array
        symbol: toNullable(token.symbol),

        // We don't have name in the source, so leave it empty
        name: toNullable(token.symbol),

        // Convert ledgerId to Principal if it's a valid string
        ledger_id: token.ledgerId
            ? (() => {
                  try {
                      return [Principal.fromText(token.ledgerId)];
                  } catch (error) {
                      console.error("Invalid ledger ID format:", error);
                      return [];
                  }
              })()
            : [],

        // We don't have index_id in the source, so leave it empty
        index_id: [],
    };
}

export interface UserTokensListResponse {
    total: string;
    list: DataSourceToken[];
    pageNum: number;
    pageSize: number;
    size: number;
    startRow: string;
    endRow: string;
    pages: number;
    prePage: number;
    nextPage: number;
    isFirstPage: boolean;
    isLastPage: boolean;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    navigatePages: number;
    navigateFirstPage: number;
    navigateLastPage: number;
}

export interface GetUserTokensResponse {
    statusCode: number;
    data: UserTokensListResponse;
}

export class ICExplorerService {
    constructor() {}

    async getUserTokens(principal: string): Promise<DataSourceToken[]> {
        const url = "holder/user";
        const response = await icExplorerAxiosClient.post(url, {
            principal,
            page: 1,
            size: 300,
            isDesc: true,
        });

        return response.data.list;
    }
}
