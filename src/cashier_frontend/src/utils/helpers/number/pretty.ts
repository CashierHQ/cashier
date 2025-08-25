// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

function getPrettyWhole(whole: string, separator: string) {
  let prettyWhole = "";

  for (let i = 0; i < whole.length; i++) {
    const char = whole[whole.length - 1 - i];

    if (i % 3 === 0 && i !== 0) {
      prettyWhole = separator + prettyWhole;
    }

    prettyWhole = char + prettyWhole;
  }

  return prettyWhole;
}

function getPrettyDecimal(
  decimal: string | undefined,
  maxDigits: number | undefined,
  wantPad: boolean,
) {
  let prettyDecimal = decimal ?? "";

  if (maxDigits !== undefined) {
    prettyDecimal = prettyDecimal.slice(0, maxDigits);

    if (wantPad) {
      prettyDecimal = prettyDecimal.padEnd(maxDigits, "0");
    }
  }

  return prettyDecimal;
}

function buildPrettyNumber(whole: string, decimal: string, separator: string) {
  if (!decimal) {
    return whole;
  } else {
    return whole + separator + decimal;
  }
}

type PrettyNumberOptions = {
  decimals?: number; // number of decimals after comm
  pad?: boolean; // if true, pad decimal part with 0s
  decimalSeparator?: string; // separator between whole and decimal parts, '.' by default.
  readabilitySeparator?: string; // separator between hundreds, thousands, millions and so on. ' ' by default.
};

export function prettyNumber(num: number, options: PrettyNumberOptions = {}) {
  const {
    decimals: maxDecimalDigits,
    pad: wantPad = false,
    decimalSeparator = ".",
    readabilitySeparator = ",",
  } = options;

  const [whole, decimal] = num.toString().split(".");
  const prettyWhole = getPrettyWhole(whole, readabilitySeparator);
  const prettyDecimal = getPrettyDecimal(decimal, maxDecimalDigits, wantPad);

  return buildPrettyNumber(prettyWhole, prettyDecimal, decimalSeparator);
}
