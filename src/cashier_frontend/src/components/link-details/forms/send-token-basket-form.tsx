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
import { Plus } from "lucide-react";
import { AssetFormInput } from "../asset-form-input";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useLinkAction } from "@/hooks/useLinkAction";
import { useDeviceSize } from "@/hooks/responsive-hook";
import { Separator } from "../../ui/separator";
import { toast } from "sonner";
import {
    createAssetSelectHandler,
    createTokenAddressHandler,
    createRemoveAssetHandler,
} from "../form-handlers";
import { useSendTokenBasketFormHandler } from "@/hooks/form/usePageSubmissionHandlers";

interface SendTokenBasketFormProps {
    initialValues?: {
        assets: {
            tokenAddress: string;
            amount: bigint;
            label: string | LINK_INTENT_ASSET_LABEL | undefined;
            chain: CHAIN | undefined;
        }[];
    };
}

export const SendTokenBasketForm = ({
    initialValues: propInitialValues,
}: SendTokenBasketFormProps) => {
    const { t } = useTranslation();
    const { link, isUpdating } = useLinkAction();
    const { userInputs, getUserInput, updateUserInput, setButtonState } =
        useLinkCreationFormStore();
    const responsive = useDeviceSize();

    // State for asset drawer
    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);
    const [editingAssetIndex, setEditingAssetIndex] = useState<number>(-1);
    const [selectedAssetAddresses, setSelectedAssetAddresses] = useState<string[]>([]);
    // Get current input and link type from store
    const currentInput = link?.id ? getUserInput(link.id) : undefined;

    // maxUse - initialize based on link data if available, otherwise use defaults
    // default to 1 for SEND_TOKEN_BASKET
    const [maxActionNumber] = useState<number>(1);

    // Use centralized submission handler
    const { submitTokenBasketForm } = useSendTokenBasketFormHandler();

    // Get tokens data
    const { isLoading: isLoadingTokens, getTokenPrice, getDisplayTokens } = useTokens();
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
        if (link?.id) {
            updateUserInput(link?.id, {
                maxActionNumber: BigInt(maxActionNumber),
            });
        }
    }, [maxActionNumber, link?.id]);

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

    const handleAddAsset = () => {
        const nextToken = getNextAvailableToken();
        if (nextToken && link && link.linkType) {
            const label = getAssetLabelForLinkType(link?.linkType, nextToken.address);

            assetFields.append({
                tokenAddress: nextToken.address,
                amount: BigInt(0),
                label: label as LINK_INTENT_ASSET_LABEL,
                chain: CHAIN.IC,
            });

            setSelectedAssetAddresses((prev) => [...prev, nextToken.address]);
        } else {
            toast.error(t("add_asset_form.error.default.title"), {
                description: t("add_asset_form.error.no_more_token.description"),
            });
        }
    };

    const handleSubmit = async () => {
        try {
            if (!link?.id) {
                toast.error(t("common.error"), { description: t("error.link.link_id_missing") });
                return;
            }

            const formAssets = getValues("assets");
            if (!formAssets || formAssets.length === 0) {
                toast.error(t("common.error"), { description: t("error.asset.no_assets_found") });
                return;
            }

            if (maxActionNumber <= 0) {
                return;
            }

            // Use centralized submission handler (hooks now handle toast errors)
            await submitTokenBasketForm(link.id, formAssets, maxActionNumber);
        } catch (error) {
            console.error("SendTokenBasketForm error:", error);
            // Fallback error toast for any unexpected errors
            toast.error(t("error.form.form_validation_failed"), {
                description: error instanceof Error ? error.message : t("common.unknown_error"),
            });
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

    function getNextAvailableToken(): FungibleToken | undefined {
        if (!allAvailableTokens || allAvailableTokens.length === 0) return undefined;

        return (
            allAvailableTokens.find((token) => !selectedAssetAddresses.includes(token.address)) ||
            allAvailableTokens[0]
        ); // Fallback to first token if all are selected
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
                        paddingBottom: "16px",
                    }}
                >
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
                                showRemoveButton={true}
                                isAirdrop={false}
                                linkId={link?.id}
                                isTip={link?.linkType === LINK_TYPE.SEND_TIP}
                            />
                            {index !== assetFields.fields.length - 1 && (
                                <Separator className="my-6 max-w-[100%] mx-auto opacity-50" />
                            )}
                        </div>
                    ))}

                    {/* Add Another Asset Button (for multi-asset mode) */}
                    <button
                        className="light-borders flex items-center justify-center gap-2 flex-col py-8 mb-4 w-full"
                        onClick={handleAddAsset}
                        disabled={selectedAssetAddresses.length >= allAvailableTokens.length}
                    >
                        <div className="bg-[#35A18B] rounded-full h-[44px] w-[44px] aspect-square flex items-center justify-center">
                            <Plus size={24} color={"white"} />
                        </div>
                        <span className="text-[#35A18B] text-[14px] font-medium">
                            {t("create.add_another_asset")}
                        </span>
                    </button>
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
