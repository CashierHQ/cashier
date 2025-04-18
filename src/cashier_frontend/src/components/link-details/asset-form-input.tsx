import { ChangeEvent, FC, useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { IconInput } from "@/components/icon-input";
import AssetButton from "@/components/asset-button";
import { Label } from "../ui/label";
import { UsdSwitch } from "./usd-switch";
import { SelectedAssetButtonInfo } from "./selected-asset-button-info";
import { AmountActionButtons } from "./amount-action-buttons";
import { Trash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TipLinkAssetFormSchema, useFormActions } from "./add-asset-hooks";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useTokens } from "@/hooks/useTokens";

const USD_AMOUNT_PRESETS = [1, 2, 5, 10];
const PERCENTAGE_AMOUNT_PRESETS = [25, 50, 75, 100];

type AssetFormInputProps = {
    index: number;
    fieldId: string;
    form: UseFormReturn<TipLinkAssetFormSchema>;
    availableAssets: FungibleToken[];
    onAssetSelect: (index: number) => void;
    onRemoveAsset: (index: number) => void;
    showRemoveButton: boolean;
    isAirdrop?: boolean;
};

export const AssetFormInput: FC<AssetFormInputProps> = ({
    index,
    form,
    onAssetSelect,
    onRemoveAsset,
    showRemoveButton,
    isAirdrop,
}) => {
    // Add local state for isUsd with initial value from props or default to false
    const [localIsUsd, setLocalIsUsd] = useState<boolean>(false);

    // Add local state for token amount and USD amount
    const [localTokenAmount, setLocalTokenAmount] = useState<string>("0");
    const [localUsdAmount, setLocalUsdAmount] = useState<string>("0");

    const { t } = useTranslation();
    const {
        getValues,
        formState: { errors },
        watch,
    } = form;
    const { getToken, getTokenPrice } = useTokens();

    // Get current asset data
    const asset = getValues(`assets.${index}`);
    const token = getToken(asset.tokenAddress);
    const tokenUsdPrice = token?.address ? getTokenPrice(token.address) : undefined;
    const canConvert = tokenUsdPrice !== undefined;
    const decimals = token?.decimals || 8;

    // Watch for form amount changes to sync with local state
    const formAmount = watch(`assets.${index}.amount`);

    // Sync local state with form when form amount changes
    useEffect(() => {
        if (token && formAmount !== undefined) {
            const tokenAmountNumber = Number(formAmount) / 10 ** decimals;
            setLocalTokenAmount(tokenAmountNumber.toString());

            if (canConvert && tokenUsdPrice) {
                const usdValue = tokenAmountNumber * tokenUsdPrice;
                setLocalUsdAmount(usdValue.toFixed(2));
            }
        }
    }, [formAmount, token, decimals, canConvert, tokenUsdPrice]);

    // Watch for token changes to reset amounts
    const tokenAddress = watch(`assets.${index}.tokenAddress`);
    useEffect(() => {
        setLocalTokenAmount("0");
        setLocalUsdAmount("0");
    }, [tokenAddress]);

    const { setTokenAmount, setUsdAmount } = useFormActions(form, localIsUsd, index);

    // Handle amount changes
    const handleAmountChange = (value: string) => {
        if (localIsUsd) {
            setLocalUsdAmount(value);

            // Update token amount based on USD
            if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
                const tokenValue = parseFloat(value) / tokenUsdPrice;
                setLocalTokenAmount(tokenValue.toString());
                setUsdAmount(value);
            }
        } else {
            setLocalTokenAmount(value);

            // Update USD amount based on token
            if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
                const usdValue = parseFloat(value) * tokenUsdPrice;
                setLocalUsdAmount(usdValue.toFixed(2));
                setTokenAmount(value);
            } else {
                setTokenAmount(value);
            }
        }
    };

    // Generate preset buttons for this asset
    const getPresetButtons = () => {
        if (!token) return [];

        if (localIsUsd && canConvert) {
            return USD_AMOUNT_PRESETS.map((amount) => ({
                content: `${amount} USD`,
                action: () => {
                    setLocalUsdAmount(amount.toString());
                    setUsdAmount(amount);
                },
            }));
        } else {
            return PERCENTAGE_AMOUNT_PRESETS.map((percentage) => ({
                content: `${percentage} %`,
                action: () => {
                    const availableAmount = token?.amount
                        ? Number(token.amount) / 10 ** decimals
                        : 0;
                    const amount = availableAmount * (percentage / 100);
                    setLocalTokenAmount(amount.toString());
                    setTokenAmount(amount);
                },
            }));
        }
    };

    // Handle toggling USD mode
    const handleToggleUsd = (value: boolean) => {
        setLocalIsUsd(value);
    };

    return (
        <div
            className={`mb-6 ${showRemoveButton ? "border-b border-grey/10 pb-8 last:border-b-0" : ""}`}
        >
            <div className="input-label-field-container">
                {/* Asset header with optional remove button */}
                <div className="flex justify-between items-center">
                    <Label>{isAirdrop ? `Asset per claim` : `${t("create.asset")}`}</Label>
                    {showRemoveButton && (
                        <button
                            className="text-destructive hover:bg-destructive/10 rounded-full p-1"
                            onClick={() => onRemoveAsset(index)}
                        >
                            <Trash size={19} />
                        </button>
                    )}
                </div>

                {/* Asset selector */}
                <div className="mb-4">
                    <AssetButton
                        handleClick={() => onAssetSelect(index)}
                        text="Choose Asset"
                        childrenNode={<SelectedAssetButtonInfo selectedToken={token} />}
                    />
                </div>
            </div>

            {/* Amount input section */}
            <div className="input-label-field-container">
                <div className="flex justify-between items-center">
                    <Label>{isAirdrop ? "Amount per claim" : t("create.amount")}</Label>
                    {token && (
                        <UsdSwitch
                            token={token}
                            amount={parseFloat(localTokenAmount) || 0}
                            symbol={token?.name ?? ""}
                            isUsd={localIsUsd}
                            onToggle={handleToggleUsd}
                            canConvert={canConvert}
                            tokenDecimals={decimals}
                            usdDecimals={2}
                        />
                    )}
                </div>
                <IconInput
                    type="number"
                    step="any"
                    isCurrencyInput={true}
                    currencySymbol={localIsUsd ? "USD" : token?.name || ""}
                    value={localIsUsd ? localUsdAmount : localTokenAmount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        handleAmountChange(e.target.value);
                    }}
                    placeholder={isAirdrop ? "Enter amount per claim" : "Enter amount"}
                />
                {errors.assets?.[index]?.amount && (
                    <div className="text-destructive text-sm mt-1">
                        {errors.assets[index]?.amount?.message}
                    </div>
                )}
                {token && (
                    <AmountActionButtons
                        data={getPresetButtons().map((button) => ({
                            content: button.content,
                            action: button.action,
                        }))}
                        isDisabled={token.amount === 0n}
                    />
                )}
            </div>
        </div>
    );
};
