// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { formatDollarAmount } from "@/utils/helpers/currency";
import { FeeHelpers } from "@/services/fee.service";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { DEFAULT_CREATION_FEE } from "@/services/fee.constants";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

// Helper method to calculate the display amount for fees
const calculateFeeDisplayAmount = (
  token: FungibleToken,
  feeName: string,
  feeAmount: string,
): string => {
  if (feeName.toLowerCase().includes("link creation fee")) {
    const linkCreationFee = FeeHelpers.forcastLinkCreationFee(
      token,
      BigInt(DEFAULT_CREATION_FEE),
    );
    console.log("linkCreationFee:", linkCreationFee);
    return linkCreationFee.toString();
  }
  return feeAmount;
};

type FeeBreakdownDrawerProps = {
  open?: boolean;
  onClose?: () => void;
  totalFees: number;
  feesBreakdown: {
    name: string;
    amount: string;
    tokenSymbol: string;
    tokenAddress: string;
    usdAmount?: string;
  }[];
};

export const FeeBreakdownDrawer: FC<FeeBreakdownDrawerProps> = ({
  open,
  onClose,
  totalFees,
  feesBreakdown,
}) => {
  const { getToken } = useTokensV2();
  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose?.();
        }
      }}
    >
      <DrawerContent className="max-w-[400px] mx-auto p-3">
        <DrawerHeader>
          <DrawerTitle className="flex relative justify-center items-center">
            <div className="text-center w-[100%] text-[18px] font-semibold">
              Total fees breakdown
            </div>
            <X
              onClick={onClose}
              strokeWidth={1.5}
              className="ml-auto cursor-pointer absolute right-0"
              size={28}
            />
          </DrawerTitle>
        </DrawerHeader>

        <div className="mt-2 light-borders-green px-4 py-4 flex flex-col gap-4">
          {feesBreakdown
            .sort((a, b) => {
              return (a.tokenAddress ?? "").localeCompare(b.tokenAddress ?? "");
            })
            .map((fee, index) => {
              const token = getToken(fee.tokenAddress);
              return (
                <div key={index} className="">
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] font-normal">{fee.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-normal">
                          {calculateFeeDisplayAmount(
                            token!,
                            fee.name,
                            fee.amount,
                          )}{" "}
                          {fee.tokenSymbol}
                        </span>
                        <AssetAvatarV2
                          token={token}
                          className="w-5 h-5 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <p className="text-[10px] font-normal text-grey/50">
                      {formatDollarAmount(Number(fee.usdAmount))}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="mt-2 light-borders-green px-4 py-4 mb-2 flex flex-col">
          {" "}
          <div className="flex justify-between items-center">
            <span className="text-[14px] font-normal">Total fees</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[14px] font-normal">
                  {(() => {
                    const uniqueTokens = new Set(
                      feesBreakdown.map((fee) => fee.tokenSymbol),
                    );
                    return uniqueTokens.size > 1
                      ? "Multiple tokens"
                      : feesBreakdown.length > 0
                        ? feesBreakdown[0].tokenSymbol
                        : "";
                  })()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <p className="text-[10px] font-normal text-grey/50">
              {totalFees === 0 ? "-" : formatDollarAmount(totalFees)}
            </p>
          </div>
        </div>

        <Button className="mt-6 mx-auto w-[95%] my-2" onClick={onClose}>
          Close
        </Button>
      </DrawerContent>
    </Drawer>
  );
};
