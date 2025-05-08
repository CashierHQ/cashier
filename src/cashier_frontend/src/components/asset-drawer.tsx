import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { IoIosClose } from "react-icons/io";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AssetAvatar } from "./ui/asset-avatar";
import { prettyNumber } from "@/utils/helpers/number/pretty";
import { convertDecimalBigIntToNumber } from "@/utils";
import { formatPrice } from "@/utils/helpers/currency";

interface AssetDrawerProps {
    open: boolean;
    title: string;
    assetList: FungibleToken[];
    handleClose: () => void;
    handleChange: (val: string) => void;
}

// Custom token component for asset selection without navigation
const SelectableToken: React.FC<{
    token: FungibleToken;
    onSelect: (address: string) => void;
}> = ({ token, onSelect }) => {
    return (
        <article
            className="flex justify-between cursor-pointer hover:bg-gray-100 rounded-lg p-2 transition-colors"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(token.address);
            }}
        >
            <div className="flex flex-row items-center gap-2">
                <AssetAvatar src={token.logo} symbol={token.chain} className="w-9 h-9" />

                <div className="flex flex-col gap-1.5">
                    <span className="leading-4">{token.symbol}</span>

                    {token.usdConversionRate ? (
                        <span className="flex flex-row items-center text-grey text-xs font-light leading-none">
                            ${formatPrice(token.usdConversionRate.toString())}
                        </span>
                    ) : (
                        <span className="text-grey text-xs font-light leading-none">-</span>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-right leading-4">
                    {token.amount === null
                        ? "-"
                        : `${
                              token.amount
                                  ? prettyNumber(
                                        convertDecimalBigIntToNumber(token.amount, token.decimals),
                                    )
                                  : "0"
                          }`}
                </span>

                {token.usdEquivalent ? (
                    <span className="flex flex-row items-center justify-end text-grey text-xs font-light leading-none">
                        ${formatPrice(token.usdEquivalent.toString())}
                    </span>
                ) : (
                    <span className="text-right text-grey text-xs font-light leading-none">-</span>
                )}
            </div>
        </article>
    );
};

const AssetDrawer: React.FC<AssetDrawerProps> = ({
    open,
    title,
    handleClose,
    handleChange,
    assetList,
}) => {
    return (
        <Drawer open={open} onClose={handleClose}>
            <DrawerContent className="max-w-[400px] max-h-full mx-auto p-3 flex flex-col">
                <DrawerHeader>
                    <DrawerTitle className="flex justify-center">
                        <div className="text-center w-[100%]">{title}</div>
                        <IoIosClose
                            onClick={handleClose}
                            className="ml-auto cursor-pointer"
                            size={32}
                        />
                    </DrawerTitle>
                </DrawerHeader>
                <div className="font-semibold">Your asset</div>
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-4 py-4">
                        {assetList.map((token) => (
                            <SelectableToken key={token.id} token={token} onSelect={handleChange} />
                        ))}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default AssetDrawer;
