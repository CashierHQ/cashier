// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { FC } from "react";
import { AssetAvatarV2 } from "@/components/ui/asset-avatar";
import { transformShortAddress } from "@/utils";
import { SendAssetInfo } from "@/services/types/wallet.types";
import { useTokens } from "@/hooks/useTokens";

type ConfirmationPopupAssetsSectionProps = {
    sendAssetInfo: SendAssetInfo;
    isUsd?: boolean;
    onUsdClick?: () => void;
    onInfoClick?: () => void;
};

export const SendAssetConfirmationPopupAssetsSection: FC<ConfirmationPopupAssetsSectionProps> = ({
    sendAssetInfo,
}) => {
    const { getToken } = useTokens();
    const token = getToken(sendAssetInfo.asset.address);
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
                        <AssetAvatarV2 token={token} className="ml-1 w-5 h-5" />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <span>Network fee</span>
                    <div className="flex items-center">
                        <span>
                            {sendAssetInfo.feeAmount || "0.0001"}{" "}
                            {sendAssetInfo.feeSymbol || sendAssetInfo.asset.symbol}
                        </span>
                        <AssetAvatarV2 token={token} className="ml-1 w-5 h-5" />
                    </div>
                </div>
            </div>
        </section>
    );
};
