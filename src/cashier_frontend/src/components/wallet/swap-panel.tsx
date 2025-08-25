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

import React, { useState, useEffect } from "react";
import { ChevronLeft, ArrowDownUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import AssetButton from "@/components/asset-button";
import AssetDrawer from "@/components/asset-drawer";
import { SelectedAssetButtonInfo } from "@/components/link-details/selected-asset-button-info";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { Label } from "@/components/ui/label";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

interface SwapPanelProps {
  tokenId?: string;
  onBack: () => void;
}

// Default token addresses
const ICP_ADDRESS = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const CKUSDC_ADDRESS = "xevnm-gaaaa-aaaar-qafnq-cai";

const SwapPanel: React.FC<SwapPanelProps> = ({ tokenId, onBack }) => {
  const { t } = useTranslation();

  // Token data
  const { displayTokens, getToken } = useTokensV2();

  // State for drawer and selections
  const [showFromAssetDrawer, setShowFromAssetDrawer] = useState(false);
  const [showToAssetDrawer, setShowToAssetDrawer] = useState(false);
  const [selectedFromToken, setSelectedFromToken] = useState<
    FungibleToken | undefined
  >(undefined);
  const [selectedToToken, setSelectedToToken] = useState<
    FungibleToken | undefined
  >(undefined);

  // State for amounts and USD toggle
  const [fromIsUsd, setFromIsUsd] = useState(false);
  const [toIsUsd, setToIsUsd] = useState(false);
  const [fromTokenAmount, setFromTokenAmount] = useState("");
  const [fromUsdAmount, setFromUsdAmount] = useState("");
  const [toTokenAmount, setToTokenAmount] = useState("");
  const [toUsdAmount, setToUsdAmount] = useState("");

  // Set default tokens when userTokens are loaded
  useEffect(() => {
    if (
      displayTokens &&
      displayTokens.length > 0 &&
      !selectedFromToken &&
      !selectedToToken
    ) {
      // If tokenId is provided, use it for the "from" token
      if (tokenId) {
        const token = displayTokens.find((t) => t.address === tokenId);
        if (token) {
          setSelectedFromToken(token);
          // Set ckUSDC as default "to" token if available
          const ckUsdc = displayTokens.find(
            (t) => t.address === CKUSDC_ADDRESS,
          );
          if (ckUsdc && ckUsdc.address !== tokenId) {
            setSelectedToToken(ckUsdc);
          }
          return;
        }
      }

      // Otherwise set ICP as default "from" token
      const icpToken = displayTokens.find((t) => t.address === ICP_ADDRESS);
      if (icpToken) {
        setSelectedFromToken(icpToken);
      } else if (displayTokens.length > 0) {
        // Fallback to first available token
        setSelectedFromToken(displayTokens[0]);
      }

      // Set ckUSDC as default "to" token
      const ckUsdcToken = displayTokens.find(
        (t) => t.address === CKUSDC_ADDRESS,
      );
      if (ckUsdcToken) {
        setSelectedToToken(ckUsdcToken);
      } else if (displayTokens.length > 1) {
        // Fallback to second available token
        setSelectedToToken(displayTokens[1]);
      }
    }
  }, [displayTokens, tokenId, selectedFromToken, selectedToToken]);

  // Handle token selection
  const handleFromTokenSelect = (address: string) => {
    const token = getToken(address);
    if (token) {
      setSelectedFromToken(token);
      setShowFromAssetDrawer(false);
      // Reset amounts when token changes
      setFromTokenAmount("");
      setFromUsdAmount("");
    }
  };

  const handleToTokenSelect = (address: string) => {
    const token = getToken(address);
    if (token) {
      setSelectedToToken(token);
      setShowToAssetDrawer(false);
      // Reset amounts when token changes
      setToTokenAmount("");
      setToUsdAmount("");
    }
  };

  // Handle amount changes
  const handleFromAmountChange = (value: string) => {
    if (fromIsUsd) {
      setFromUsdAmount(value);
      // Convert to token amount if we have conversion rate
      if (selectedFromToken?.usdConversionRate) {
        const tokenValue =
          parseFloat(value) / selectedFromToken.usdConversionRate;
        setFromTokenAmount(tokenValue ? tokenValue.toString() : "");
      }
    } else {
      setFromTokenAmount(value);
      // Convert to USD if we have conversion rate
      if (selectedFromToken?.usdConversionRate) {
        const usdValue =
          parseFloat(value) * selectedFromToken.usdConversionRate;
        setFromUsdAmount(usdValue ? usdValue.toString() : "");
      }
    }
  };

  const handleToAmountChange = (value: string) => {
    if (toIsUsd) {
      setToUsdAmount(value);
      // Convert to token amount if we have conversion rate
      if (selectedToToken?.usdConversionRate) {
        const tokenValue =
          parseFloat(value) / selectedToToken.usdConversionRate;
        setToTokenAmount(tokenValue ? tokenValue.toString() : "");
      }
    } else {
      setToTokenAmount(value);
      // Convert to USD if we have conversion rate
      if (selectedToToken?.usdConversionRate) {
        const usdValue = parseFloat(value) * selectedToToken.usdConversionRate;
        setToUsdAmount(usdValue ? usdValue.toString() : "");
      }
    }
  };

  return (
    <div className="w-full flex flex-col h-full">
      {/* Header - matching send-panel.tsx pattern */}
      <div className="relative flex justify-center items-center mb-4">
        <button onClick={onBack} className="absolute left-0">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">
          {t("wallet.swap.header", "Swap")}
        </h1>
      </div>

      {/* Content */}
      <div id="content" className="h-full">
        <div className="space-y-1">
          {/* You Send Section */}
          <div>
            <div className="flex w-full items-center mb-2">
              <label className="text-sm font-medium">
                {t("wallet.swap.youSend", "You Send")}
              </label>
            </div>
            <AssetButton
              handleClick={() => setShowFromAssetDrawer(true)}
              text="Select Token"
              childrenNode={
                selectedFromToken && (
                  <SelectedAssetButtonInfo selectedToken={selectedFromToken} />
                )
              }
              tokenValue={fromTokenAmount}
              usdValue={fromUsdAmount}
              onInputChange={handleFromAmountChange}
              isUsd={fromIsUsd}
              token={selectedFromToken}
              onToggleUsd={setFromIsUsd}
              canConvert={selectedFromToken?.usdConversionRate ? true : false}
              tokenDecimals={selectedFromToken?.decimals ?? 8}
              showInput={true}
            />
          </div>

          {/* Swap Icon */}
          <div className="flex justify-center">
            <button
              className="bg-lightgreen hover:bg-lightgreen/80 rounded-full p-3 transition-colors"
              onClick={() => {
                // Swap tokens
                const tempToken = selectedFromToken;
                const tempTokenAmount = fromTokenAmount;
                const tempUsdAmount = fromUsdAmount;
                const tempIsUsd = fromIsUsd;

                setSelectedFromToken(selectedToToken);
                setFromTokenAmount(toTokenAmount);
                setFromUsdAmount(toUsdAmount);
                setFromIsUsd(toIsUsd);

                setSelectedToToken(tempToken);
                setToTokenAmount(tempTokenAmount);
                setToUsdAmount(tempUsdAmount);
                setToIsUsd(tempIsUsd);
              }}
            >
              <ArrowDownUp size={20} className="text-green" />
            </button>
          </div>

          {/* You Receive Section */}
          <div>
            <div className="flex w-full items-center mb-2">
              <label className="text-sm font-medium">
                {t("wallet.swap.youReceive", "You Receive")}
              </label>
            </div>
            <AssetButton
              handleClick={() => setShowToAssetDrawer(true)}
              text="Select Token"
              childrenNode={
                selectedToToken && (
                  <SelectedAssetButtonInfo selectedToken={selectedToToken} />
                )
              }
              tokenValue={toTokenAmount}
              usdValue={toUsdAmount}
              onInputChange={handleToAmountChange}
              isUsd={toIsUsd}
              token={selectedToToken}
              onToggleUsd={setToIsUsd}
              canConvert={selectedToToken?.usdConversionRate ? true : false}
              tokenDecimals={selectedToToken?.decimals ?? 8}
              showInput={true}
            />
          </div>

          {/* Details Section */}
          <div className="pt-6">
            <div className="flex gap-2 items-center mb-2 justify-between">
              <Label>Details</Label>
            </div>
            <div className="flex flex-col border-[1px] rounded-lg border-lightgreen">
              <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                <p className="font-medium text-sm">Rate</p>
                <p className="text-sm text-primary/80">
                  1 {selectedFromToken?.symbol || "TOKEN1"} = 1{" "}
                  {selectedToToken?.symbol || "TOKEN2"}
                </p>
              </div>
              <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                <p className="font-medium text-sm">Slippage</p>
                <p className="text-sm text-primary/80">1%</p>
              </div>
              <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                <p className="font-medium text-sm">Total fees</p>
                <p className="text-sm text-primary/80">~$0.11</p>
              </div>
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-center text-gray-600 text-sm">
              {t(
                "wallet.swap.comingSoon",
                "Token swapping functionality coming soon. You will be able to exchange your tokens directly from your wallet.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Asset Drawers */}
      <AssetDrawer
        title="Select Token to Send"
        open={showFromAssetDrawer}
        handleClose={() => setShowFromAssetDrawer(false)}
        handleChange={handleFromTokenSelect}
        assetList={displayTokens}
        showSearch
      />

      <AssetDrawer
        title="Select Token to Receive"
        open={showToAssetDrawer}
        handleClose={() => setShowToAssetDrawer(false)}
        handleChange={handleToTokenSelect}
        assetList={displayTokens}
        showSearch
      />
    </div>
  );
};

SwapPanel.displayName = "SwapPanel";

export default SwapPanel;
