import { FC } from "react";
import { AssetSelectItem } from "@/components/asset-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { Skeleton } from "@/components/ui/skeleton";

type SelectedAssetButtonInfoProps = {
    selectedToken: AssetSelectItem | undefined;
    isLoadingBalance: boolean;
};

export const SelectedAssetButtonInfo: FC<SelectedAssetButtonInfoProps> = ({
    selectedToken,
    isLoadingBalance,
}) => {
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

    return (
        <div className="flex font-normal items-center">
            <Avatar className="mr-3">
                <AvatarImage src={getTokenAvatar(selectedToken.tokenAddress)} />
                <AvatarFallback>{selectedToken.name}</AvatarFallback>
            </Avatar>
            <div id="asset-info" className="text-md text-left">
                <div>{selectedToken.name}</div>
                {selectedToken.amount && (
                    <div>
                        {isLoadingBalance ? (
                            <Skeleton className="w-[130px] h-4 mt-1" />
                        ) : (
                            `Balance ${selectedToken.amount} ${selectedToken.name}`
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
