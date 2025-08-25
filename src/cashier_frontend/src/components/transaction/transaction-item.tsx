// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { memo } from "react";
import { IntentModel, FeeModel } from "@/services/types/intent.service.types";
import { Status } from "@/components/ui/status";
import { mapIntentsStateToStatus } from "@/utils/map/status.map";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { convert } from "@/utils/helpers/convert";
import { Avatar } from "@radix-ui/react-avatar";
import { formatDollarAmount, formatNumber } from "@/utils/helpers/currency";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { useEffect, useState } from "react";
import { FeeHelpers } from "@/services/fee.service";
import { ACTION_TYPE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

interface TransactionItemProps {
  actionType: ACTION_TYPE;
  intent: IntentModel;
  fees?: FeeModel[];
  link: LinkDetailModel;
}

// apply memo to prevent unnecessary re-renders
export const TransactionItem = memo(function TransactionItem({
  actionType,
  intent,
  fees = [],
  link,
}: TransactionItemProps) {
  const {
    assetAmount,
    assetSymbol,
    title: intentTitle,
  } = useIntentMetadata(intent, actionType);
  const [adjustedAmount, setAdjustedAmount] = useState<number | undefined>(
    assetAmount,
  );

  const { getToken, getTokenPrice } = useTokensV2();
  const token = getToken(intent.asset.address);
  const tokenUsdPrice = getTokenPrice(intent.asset.address);

  // Calculate adjusted amount by subtracting only the network fee
  useEffect(() => {
    if (assetAmount === undefined || !token) return;

    // Find the network fee for this token
    const networkFee = fees.find(
      (fee) =>
        fee.address === intent.asset.address && fee.type === "network_fee",
    );

    if (!link || !link.linkType) {
      console.error("Link or link type is undefined");
      return;
    }

    if (networkFee && token.decimals !== undefined) {
      const totalTokenAmount = FeeHelpers.forecastIcrcFeeForIntent(
        link.linkType,
        actionType,
        intent,
        token,
      );

      setAdjustedAmount(totalTokenAmount);
    } else {
      // only for create link fee
      const totalTokenAmount = FeeHelpers.forecastIcrc2Fee(
        token,
        intent.amount,
        1,
      );
      setAdjustedAmount(totalTokenAmount);
    }
  }, [assetAmount, fees, intent.asset.address, token]);

  const getDisplayAmount = () => {
    return formatNumber(adjustedAmount?.toString() || "0");
  };

  const getUsdAmount = () => {
    if (tokenUsdPrice && tokenUsdPrice > 0) {
      return formatDollarAmount(convert(adjustedAmount, tokenUsdPrice) || 0);
    }
    return "No price available";
  };

  return (
    <div className="flex items-center">
      {mapIntentsStateToStatus(intent.state) !== undefined && (
        <div className="mr-1.5">
          <Status
            key={intent.id}
            status={mapIntentsStateToStatus(intent.state)}
          />
        </div>
      )}

      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-1.5">
          <Avatar className="w-5 h-5 rounded-full overflow-hidden">
            <AssetAvatarV2
              token={token}
              className="w-full h-full object-cover"
            />
          </Avatar>
          <p className="text-[14px] font-normal flex items-center gap-2">
            {assetSymbol}
            <span className="text-grey/60 text-[10px] font-normal">
              {intentTitle.toLowerCase().includes("link creation fee")
                ? "Link creation fee"
                : ""}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            <p className="text-[14px] font-normal">{getDisplayAmount()}</p>
          </div>
          <p className="text-[10px] font-normal text-grey/50">
            {getUsdAmount()}
          </p>
        </div>
      </div>
    </div>
  );
});
