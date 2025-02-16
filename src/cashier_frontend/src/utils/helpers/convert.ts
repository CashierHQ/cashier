export function convert(amount: number | undefined, rate: number | undefined) {
    if (amount === undefined || rate === undefined) return undefined;

    return amount * rate;
}
