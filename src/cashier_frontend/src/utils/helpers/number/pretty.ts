// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

type PrettyNumberOptions = {
  decimals?: number;
  pad?: boolean;
  decimalSeparator?: string;
  readabilitySeparator?: string;
};

export function prettyNumber(num: number, options: PrettyNumberOptions = {}) {
  const {
    decimals: maxDecimalDigits,
    pad: wantPad = false,
    decimalSeparator = ".",
    readabilitySeparator = ",",
  } = options;

  // Truncate decimal places via string slicing to avoid floating-point rounding
  let value = num;
  if (maxDecimalDigits !== undefined) {
    const [intPart, fracPart = ""] = String(Math.abs(num)).split(".");
    const truncated = fracPart ? `${intPart}.${fracPart.slice(0, maxDecimalDigits)}` : intPart;
    value = num < 0 ? -Number(truncated) : Number(truncated);
  }

  const formatter = new Intl.NumberFormat("en-US", {
    useGrouping: true,
    minimumFractionDigits: wantPad ? (maxDecimalDigits ?? 0) : 0,
    maximumFractionDigits: maxDecimalDigits ?? 20,
  });

  let result = formatter.format(value);

  // Replace default separators if custom ones provided
  if (readabilitySeparator !== ",") {
    result = result.replace(/,/g, readabilitySeparator);
  }
  if (decimalSeparator !== ".") {
    result = result.replace(".", decimalSeparator);
  }

  return result;
}
