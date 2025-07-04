// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export function clampMax(value: number, max: number): number {
    return value > max ? max : value;
}

export function clampMin(value: number, min: number): number {
    return value < min ? min : value;
}

export function clamp(value: number, min: number, max: number): number {
    return clampMax(clampMin(value, min), max);
}
