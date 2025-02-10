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

    return (
        <div className="flex font-normal">
            <Avatar className="mr-3">
                <AvatarImage src={`${IC_EXPLORER_IMAGES_PATH}${selectedToken.tokenAddress}`} />
                <AvatarFallback>{selectedToken.name}</AvatarFallback>
            </Avatar>
            <div id="asset-info" className="text-md text-left">
                <div>{selectedToken.name}</div>
                <div>
                    {isLoadingBalance ? (
                        <Skeleton className="w-[130px] h-4 mt-1" />
                    ) : (
                        `Balance ${selectedToken.amount} ${selectedToken.name}`
                    )}
                </div>
            </div>
        </div>
    );
};
