export function prettyNumber(num: number) {
    const [whole, decimal] = num.toString().split(".");

    let prettyWhole = "";

    for (let i = 0; i < whole.length; i++) {
        const char = whole[whole.length - 1 - i];

        if (i % 3 === 0 && i !== 0) {
            prettyWhole = "," + prettyWhole;
        }

        prettyWhole = char + prettyWhole;
    }

    const prettyDecimal = decimal;

    if (prettyDecimal === undefined) {
        return prettyWhole;
    } else {
        return prettyWhole + "." + prettyDecimal;
    }
}
