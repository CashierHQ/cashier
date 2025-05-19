// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Formats a price string for display, handling various number sizes and formats.
 *
 * Features:
 * - Converts scientific notation to decimal format
 * - For extremely small numbers (<= 0.0000001), uses subscript notation for leading zeros (e.g., 0.0₁₀1)
 * - For regular numbers, applies appropriate decimal place formatting based on magnitude
 * - Preserves small numbers like 0.0000009 without rounding to zero
 * - Adds thousands separators (commas) for large numbers
 *
 * @param price - The price string to format (can be in regular or scientific notation)
 * @returns A formatted price string
 *
 * @example
 * // Regular numbers
 * formatNumber("123.456")       // Returns: "123.456"
 * formatNumber("12.3456")       // Returns: "12.3456"
 * formatNumber("1.23456789")    // Returns: "1.2345678"
 *
 * // Large numbers
 * formatNumber("100000000")     // Returns: "100,000,000"
 * formatNumber("1234567.89")    // Returns: "1,234,567.89"
 * formatNumber("1e8")           // Returns: "100,000,000"
 *
 * // Very small numbers
 * formatNumber("0.00000005123") // Returns: "0.0₈5123"
 * formatNumber("1e-10")         // Returns: "0.0₁₀1"
 * formatNumber("1e-7")          // Returns: "0.0₇1"
 * formatNumber("8.7e-7")        // Returns: "0.0₆87"
 * formatNumber("0.0000009")     // Returns: "0.0000009"
 */
export function formatNumber(price: string): string {
    // Convert any scientific notation to decimal format
    let decimalPrice = price;
    let wasScientificNotation = false;
    let scientificExponent: number | null = null;

    if (price.includes("e")) {
        wasScientificNotation = true;
        // Handle scientific notation
        const [base, exponent] = price.split("e");
        const baseNum = parseFloat(base);
        const expNum = parseInt(exponent);
        scientificExponent = expNum;

        if (expNum < 0) {
            // For negative exponents (very small numbers)
            const absExp = Math.abs(expNum);
            // Handle decimal points in the base number correctly
            const baseStr = baseNum.toString();
            const baseWithoutDot = baseStr.replace(".", "");
            const significantDigits = baseWithoutDot.padStart(baseWithoutDot.length, "0");
            decimalPrice = "0." + "0".repeat(absExp - 1) + significantDigits;
        } else {
            // For positive exponents (very large numbers)
            decimalPrice = baseNum * Math.pow(10, expNum) + "";
        }
    }

    const numberPrice = parseFloat(decimalPrice.replace(/,/g, ""));
    let formattedPrice: string;

    // Special case: if number is very close to zero but not exactly zero
    if (numberPrice > 0 && numberPrice < 1e-10) {
        // Just use scientific notation for extreme cases
        return numberPrice.toExponential(2);
    }

    // For small numbers below threshold, use subscript notation
    // Scientific notation values like 8.7e-7 should always use subscript format
    if (
        numberPrice <= 0.0000001 ||
        (wasScientificNotation && scientificExponent !== null && scientificExponent <= -6)
    ) {
        // Split the string into parts before and after the decimal point
        const [wholePart, decimalPart] = decimalPrice.split(".");

        if (!decimalPart) {
            return decimalPrice;
        }

        // Get the index of the first non-zero digit after the decimal point
        const nonZeroIndex = decimalPart.search(/[1-9]/);

        // If no non-zero digit is found, return the original price
        if (nonZeroIndex === -1) {
            return decimalPrice;
        }

        // Always apply subscript notation for scientific notation with small exponents
        if (
            nonZeroIndex >= 6 ||
            (wasScientificNotation && scientificExponent !== null && scientificExponent <= -6)
        ) {
            // Calculate the number of zeros
            const zeroCount = nonZeroIndex;

            // Convert the zero count to subscript digits
            const subscriptDigits = convertToSubscript(zeroCount.toString());

            // Extract the significant digits
            const significantDigits = decimalPart.slice(nonZeroIndex);

            // Truncate significant digits to 7 places
            const truncatedSignificantDigits =
                significantDigits.length > 7
                    ? significantDigits.substring(0, 7)
                    : significantDigits;

            // Return with subscript notation for zeros
            return `${wholePart}.0${subscriptDigits}${truncatedSignificantDigits}`;
        } else {
            // If there are fewer than 6 leading zeros, don't use subscript notation
            // But still truncate to 7 decimal places if needed
            if (decimalPart.length > 7) {
                const truncatedDecimal = decimalPart.substring(0, 7);
                return `${wholePart}.${truncatedDecimal}`;
            }
            return decimalPrice;
        }
    }
    // Small but visible numbers between 0.0000001 and 0.001
    else if (numberPrice > 0.0000001 && numberPrice < 0.001) {
        // Truncate to 7 decimal places if needed
        const [wholePart, decimalPart] = decimalPrice.split(".");
        if (decimalPart && decimalPart.length > 7) {
            const truncatedDecimal = decimalPart.substring(0, 7);
            return `${wholePart}.${truncatedDecimal}`;
        }
        return decimalPrice;
    } else {
        // For numbers >= 0.001 that have more than 7 decimal places, truncate to 7 decimals
        const [wholePart, decimalPart] = decimalPrice.split(".");
        if (decimalPart && decimalPart.length > 7) {
            const truncatedDecimal = decimalPart.substring(0, 7);
            formattedPrice = `${wholePart}.${truncatedDecimal}`;
            return formattedPrice;
        }

        // Use decimal place formatting based on price range for other numbers
        let decimalPlaces;
        if (numberPrice > 100) {
            decimalPlaces = 3;
        } else if (numberPrice > 10) {
            decimalPlaces = 4;
        } else if (numberPrice > 0.001) {
            decimalPlaces = 5;
        } else {
            // For very small but visible numbers, use more decimal places
            decimalPlaces = 7;
        }

        // Use toLocaleString for regular formatting
        formattedPrice = numberPrice.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimalPlaces,
        });

        // Return formatted price as a string
        return formattedPrice;
    }
}

/**
 * Converts normal digits to their subscript equivalents
 * @param digits - The string of digits to convert
 * @returns A string of subscript digits
 */
function convertToSubscript(digits: string): string {
    const subscriptMap: { [key: string]: string } = {
        "0": "₀",
        "1": "₁",
        "2": "₂",
        "3": "₃",
        "4": "₄",
        "5": "₅",
        "6": "₆",
        "7": "₇",
        "8": "₈",
        "9": "₉",
    };

    return digits
        .split("")
        .map((digit) => subscriptMap[digit] || digit)
        .join("");
}
