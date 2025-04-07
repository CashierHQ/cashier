import { FC } from "react";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { transformShortAddress } from "@/utils";
import { SendAssetInfo } from "@/services/types/wallet.types";

type ConfirmationPopupAssetsSectionProps = {
    sendAssetInfo: SendAssetInfo;
    isUsd?: boolean;
    onUsdClick?: () => void;
    onInfoClick?: () => void;
};

export const SendAssetConfirmationPopupAssetsSection: FC<ConfirmationPopupAssetsSectionProps> = ({
    sendAssetInfo,
}) => {
    return (
        <section id="confirmation-popup-section-send" className="my-3">
            <div className="flex flex-col gap-3 border-solid border-inherit border-[1px] rounded-xl mt-1 p-4 overflow-y-auto max-h-[200px]">
                <div className="flex justify-between items-center">
                    <span>To</span>
                    <span>{transformShortAddress(sendAssetInfo.destinationAddress)}</span>
                </div>

                <div className="h-[1px] w-full bg-gray-200"></div>

                <div className="flex justify-between items-center">
                    <span>Network</span>
                    <div className="flex items-center">
                        <span>{sendAssetInfo.asset.chain}</span>
                        <AssetAvatar
                            className="ml-1 w-5 h-5"
                            src={"./icpLogo.png"}
                            symbol={sendAssetInfo.asset.symbol}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <span>Network fee</span>
                    <div className="flex items-center">
                        <span>
                            {sendAssetInfo.feeAmount || "0.0001"}{" "}
                            {sendAssetInfo.feeSymbol || sendAssetInfo.asset.symbol}
                        </span>
                        <AssetAvatar
                            className="ml-1 w-5 h-5"
                            src={"./icpLogo.png"}
                            symbol={sendAssetInfo.asset.symbol}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};
