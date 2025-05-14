import React from "react";

/**
 * Formats a price string for display, handling various number sizes and formats.
 *
 * Features:
 * - Converts scientific notation to decimal format
 * - For extremely small numbers (< 0.0000001), uses subscript notation for leading zeros
 * - For regular numbers, applies appropriate decimal place formatting based on magnitude
 * - Truncates numbers with more than 7 decimal places
 *
 * @param price - The price string to format (can be in regular or scientific notation)
 * @returns A React element with the formatted price
 *
 * @example
 * // Regular numbers
 * formatPrice("123.456")       // Returns: 123.456
 * formatPrice("12.3456")       // Returns: 12.3456
 * formatPrice("1.23456789")    // Returns: 1.2345678
 *
 * // Very small numbers
 * formatPrice("0.00000005123") // Returns: 0.0₈5123
 * formatPrice("1e-10")         // Returns: 0.0₁₀1
 *
 * // Scientific notation
 * formatPrice("1.23e+3")       // Returns: 1,230
 * formatPrice("5.67e-6")       // Returns: 0.00000567
 */
export function formatPrice(price: string) {
    "worklet";

    // Convert any scientific notation to decimal format
    let decimalPrice = price;
    if (price.includes("e")) {
        // Handle scientific notation
        const [base, exponent] = price.split("e");
        const baseNum = parseFloat(base);
        const expNum = parseInt(exponent);

        if (expNum < 0) {
            // For negative exponents (very small numbers)
            const absExp = Math.abs(expNum);
            decimalPrice = "0." + "0".repeat(absExp - 1) + baseNum.toString().replace(".", "");
        } else {
            // For positive exponents (very large numbers)
            decimalPrice = baseNum * Math.pow(10, expNum) + "";
        }
    }

    const numberPrice = parseFloat(decimalPrice.replace(/,/g, ""));
    let formattedPrice: string;

    // Check if the price is an extremely small number (less than 0.0000001)
    if (numberPrice < 0.0000001) {
        // Split the string into parts before and after the decimal point
        const [wholePart, decimalPart] = decimalPrice.split(".");

        if (!decimalPart) {
            return React.createElement(React.Fragment, null, decimalPrice);
        }

        // Get the index of the first non-zero digit after the decimal point
        const nonZeroIndex = decimalPart.search(/[1-9]/);

        // If no non-zero digit is found, return the original price as a React element
        if (nonZeroIndex === -1) {
            return React.createElement(React.Fragment, null, decimalPrice);
        }

        // Only apply subscript notation if there are 8 or more leading zeros (0.0000001 or smaller)
        if (nonZeroIndex >= 7) {
            // Calculate the number of zeros to display as a subscript
            const zeroCount = nonZeroIndex;

            // Extract the significant digits (up to 3)
            const significantDigits = decimalPart.slice(nonZeroIndex, nonZeroIndex + 3);

            // Return a React element with subscript notation
            return React.createElement(
                React.Fragment,
                null,
                wholePart,
                ".",
                "0",
                React.createElement("sub", null, zeroCount),
                significantDigits,
            );
        } else {
            // If there are fewer than 8 leading zeros, don't use subscript notation
            return React.createElement(React.Fragment, null, decimalPrice);
        }
    } else {
        // For numbers >= 0.0000001 that have more than 7 decimal places, truncate to 7 decimals
        const [wholePart, decimalPart] = decimalPrice.split(".");
        if (decimalPart && decimalPart.length > 7) {
            const truncatedDecimal = decimalPart.substring(0, 7);
            formattedPrice = `${wholePart}.${truncatedDecimal}`;
            return React.createElement(React.Fragment, null, formattedPrice);
        }

        // Use decimal place formatting based on price range for other numbers
        let decimalPlaces;
        if (numberPrice > 100) {
            decimalPlaces = 3;
        } else if (numberPrice > 10) {
            decimalPlaces = 4;
        } else {
            decimalPlaces = 5;
        }

        // Use toLocaleString for regular formatting
        formattedPrice = numberPrice.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimalPlaces,
        });

        // Return formatted price as a React element
        return React.createElement(React.Fragment, null, formattedPrice);
    }
}
