import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AssetAvatar } from "./ui/asset-avatar";
import { prettyNumber } from "@/utils/helpers/number/pretty";
import { convertDecimalBigIntToNumber } from "@/utils";
import { formatPrice } from "@/utils/helpers/currency";
import { IconInput } from "./icon-input";
import { Search, X } from "lucide-react";
interface AssetDrawerProps {
    open: boolean;
    title: string;
    assetList: FungibleToken[];
    handleClose: () => void;
    handleChange: (val: string) => void;
    showSearch?: boolean;
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
    showSearch = false,
}) => {
    const [search, setSearch] = useState("");

    const filteredAssetList = assetList.filter((token) =>
        token.symbol.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <Drawer open={open} onClose={handleClose}>
            <DrawerContent className="max-w-[400px] max-h-full mx-auto py-3 px-4 flex flex-col">
                <DrawerHeader>
                    <DrawerTitle className="flex justify-centerm items-center relative mb-2">
                        <div className="text-center w-[100%]">{title}</div>
                        <X
                            onClick={handleClose}
                            className="absolute right-0 cursor-pointer"
                            size={28}
                        />
                    </DrawerTitle>
                </DrawerHeader>
                {showSearch && (
                    <div className="mb-3">
                        <IconInput
                            icon={<Search size={20} color={"#35A18B"} />}
                            placeholder="Search assets"
                            isCurrencyInput={false}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                )}
                <div className="font-semibold">Your assets</div>
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-4 py-4">
                        {filteredAssetList.map((token) => (
                            <SelectableToken key={token.id} token={token} onSelect={handleChange} />
                        ))}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default AssetDrawer;
