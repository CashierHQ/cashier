import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { CHAIN } from "@/services/types/enum";
import { ManageTokensToken } from "./token-card";

const MOCK_TOKEN_DATA = [
    {
        name: "Bitcoin",
        symbol: "ckBTC",
        src: `${IC_EXPLORER_IMAGES_PATH}mxzaz-hqaaa-aaaar-qaada-cai`,
        chainSrc: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
        chainSymbol: CHAIN.IC,
    },
    {
        name: "Etherium",
        symbol: "ckETH",
        src: `${IC_EXPLORER_IMAGES_PATH}ss2fx-dyaaa-aaaar-qacoq-cai`,
        chainSrc: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
    },
    {
        symbol: "ICP",
        src: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
        chainSrc: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
        chainSymbol: CHAIN.IC,
    },
    {
        name: "Solana",
        symbol: "SOL",
        src: undefined,
        chainSrc: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
        chainSymbol: CHAIN.IC,
    },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LONG_MOCK_TOKEN_DATA = [
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
];

export function ManageTokensList() {
    return (
        <ul className="flex flex-col gap-4">
            {MOCK_TOKEN_DATA.map((props, index) => (
                <li key={index}>
                    <ManageTokensToken {...props} />
                </li>
            ))}
        </ul>
    );
}
