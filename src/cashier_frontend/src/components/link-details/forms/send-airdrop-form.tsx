// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useState, useEffect, useMemo } from "react";
import { useFieldArray } from "react-hook-form";
import AssetDrawer from "@/components/asset-drawer";
import { useTranslation } from "react-i18next";
import { AssetFormSkeleton } from "../asset-form-skeleton";
import { useAddAssetForm } from "../add-asset-hooks";
import { useTokens } from "@/hooks/useTokens";
import {
    useLinkCreationFormStore,
    UserInputAsset,
    UserInputItem,
} from "@/stores/linkCreationFormStore";
import {
    CHAIN,
    getAssetLabelForLinkType,
    LINK_INTENT_ASSET_LABEL,
    LINK_TYPE,
} from "@/services/types/enum";
import { Plus, Minus } from "lucide-react";
import { AssetFormInput } from "../asset-form-input";
import { useLinkAction } from "@/hooks/useLinkAction";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { stateToStepIndex } from "@/pages/edit/[id]";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { formatNumber } from "@/utils/helpers/currency";
import { useDeviceSize } from "@/hooks/responsive-hook";
import { Separator } from "../../ui/separator";
import { MessageBanner } from "../../ui/message-banner";
import {
    createAssetSelectHandler,
    createTokenAddressHandler,
    createRemoveAssetHandler,
    validateFormAssets,
    calculateTotalFeesForAssets,
    formatAssetsForSubmission,
} from "../form-handlers";

interface SendAirdropFormProps {
    initialValues?: {
        assets: {
            tokenAddress: string;
            amount: bigint;
            label: string | LINK_INTENT_ASSET_LABEL | undefined;
            chain: CHAIN | undefined;
        }[];
    };
}

