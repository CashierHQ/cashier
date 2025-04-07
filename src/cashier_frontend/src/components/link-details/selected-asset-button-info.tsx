import { FC } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { FungibleToken } from "@/types/fungible-token.speculative";

type SelectedAssetButtonInfoProps = {
    selectedToken?: FungibleToken | null;
};

export const SelectedAssetButtonInfo: FC<SelectedAssetButtonInfoProps> = ({ selectedToken }) => {
    if (!selectedToken) {
        return null;
    }

    //TODO: Remove after mid milestone
    const getTokenAvatar = (tokenAddress: string) => {
        if (tokenAddress === "x5qut-viaaa-aaaar-qajda-cai") {
            return `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`;
        } else if (tokenAddress === "k64dn-7aaaa-aaaam-qcdaq-cai") {
            return `${IC_EXPLORER_IMAGES_PATH}2ouva-viaaa-aaaaq-aaamq-cai`;
        } else return `${IC_EXPLORER_IMAGES_PATH}${tokenAddress}`;
    };

    const amount = TokenUtilService.getHumanReadableAmountFromToken(
        selectedToken.amount ?? 0n,
        selectedToken,
    );

    return (
        <div className="flex font-normal items-center">
            <Avatar className="mr-3">
                <AvatarImage src={getTokenAvatar(selectedToken.address)} />
                <AvatarFallback>{selectedToken.name}</AvatarFallback>
            </Avatar>
            <div id="asset-info" className="text-md text-left">
                <div>{selectedToken.name}</div>
                {selectedToken.amount?.toString() && <div>{`Balance ${amount}`}</div>}
            </div>
        </div>
    );
};
