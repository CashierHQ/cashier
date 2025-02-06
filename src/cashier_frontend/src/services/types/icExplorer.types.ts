export type IcExplorerTokenListResponseItem = {
    ledgerId: string;
    symbol: string;
    totalSupply: string;
    owner: string;
    subaccount: string;
    accountId: string;
    amount: string;
    tokenDecimal: number;
    snapshotTime: number;
    valueUSD: string;
};

export type IcExplorerTokenListResponse = {
    statusCode: number;
    message: string;
    data: {
        pageNum: number;
        pageSize: number;
        size: number;
        pages: number;
        total: number;
        list: IcExplorerTokenListResponseItem[];
    };
};
