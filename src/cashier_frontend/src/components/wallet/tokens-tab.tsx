import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { WalletToken } from "./token-card";
import { Link } from "react-router-dom";

const MOCK_TOKEN_DATA = [
    {
        symbol: "ckBTC",
        icon: `${IC_EXPLORER_IMAGES_PATH}mxzaz-hqaaa-aaaar-qaada-cai`,
        availableAmount: 0.5432,
        availableUsdEquivalent: 51_961.31,
        usdPerUnit: 96_216.2,
    },
    {
        symbol: "ckETH",
        icon: `${IC_EXPLORER_IMAGES_PATH}ss2fx-dyaaa-aaaar-qacoq-cai`,
        availableAmount: 4.46,
        availableUsdEquivalent: 15_986.77,
        usdPerUnit: 3_584.4,
    },
    {
        symbol: "ICP",
        icon: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
        availableAmount: 10,
        availableUsdEquivalent: 110,
        usdPerUnit: 11,
    },
    {
        symbol: "SOL",
        icon: undefined,
        availableAmount: 1,
        availableUsdEquivalent: 165,
        usdPerUnit: 165,
    },
];

const LONG_MOCK_TOKEN_DATA = [
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
];

export function WalletTokensTab() {
    return (
        <div className="flex flex-col gap-4">
            {LONG_MOCK_TOKEN_DATA.map((props, index) => (
                <WalletToken key={index} {...props} />
            ))}
            <Link to={"/wallet/manage"} className="mx-auto whitespace-nowrap text-green">
                + Manage tokens
            </Link>
        </div>
    );
}
