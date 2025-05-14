export function scaleBigint(value: bigint, factor: number, decimals: number = 8): bigint {
    if (!Number.isFinite(factor)) {
        throw new Error("Factor must be a finite number.");
    }
    if (decimals < 0 || !Number.isInteger(decimals)) {
        throw new Error("Decimals must be a non-negative integer.");
    }

    // Handle negative factors safely
    const isNegative = factor < 0;
    const absFactor = Math.abs(factor);

    // Scale factor to avoid precision loss
    const scale = 10 ** decimals;
    const scaledFactor = Math.round(absFactor * scale);

    // BigInt multiplication and division
    const result = (value * BigInt(scaledFactor)) / BigInt(scale);

    return isNegative ? -result : result;
}
