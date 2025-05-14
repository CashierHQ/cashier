import { ConversionRates } from "../types/usdConversion.service.types";

export interface IUsdConversionService {
    tokenToUsd(principal: string, address: string, amount: number): Promise<number | undefined>;
    usdToToken(principal: string, address: string, amount: number): Promise<number | undefined>;
    getConversionRates(principal: string, address: string): Promise<ConversionRates>;
}
