import { FC } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { FungibleToken } from "@/types/fungible-token.speculative";

type SelectedAssetButtonInfoProps = {
    selectedToken?: FungibleToken | null;
};

export const SelectedAssetButtonInfo: FC<SelectedAssetButtonInfoProps> = ({ selectedToken }) => {
    if (!selectedToken) {
        return null;
    }

    const amount = TokenUtilService.getHumanReadableAmountFromToken(
        selectedToken.amount ?? 0n,
        selectedToken,
    );

    return (
        <div className="flex font-normal items-center">
            <Avatar className="mr-2">
                <AvatarImage src={selectedToken.logo} />
                <AvatarFallback>{selectedToken.name}</AvatarFallback>
            </Avatar>
            <div id="asset-info" className="text-left flex flex-col gap-1 leading-none">
                <div className="text-[16px]">{selectedToken.name}</div>
                {selectedToken.amount?.toString() && (
                    <div className="text-[10px]">{`Balance ${amount} ${selectedToken.symbol}`}</div>
                )}
            </div>
        </div>
    );
};
