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
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { CHAIN, LINK_INTENT_ASSET_LABEL, LINK_TYPE } from "@/services/types/enum";
import { useLinkAction } from "@/hooks/linkActionHook";

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
    linkId?: string;
};

export const AssetFormInput: FC<AssetFormInputProps> = ({
    index,
    form,
    onAssetSelect,
    onRemoveAsset,
    showRemoveButton,
    isAirdrop,
    linkId,
}) => {
    // Add local state for isUsd with initial value from props or default to false
    const [localIsUsd, setLocalIsUsd] = useState<boolean>(false);

    // Add local state for token amount and USD amount
    const [localTokenAmount, setLocalTokenAmount] = useState<string>("0");
    const [localUsdAmount, setLocalUsdAmount] = useState<string>("0");

    const { link } = useLinkAction();

    const { t } = useTranslation();
    const {
        getValues,
        formState: { errors },
        watch,
    } = form;
    const { getToken, getTokenPrice } = useTokens();
    const { updateUserInput, getUserInput } = useLinkCreationFormStore();

    // Get current asset data
    const asset = getValues(`assets.${index}`);
    const token = getToken(asset.tokenAddress);
    const tokenUsdPrice = token?.address ? getTokenPrice(token.address) : undefined;
    const canConvert = tokenUsdPrice !== undefined;
    const decimals = token?.decimals || 8;

    // Watch for form amount changes to sync with local state
    const formAmount = watch(`assets.${index}.amount`);
    const formTokenAddress = watch(`assets.${index}.tokenAddress`);
    const formLabel = watch(`assets.${index}.label`);

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

    // Sync with store when form values change
    useEffect(() => {
        if (linkId && token && formAmount !== undefined) {
            syncToStore();
        }
    }, [formAmount, formTokenAddress, formLabel, linkId, token]);

    // Watch for token changes to reset amounts
    useEffect(() => {
        setLocalTokenAmount("0");
        setLocalUsdAmount("0");
    }, [formTokenAddress]);

    const { setTokenAmount, setUsdAmount } = useFormActions(form, localIsUsd, index);

    // Function to sync current asset to the store
    const syncToStore = () => {
        if (!linkId) return;

        const currentInput = getUserInput(linkId);
        if (!currentInput) return;

        const formAssets = getValues("assets");
        if (!formAssets || formAssets.length === 0) return;

        // Map the current assets to the format expected by the store
        const storeAssets = formAssets.map((asset) => {
            // Ensure the label is always a string, never undefined
            let label = asset.label || "";

            if (link?.linkType === LINK_TYPE.SEND_TOKEN_BASKET) {
                label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TOKEN_BASKET_ASSET}_${asset.tokenAddress}`;
            } else if (link?.linkType === LINK_TYPE.SEND_AIRDROP) {
                label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_AIRDROP_ASSET}`;
            } else if (link?.linkType === LINK_TYPE.RECEIVE_PAYMENT) {
                label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_RECEIVE_PAYMENT_ASSET}`;
            }

            return {
                address: asset.tokenAddress,
                linkUseAmount: asset.amount,
                chain: CHAIN.IC,
                label: label,
            };
        });

        // Update the store with the latest values
        updateUserInput(linkId, {
            assets: storeAssets,
        });
    };

    // Handle amount changes
    const handleAmountChange = (value: string) => {
        if (localIsUsd) {
            setLocalUsdAmount(value);

            // Update token amount based on USD
            if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
                const tokenValue = parseFloat(value) / tokenUsdPrice;
                setLocalTokenAmount(tokenValue.toString());
                setUsdAmount(value);
            } else {
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
                    if (availableAmount > 0) {
                        const amount = availableAmount * (percentage / 100);
                        setLocalTokenAmount(amount.toFixed(decimals > 8 ? 8 : decimals));
                        setTokenAmount(amount.toFixed(decimals > 8 ? 8 : decimals));
                    }
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
