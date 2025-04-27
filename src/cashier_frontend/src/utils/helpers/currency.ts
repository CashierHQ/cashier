import React from "react";

export function formatPrice(price: string) {
    "worklet";
    const numberPrice = parseFloat(price.replace(/,/g, ""));
    let formattedPrice;

    // Check if the price is a super small number (less than 0.0001)
    if (parseFloat(price) < 0.00099) {
        // Split the string into parts before and after the decimal point
        const [wholePart, decimalPart] = price.split(".");

        // Get the index of the first non-zero digit after the decimal point
        const nonZeroIndex = decimalPart ? decimalPart.search(/[1-9]/) : -1;

        // If no non-zero digit is found, return the original price
        if (nonZeroIndex === -1) {
            return price;
        }

        // Calculate the number of zeros to display as a subscript
        const zeroCount = nonZeroIndex - 1; // Corrected: subtract 1 to include only trailing zeros

        // Extract the significant digits (up to 3)
        const significantDigits = decimalPart.slice(nonZeroIndex, nonZeroIndex + 3);

        // Return a React element instead of an HTML string
        return React.createElement(
            React.Fragment,
            null,
            wholePart,
            ".",
            "0",
            React.createElement("sub", null, zeroCount + 1),
            significantDigits,
        );
    } else {
        // Use decimal place formatting based on price range
        let decimalPlaces;
        if (numberPrice > 100) {
            decimalPlaces = 2;
        } else if (numberPrice > 10) {
            decimalPlaces = 3;
        } else {
            decimalPlaces = 4;
        }

        // Use toLocaleString for regular formatting
        formattedPrice = numberPrice.toLocaleString("en-US", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        });
    }

    return formattedPrice;
}
