import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { CHAIN } from "@/services/types/enum";
import { ManageTokensToken } from "./manage-tokens-token";
import { ManageTokensMissingTokenMessage } from "./manage-tokens-missing-token-message";

let MOCK_TOKEN_DATA = [
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

//MOCK_TOKEN_DATA = [];

const LONG_MOCK_TOKEN_DATA = [
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
    ...MOCK_TOKEN_DATA,
];

export function ManageTokensList() {
    const isNoTokens = MOCK_TOKEN_DATA.length === 0;

    return (
        <div className="flex flex-col py-6">
            <ul className="flex flex-col gap-4">
                {isNoTokens ? (
                    <ManageTokensMissingTokenMessage />
                ) : (
                    LONG_MOCK_TOKEN_DATA.map((props, index) => (
                        <li key={index}>
                            <ManageTokensToken {...props} />
                        </li>
                    ))
                )}
            </ul>
            <p className="text-green font-medium mx-auto mt-4">+ Import token</p>
        </div>
    );
}