export const SendAirdropForm = ({ initialValues: propInitialValues }: SendAirdropFormProps) => {
    const { t } = useTranslation();
    const { link, isUpdating, callLinkStateMachine } = useLinkAction();
    const { userInputs, getUserInput, updateUserInput, setButtonState } =
        useLinkCreationFormStore();
    const { setStep } = useMultiStepFormContext();
    const responsive = useDeviceSize();

    const { getToken } = useTokens();

    // State for asset drawer
    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);
    const [editingAssetIndex, setEditingAssetIndex] = useState<number>(-1);
    const [selectedAssetAddresses, setSelectedAssetAddresses] = useState<string[]>([]);
    const [notEnoughBalanceErrorToken, setNotEnoughBalanceErrorToken] = useState<string | null>(
        null,
    );
    const [showNotEnoughClaimsError, setShowNotEnoughClaimsError] = useState<boolean>(false);

    // Get current input and link type from store
    const currentInput = link?.id ? getUserInput(link.id) : undefined;

    // maxUse - initialize based on link data if available, otherwise use defaults
    const [maxActionNumber, setMaxActionNumber] = useState<number>(() => {
        if (link?.maxActionNumber) {
            return Number(link.maxActionNumber);
        }

        if (link?.maxActionNumber) return Number(link?.maxActionNumber);
        else {
            return 1;
        }
    });

    useEffect(() => {
        if (!link) return;

        if (link.maxActionNumber > 0) {
            setMaxActionNumber(Number(link.maxActionNumber));
        }
    }, [link]);

    // Get tokens data
    const {
        isLoading: isLoadingTokens,
        getTokenPrice,
        getDisplayTokens,
        createTokenMap,
    } = useTokens();
    const allAvailableTokens = getDisplayTokens();

    useEffect(() => {
        if (!link) {
            return;
        }
        const currentInput = getUserInput(link?.id);
        if (currentInput) {
            console.log("currentInput", currentInput);
        }
    }, [userInputs]);

    // Use prop initialValues if provided, otherwise generate from current input
    let initialValues = propInitialValues;

    // If no prop initialValues are provided, fall back to the old initialization method
    if (!initialValues) {
        initialValues = getInitialFormValues(currentInput);
    }

    const form = useAddAssetForm(allAvailableTokens || [], initialValues);

    const {
        getValues,
        setValue,
        watch,
        control,
        formState: { errors },
    } = form;

    // Set up field array for managing multiple assets
    const assetFields = useFieldArray({
        control,
        name: "assets",
    });

    useEffect(() => {
        console.log("link", link);
        if (link?.id && link?.maxActionNumber) {
            setMaxActionNumber(Number(link.maxActionNumber));
        }
    }, [link]);

    useEffect(() => {
        if (link?.id) {
            updateUserInput(link?.id, {
                maxActionNumber: BigInt(maxActionNumber),
            });
        }
    }, [maxActionNumber, link?.id]);

    // Handle decreasing the maxActionNumber
    const handleDecreaseMaxUse = () => {
        if (maxActionNumber <= 1) return;
        const newValue = maxActionNumber - 1;
        setMaxActionNumber(newValue);
        if (link?.id) {
            updateUserInput(link.id, {
                maxActionNumber: BigInt(newValue),
            });
        }
    };

    // Handle increasing the maxActionNumber
    const handleIncreaseMaxUse = () => {
        const newValue = maxActionNumber + 1;
        setMaxActionNumber(newValue);
        if (link?.id) {
            updateUserInput(link.id, {
                maxActionNumber: BigInt(newValue),
            });
        }
    };

    // Handle direct input change for maxActionNumber
    const handleMaxUseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow empty input temporarily
        if (e.target.value === "") {
            // Just update component state but don't update store yet
            setMaxActionNumber(0);
            return;
        }

        // Remove leading zeros (except for lone zero)
        const sanitizedValue = e.target.value.replace(/^0+(?=\d)/, "");

        // Convert to number and ensure it's an integer for BigInt conversion
        const parsedValue = Number(sanitizedValue);
        const intValue = Math.floor(parsedValue); // Use floor to truncate decimal part

        // Only update store if value is valid (≥ 1)
        if (intValue < 1) return;

        setMaxActionNumber(intValue);
        if (link?.id) {
            updateUserInput(link.id, {
                maxActionNumber: BigInt(intValue),
            });
        }
    };

    // Update selected asset addresses when form values change
    useEffect(() => {
        const assets = getValues("assets");
        if (assets) {
            const addresses = assets
                .map((asset) => asset.tokenAddress)
                .filter((address) => address);
            setSelectedAssetAddresses(addresses);
        }
    }, [watch("assets"), getValues]);

    // Use assetFields.fields.length as dependency instead of the entire assetFields object
    // and add a check to prevent unnecessary updates
    useEffect(() => {
        if (link?.id) {
            const input = getUserInput(link.id);
            const formAssets = getValues("assets");

            // Only update if we have both input and form assets
            if (input && input.assets && formAssets && formAssets.length > 0) {
                // Don't update if they match in length to avoid unnecessary rerenders
                if (input.assets.length !== formAssets.length) {
                    // Map the current form values to the store
                    const storeAssets = formAssets.map((asset) => {
                        // Create a properly formatted asset for the store
                        return {
                            address: asset.tokenAddress,
                            linkUseAmount: asset.amount,
                            chain: asset.chain || CHAIN.IC,
                            label: asset.label || "",
                            usdEquivalent: 0,
                            usdConversionRate: getTokenPrice(asset.tokenAddress) || 0,
                        };
                    });

                    updateUserInput(link.id, {
                        assets: storeAssets,
                    });
                }
            }
        }
    }, [assetFields.fields.length, link?.id]);

    // Initialize form with first asset if none exists
    useEffect(() => {
        if (allAvailableTokens?.length > 0 && link && assetFields.fields.length === 0) {
            initializeFirstAsset();
        }
    }, [allAvailableTokens, link]);

    useEffect(() => {
        console.log("errors ", errors);
    }, [errors]);

    // Filtered list of available tokens for the asset drawer
    const availableTokensForDrawer = useMemo(() => {
        return getAvailableTokensForDrawer();
    }, [allAvailableTokens, selectedAssetAddresses, editingAssetIndex, getValues]);

    // Event handlers using centralized handlers
    const handleAssetSelect = createAssetSelectHandler(setEditingAssetIndex, setShowAssetDrawer);

    const handleSetTokenAddress = createTokenAddressHandler(
        editingAssetIndex,
        link || null,
        setValue,
        selectedAssetAddresses,
        setSelectedAssetAddresses,
        setShowAssetDrawer,
    );

    const handleRemoveAsset = createRemoveAssetHandler(
        getValues,
        setSelectedAssetAddresses,
        assetFields,
    );

    const handleSubmit = async () => {
        setNotEnoughBalanceErrorToken(null);
        setShowNotEnoughClaimsError(false);
        if (!link?.id) throw new Error("Link ID not found");

        const formAssets = getValues("assets");
        if (!formAssets || formAssets.length === 0) throw new Error("No assets found");

        const tokenMap = createTokenMap();

        // Use the centralized handler to check for insufficient balance
        const insufficientToken = calculateTotalFeesForAssets(
            formAssets,
            tokenMap,
            maxActionNumber,
        );
        if (insufficientToken) {
            setNotEnoughBalanceErrorToken(insufficientToken);
            return;
        }

        if (maxActionNumber <= 0) {
            setShowNotEnoughClaimsError(true);
            return;
        }

        if (
            validateFormAssets(formAssets, allAvailableTokens, t, {
                isAirdrop: true,
                maxActionNumber,
            })
        ) {
            // Format assets with correct labels using the centralized handler
            const formattedAssets = formatAssetsForSubmission(formAssets, link);

            // Update the store with the formatted assets
            const storeAssets = formattedAssets.map((asset) => {
                return {
                    address: asset.tokenAddress,
                    linkUseAmount: asset.amount,
                    chain: asset.chain!,
                    label: asset.label!,
                    usdEquivalent: 0,
                    usdConversionRate: getTokenPrice(asset.tokenAddress) || 0,
                };
            });

            updateUserInput(link.id, {
                assets: storeAssets,
                maxActionNumber: BigInt(maxActionNumber),
            });

            const input = getUserInput(link.id);

            if (!input) throw new Error("Input not found");

            console.log("Submitting form with input:", input);

            const stateMachineResponse = await callLinkStateMachine({
                linkId: link.id,
                linkModel: input,
                isContinue: true,
            });

            const stepIndex = stateToStepIndex(stateMachineResponse.state);

            setStep(stepIndex);
        }
    };

    // Update button state whenever form validity changes
    useEffect(() => {
        setButtonState({
            label: t("continue"),
            isDisabled: isUpdating,
            action: handleSubmit,
        });
    }, [
        userInputs,
        errors,
        isUpdating,
        assetFields.fields.length, // Track array length changes
        ...assetFields.fields.map((field, index) => watch(`assets.${index}.amount`)), // Track all amount changes
        ...assetFields.fields.map((field, index) => watch(`assets.${index}.tokenAddress`)), // Track all tokenAddress changes
    ]);

    // Helper functions
    function getInitialFormValues(input: Partial<UserInputItem> | undefined) {
        if (!input?.assets || input.assets.length === 0) {
            // If link has assets but no user input, check if we have link data directly
            if (link?.asset_info && link.asset_info.length > 0) {
                return {
                    assets: link.asset_info.map((asset) => {
                        return {
                            tokenAddress: asset.address,
                            amount: asset.amountPerUse,
                            label: asset.label,
                            chain: asset.chain,
                        };
                    }),
                };
            }
            return undefined;
        }

        return {
            assets: input.assets.map((asset) => ({
                tokenAddress: asset.address,
                amount: asset.linkUseAmount,
                label: asset.label,
                chain: asset.chain,
            })),
        };
    }

    function initializeFirstAsset() {
        // If there are already assets loaded, don't initialize new ones
        const existingAssets = getValues("assets");
        if (existingAssets && existingAssets.length > 0) {
            console.log("Assets already initialized, skipping:", existingAssets);
            return;
        }

        if (!allAvailableTokens?.length || !link || !link.linkType) return;

        // Check if link already has assets we can use instead of default values
        if (link.asset_info && link.asset_info.length > 0) {
            const firstAsset = link.asset_info[0];
            let label: string = getAssetLabelForLinkType(link.linkType, firstAsset.address);

            if (label == LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TOKEN_BASKET_ASSET) {
                label =
                    LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TIP_ASSET + "_" + firstAsset.address;
            }

            // Use linkUseAmount directly for the form input (this is the per-claim amount)
            const amount = firstAsset.amountPerUse || firstAsset.amountPerUse;

            assetFields.append({
                tokenAddress: firstAsset.address,
                amount: amount,
                label: label,
                chain: firstAsset.chain,
            });

            setSelectedAssetAddresses([firstAsset.address]);
            return;
        }

        // If no existing assets, create a default one
        const firstToken = allAvailableTokens[0];
        const label = getAssetLabelForLinkType(link.linkType, firstToken.address);

        assetFields.append({
            tokenAddress: firstToken.address,
            amount: BigInt(0),
            label,
            chain: CHAIN.IC,
        });

        setSelectedAssetAddresses([firstToken.address]);

        // Create initial asset with proper typing
        const initialAsset: UserInputAsset = {
            address: firstToken.address,
            linkUseAmount: BigInt(0), // This is the per-claim amount
            usdEquivalent: 0,
            usdConversionRate: getTokenPrice(firstToken.address) || 0,
            chain: CHAIN.IC,
            label,
        };

        updateUserInput(link.id, {
            assets: [initialAsset],
        });
    }

    function getAvailableTokensForDrawer() {
        if (!allAvailableTokens) return [];

        if (editingAssetIndex >= 0) {
            const currentAsset = getValues(`assets.${editingAssetIndex}`);
            const currentTokenAddress = currentAsset?.tokenAddress;

            return allAvailableTokens.filter((token) => {
                if (token.address === currentTokenAddress) return true;
                return !selectedAssetAddresses.includes(token.address);
            });
        }

        return allAvailableTokens.filter(
            (token) => !selectedAssetAddresses.includes(token.address),
        );
    }

    if (
        isLoadingTokens ||
        !allAvailableTokens ||
        allAvailableTokens.length === 0 ||
        !initialValues
    ) {
        return <AssetFormSkeleton />;
    }

    return (
        <div>
            <div>
                <div
                    className={`overflow-y-auto ${responsive.isSmallDevice ? "max-h-[calc(100dvh-150px)]" : "max-h-[calc(100vh-250px)]"}`}
                    style={{
                        WebkitOverflowScrolling: "touch",
                        overscrollBehavior: "contain",
                        paddingBottom: "0px",
                    }}
                >
                    {notEnoughBalanceErrorToken && (
                        <MessageBanner
                            variant="info"
                            text={`${t("create.errors.not_enough_balance")} ${notEnoughBalanceErrorToken}`}
                            className="mb-2"
                        />
                    )}
                    {assetFields.fields.map((field, index) => (
                        <div
                            key={field.id}
                            className={`${index !== assetFields.fields.length - 1 ? "" : "mb-10"}`}
                        >
                            <AssetFormInput
                                key={field.id}
                                fieldId={field.id}
                                index={index}
                                form={form}
                                availableAssets={allAvailableTokens}
                                onAssetSelect={handleAssetSelect}
                                onRemoveAsset={handleRemoveAsset}
                                showRemoveButton={false}
                                isAirdrop={true}
                                linkId={link?.id}
                                isTip={link?.linkType === LINK_TYPE.SEND_TIP}
                            />
                            {index !== assetFields.fields.length - 1 && (
                                <Separator className="my-6 max-w-[100%] mx-auto opacity-50" />
                            )}
                        </div>
                    ))}
                </div>

                <div>
                    {showNotEnoughClaimsError && (
                        <MessageBanner
                            variant="info"
                            text={t("create.errors.not_enough_claims")}
                            className="mb-2"
                        />
                    )}
                    <div className="flex gap-4 mb-4">
                        <div className="input-label-field-container">
                            <Label>Claims</Label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDecreaseMaxUse}
                                    className="disabled:bg-grey/10 disabled:text-grey/75 bg-lightgreen text-green rounded-full p-1"
                                    disabled={maxActionNumber <= 1}
                                >
                                    <Minus size={16} />
                                </button>
                                <Input
                                    value={maxActionNumber === 0 ? "" : maxActionNumber}
                                    onChange={handleMaxUseInputChange}
                                    className={`max-w-20 h-11 text-center text-[16px] font-normal [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                        maxActionNumber <= 0 ? "text-grey/75" : ""
                                    }`}
                                    type="number"
                                    min="1"
                                />
                                <button
                                    onClick={handleIncreaseMaxUse}
                                    className="bg-lightgreen rounded-full p-1"
                                >
                                    <Plus size={16} className="text-green" />
                                </button>
                            </div>
                        </div>

                        <div className="input-label-field-container flex-1">
                            <Label>Total amount</Label>
                            <div className="flex items-center gap-1 bg-lightgreen rounded-[8px] flex-1 px-4 justify-between">
                                <p className="text-[16px] font-normal">
                                    {formatNumber(
                                        (() => {
                                            const asset = getValues("assets")[0];
                                            const token = getToken(asset?.tokenAddress || "");
                                            if (!asset || !token) return "0";

                                            // Calculate total from amount per claim * maxActionNumber
                                            const amountPerUse =
                                                Number(asset.amount) /
                                                Math.pow(10, token.decimals || 8);

                                            // Total amount = amount per claim * maxActionNumber
                                            const totalAmount = amountPerUse * maxActionNumber;

                                            // Format small numbers to avoid scientific notation
                                            if (totalAmount > 0 && totalAmount < 0.0001) {
                                                return totalAmount.toLocaleString("fullwide", {
                                                    useGrouping: false,
                                                    maximumFractionDigits: 20,
                                                });
                                            }

                                            return totalAmount.toString();
                                        })(),
                                    )}
                                </p>
                                <p className="text-[16px] font-normal">
                                    {getToken(getValues("assets")[0]?.tokenAddress || "")?.symbol}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Selection Drawer */}
            <AssetDrawer
                title="Select Asset"
                open={showAssetDrawer}
                handleClose={() => setShowAssetDrawer(false)}
                handleChange={handleSetTokenAddress}
                assetList={availableTokensForDrawer}
                showSearch
            />
        </div>
    );
};
