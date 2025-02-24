export type ExistingConversionRate = {
    canConvert: true;
    tokenToUsd: number;
    usdToToken: number;
};

export type NonExistingConversionRate = {
    canConvert: false;
    tokenToUsd: undefined;
    usdToToken: undefined;
};

export type ConversionRates = ExistingConversionRate | NonExistingConversionRate;
