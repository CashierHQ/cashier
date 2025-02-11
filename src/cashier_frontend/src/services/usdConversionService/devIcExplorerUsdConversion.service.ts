import { AxiosInstance } from "axios";
import { IUsdConversionService } from "./IUsdConversionService";
import icExplorerAxiosClient from "@/axios/axiosClient";
import { ConversionRates } from "../types/usdConversion.service.types";
import { IcExplorerHolderResponse, IcExplorerHolderResponseItem } from "../types/icExplorer.types";

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
