import { AxiosInstance } from "axios";
import {
    IcExplorerHolderResponse,
    IcExplorerHolderResponseItem,
    IcExplorerTokenListResponse,
    IcExplorerTokenListResponseItem,
} from "./types/icExplorer.types";
import icExplorerAxiosClient from "@/axios/axiosClient";

export type ConversionRates = {
    tokenToUsd: number | undefined;
    usdToToken: number | undefined;
};

export interface IUsdConversionService {
    tokenToUsd(principal: string, address: string, amount: number): Promise<number | undefined>;
    usdToToken(principal: string, address: string, amount: number): Promise<number | undefined>;
    getConversionRates(principal: string, address: string): Promise<ConversionRates>;
}

export class IcExplorerUsdConversionService implements IUsdConversionService {
    private client: AxiosInstance;

    constructor() {
        this.client = icExplorerAxiosClient;
    }

    public async tokenToUsd(
        principal: string,
        address: string,
        amount: number,
    ): Promise<number | undefined> {
        const { tokenToUsd: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
    }

    public async usdToToken(
        principal: string,
        address: string,
        amount: number,
    ): Promise<number | undefined> {
        const { usdToToken: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
    }

    public async getConversionRates(principal: string, address: string): Promise<ConversionRates> {
        const token = await this._getToken(principal, address);

        if (!token) {
            return {
                tokenToUsd: undefined,
                usdToToken: undefined,
            };
        }

        const tokenAmount = parseFloat(token.amount);
        const tokenUsdAmount = parseFloat(token.valueUSD);
        const tokenToUsd = tokenUsdAmount / tokenAmount;
        const usdToToken = 1 / tokenToUsd;

        return {
            tokenToUsd,
            usdToToken,
        };
    }

    public async _getTokens(principal: string): Promise<IcExplorerTokenListResponseItem[]> {
        const response = await this.client.post<IcExplorerTokenListResponse>("/holder/user", {
            page: 1,
            size: 100,
            isDesc: false,
            principal,
        });

        return response.data.list;
    }

    public async _getToken(
        principal: string,
        address: string,
    ): Promise<IcExplorerTokenListResponseItem | undefined> {
        const tokens = await this._getTokens(principal);
        const token = tokens.find((token) => token.ledgerId === address);
        return token;
    }
}

export class MockUsdConversionService implements IUsdConversionService {
    private conversionMap: { [key: string]: number };

    constructor() {
        this.conversionMap = {
            "x5qut-viaaa-aaaar-qajda-cai": 12.345,
            "k64dn-7aaaa-aaaam-qcdaq-cai": 0.00543,
        };
    }

    public async usdToToken(
        principal: string,
        address: string,
        amount: number,
    ): Promise<number | undefined> {
        const { usdToToken: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
    }

    public async tokenToUsd(principal: string, address: string, amount: number) {
        const { tokenToUsd: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
    }

    public async getConversionRates(_: string, address: string): Promise<ConversionRates> {
        const tokenToUsd = this.conversionMap[address] ?? 1;

        return {
            tokenToUsd,
            usdToToken: 1 / tokenToUsd,
        };
    }
}

export class DevIcExplorerUsdConversionService implements IUsdConversionService {
    private client: AxiosInstance;

    constructor() {
        this.client = icExplorerAxiosClient;
    }

    public async usdToToken(
        principal: string,
        address: string,
        amount: number,
    ): Promise<number | undefined> {
        const { usdToToken: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
    }

    public async tokenToUsd(principal: string, address: string, amount: number) {
        const { tokenToUsd: rate } = await this.getConversionRates(principal, address);

        if (rate === undefined) {
            return undefined;
        }

        return amount * rate;
    }

    public async getConversionRates(_: string, address: string): Promise<ConversionRates> {
        const token = await this._getToken(address);

        if (!token) {
            return {
                tokenToUsd: undefined,
                usdToToken: undefined,
            };
        }

        const tokenAmount = parseFloat(token.amount);
        const tokenUsdAmount = parseFloat(token.valueUSD);
        const tokenToUsd = tokenUsdAmount / tokenAmount;
        const usdToToken = 1 / tokenToUsd;

        return {
            tokenToUsd,
            usdToToken,
        };
    }

    private async _getToken(ledgerId: string): Promise<IcExplorerHolderResponseItem | undefined> {
        const response = await this.client.post<IcExplorerHolderResponse>("/holder/token", {
            page: 1,
            size: 1,
            isDesc: false,
            ledgerId,
        });

        return response.data.list[0];
    }
}

export const UsdConversionService: IUsdConversionService =
    import.meta.env.MODE === "production"
        ? new IcExplorerUsdConversionService()
        : new DevIcExplorerUsdConversionService();
