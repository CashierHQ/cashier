import { FC, useState, useEffect, useMemo } from "react";
import { useFieldArray } from "react-hook-form";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import AssetDrawer from "@/components/asset-drawer";
import { useTranslation } from "react-i18next";
import { AssetFormSkeleton } from "./asset-form-skeleton";
import { useAddAssetForm } from "./add-asset-hooks";
import { useTokens } from "@/hooks/useTokens";
import { useLinkCreationFormStore, UserInputItem } from "@/stores/linkCreationFormStore";
import { CHAIN, getAssetLabelForLinkType, LINK_INTENT_LABEL } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import TransactionToast from "../transaction/transaction-toast";
import { Plus } from "lucide-react";
import { AssetFormInput } from "./asset-form-input";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useLinkAction } from "@/hooks/linkActionHook";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { stateToStepIndex } from "@/pages/edit/[id]";

type TipLinkAssetFormProps = {
    isMultiAsset: boolean;
};

export const AddAssetForm: FC<TipLinkAssetFormProps> = ({ isMultiAsset }) => {
    const { t } = useTranslation();
    const { link, isUpdating, callLinkStateMachine } = useLinkAction();
    const { getUserInput, updateUserInput } = useLinkCreationFormStore();
    const { showToast, toastData, hideToast } = useToast();
    const { setStep } = useMultiStepFormContext();

    const { getToken } = useTokens();

    // State for asset drawer
    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);
    const [editingAssetIndex, setEditingAssetIndex] = useState<number>(-1);
    const [selectedAssetAddresses, setSelectedAssetAddresses] = useState<string[]>([]);

    // Get current input and link type from store
    const currentInput = link?.id ? getUserInput(link.id) : undefined;

    // maxUse (default = 1)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [maxActionNumber, setMaxUse] = useState<number>(1);

    // Get tokens data
    const {
        filteredTokenList: allAvailableTokens,
        isLoading: isLoadingTokens,
        getTokenPrice,
    } = useTokens();

    // Initialize form with existing or default values
    const initialValues = useMemo(() => {
        const values = getInitialFormValues(currentInput);
        if (
            !values &&
            allAvailableTokens &&
            allAvailableTokens.length > 0 &&
            link &&
            link.linkType
        ) {
            // Create default values with the first available token if no values exist
            const label = getAssetLabelForLinkType(link.linkType);
            return {
                assets: [
                    {
                        tokenAddress: allAvailableTokens[0].address,
                        amount: BigInt(0),
                        label: label,
                        chain: CHAIN.IC,
                    },
                ],
            };
        }
        return values;
    }, [currentInput, allAvailableTokens, isMultiAsset]);

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
    }, [maxActionNumber, link?.id, updateUserInput]);

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

    // Initialize form with first asset if none exists
    useEffect(() => {
        if (allAvailableTokens?.length > 0 && link && assetFields.fields.length === 0) {
            initializeFirstAsset();
        }
    }, [allAvailableTokens, link]);

    // Sync form data with store when assets change
    useEffect(() => {
        syncFormDataWithStore();
    }, [watch("assets")]);

    useEffect(() => {
        console.log("errors ", errors);
    }, [errors]);

    // Filtered list of available tokens for the asset drawer
    const availableTokensForDrawer = useMemo(() => {
        return getAvailableTokensForDrawer();
    }, [allAvailableTokens, selectedAssetAddresses, editingAssetIndex, getValues]);

    // Event handlers
    const handleAssetSelect = (index: number) => {
        setEditingAssetIndex(index);
        setShowAssetDrawer(true);
    };

    const handleSetTokenAddress = (address: string) => {
        console.log(editingAssetIndex < 0 || !link?.id);

        if (editingAssetIndex < 0 || !link?.id) return;

        // Reset the amount values when selecting a new token
        setValue(`assets.${editingAssetIndex}.tokenAddress`, address);
        setValue(`assets.${editingAssetIndex}.amount`, BigInt(0));

        const formValues = getValues("assets");

        console.log("Form values:", formValues);

        const updatedAssets = [...selectedAssetAddresses];
        updatedAssets[editingAssetIndex] = address;
        setSelectedAssetAddresses(updatedAssets);

        setShowAssetDrawer(false);
    };

    const handleRemoveAsset = (index: number) => {
        const removedAsset = getValues(`assets.${index}`);
        setSelectedAssetAddresses((prev) =>
            prev.filter((address) => address !== removedAsset.tokenAddress),
        );

        assetFields.remove(index);
    };

    const handleAddAsset = () => {
        const nextToken = getNextAvailableToken();
        if (nextToken && link && link.linkType) {
            const label = getAssetLabelForLinkType(link?.linkType);
            console.log("Adding asset:", label);

            assetFields.append({
                tokenAddress: nextToken.address,
                amount: BigInt(0),
                label: label as LINK_INTENT_LABEL,
                chain: CHAIN.IC,
            });

            setSelectedAssetAddresses((prev) => [...prev, nextToken.address]);
        } else {
            showToast("Error", "No more tokens available to add", "error");
        }
    };

    const handleSubmit = async () => {
        if (!link?.id) throw new Error("Link ID not found");

        const formAssets = getValues("assets");
        if (!formAssets || formAssets.length === 0) throw new Error("No assets found");

        if (validateAssets(formAssets)) {
            updateUserInput(link.id, {
                assets: formAssets.map((asset) => ({
                    address: asset.tokenAddress,
                    linkUseAmount: BigInt(asset.amount),
                    usdEquivalent: 0,
                    usdConversionRate: getTokenPrice(asset.tokenAddress) || 0,
                    // validate in validateAssets
                    chain: asset.chain!,
                    // validate in validateAssets
                    label: asset.label!,
                })),
                maxActionNumber: BigInt(maxActionNumber),
            });

            const input = getUserInput(link.id);

            if (!input) throw new Error("Input not found");

            const previousState = link.state;

            if (!previousState) throw new Error("Previous state not found");

            const stateMachineResponse = await callLinkStateMachine({
                linkId: link.id,
                linkModel: input,
                isContinue: true,
            });

            const stepIndex = stateToStepIndex(stateMachineResponse.state);

            setStep(stepIndex);
        }
    };

    // Helper functions
    function getInitialFormValues(input: Partial<UserInputItem> | undefined) {
        if (!input?.assets || input.assets.length === 0) {
            // If link has assets but no user input, check if we have link data directly
            if (link?.asset_info && link.asset_info.length > 0) {
                return {
                    assets: link.asset_info.map((asset) => {
                        return {
                            tokenAddress: asset.address,
                            amount: asset.amountPerClaim,
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
            let label: string = getAssetLabelForLinkType(link.linkType);

            if (label == LINK_INTENT_LABEL.INTENT_LABEL_SEND_TOKEN_BASKET_ASSET) {
                label = LINK_INTENT_LABEL.INTENT_LABEL_SEND_TIP_ASSET + "_" + firstAsset.address;
            }

            assetFields.append({
                tokenAddress: firstAsset.address,
                amount: firstAsset.amountPerClaim,
                label: label,
                chain: firstAsset.chain,
            });

            setSelectedAssetAddresses([firstAsset.address]);
            return;
        }

        // If no existing assets, create a default one
        const firstToken = allAvailableTokens[0];
        const label = getAssetLabelForLinkType(link.linkType);

        assetFields.append({
            tokenAddress: firstToken.address,
            amount: BigInt(0),
            label,
            chain: CHAIN.IC,
        });

        setSelectedAssetAddresses([firstToken.address]);

        updateUserInput(link.id, {
            assets: [
                {
                    address: firstToken.address,
                    linkUseAmount: BigInt(0),
                    usdEquivalent: 0,
                    usdConversionRate: getTokenPrice(firstToken.address) || 0,
                    chain: CHAIN.IC,
                    label,
                },
            ],
        });
    }

    function syncFormDataWithStore() {
        if (!link?.id) return;

        const formAssets = getValues("assets");
        if (!formAssets || formAssets.length === 0) return;

        const tokenData = getToken(formAssets[0].tokenAddress);
        if (!tokenData) return;

        const amouontNumber = Number(formAssets[0].amount) / Math.pow(10, tokenData.decimals || 8);
        const usdNumber = tokenData.usdConversionRate
            ? tokenData.usdConversionRate * amouontNumber
            : 0;

        const storeAssets = formAssets.map((asset) => ({
            address: asset.tokenAddress,
            linkUseAmount: asset.amount,
            usdEquivalent: usdNumber,
            usdConversionRate: getTokenPrice(asset.tokenAddress) || 0,
            chain: CHAIN.IC,
            label: asset.label!,
        }));

        updateUserInput(link.id, { assets: storeAssets });
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

    function validateAssets(
        assets: {
            tokenAddress: string;
            amount: bigint;
            label?: string | LINK_INTENT_LABEL | undefined;
            chain?: CHAIN | undefined;
        }[],
    ): boolean {
        let isValid = true;
        const errorMessages: string[] = [];

        assets.forEach((asset, index) => {
            const token = allAvailableTokens?.find((t) => t.address === asset.tokenAddress);
            const tokenSymbol = token?.symbol || "Unknown";

            // Check amount
            if (!asset.amount || asset.amount === BigInt(0)) {
                const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.amount_error_message")}`;
                errorMessages.push(errorMsg);
                isValid = false;
            }

            // Check chain
            if (!asset.chain) {
                const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.chain_error_message")}`;
                errorMessages.push(errorMsg);
                isValid = false;
            }

            // Check label
            if (!asset.label) {
                const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.label_error_message")}`;
                errorMessages.push(errorMsg);
                isValid = false;
            }

            // Check balance
            const hasEnoughBalance =
                token &&
                token.amount !== null &&
                typeof token.amount !== "undefined" &&
                Number(asset.amount) <= Number(token.amount);

            if (!hasEnoughBalance) {
                const availableAmount = token?.amount ? Number(token.amount) : 0;
                const requestedAmount = Number(asset.amount);
                const errorMsg = `Asset #${index + 1} (${tokenSymbol}): Insufficient balance. Available: ${availableAmount}, Requested: ${requestedAmount}`;
                errorMessages.push(errorMsg);
                isValid = false;
            }
        });

        // Display all errors as a summary if there are multiple issues
        if (errorMessages.length > 0) {
            if (errorMessages.length === 1) {
                // Only one error, show it directly
                showToast(t("create.validation_error"), errorMessages[0], "error");
            } else {
                // Multiple errors, show a summary
                showToast(
                    t("create.validation_error"),
                    `Found ${errorMessages.length} issues:\n${errorMessages.slice(0, 3).join("\n")}${
                        errorMessages.length > 3 ? "\n...and more" : ""
                    }`,
                    "error",
                );

                // Log all errors to console for debugging
                console.error("Form validation errors:", errorMessages);
            }
        }

        return isValid;
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
        <div className="w-full h-full flex flex-col">
            <div
                className="flex flex-col overflow-y-auto pb-20 md:overflow-visible mt-2"
                style={{
                    maxHeight: "calc(100vh - 120px)",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {/* Asset Form Fields */}
                {assetFields.fields.map((field, index) => (
                    <AssetFormInput
                        key={field.id}
                        fieldId={field.id}
                        index={index}
                        form={form}
                        availableAssets={allAvailableTokens}
                        onAssetSelect={handleAssetSelect}
                        onRemoveAsset={handleRemoveAsset}
                        showRemoveButton={isMultiAsset && assetFields.fields.length > 1}
                    />
                ))}

                {/* Add Another Asset Button (for multi-asset mode) */}
                {isMultiAsset && (
                    <button
                        className="light-borders flex items-center justify-center gap-2 flex-col py-8 mb-8"
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
                )}

                {/* Continue Button */}
                <div className="flex-grow mt-auto flex items-end">
                    <FixedBottomButton
                        type="submit"
                        variant="default"
                        size="lg"
                        className="w-full fixed bottom-4 disabled:bg-disabledgreen"
                        onClick={handleSubmit}
                        disabled={
                            assetFields.fields.length === 0 ||
                            Object.keys(errors).length > 0 ||
                            getValues("assets").some(
                                (asset) => !asset.amount || asset.amount <= BigInt(0),
                            ) ||
                            isUpdating
                        }
                    >
                        {t("continue")}
                    </FixedBottomButton>
                </div>
            </div>

            {/* Asset Selection Drawer */}
            <AssetDrawer
                title="Select Asset"
                open={showAssetDrawer}
                handleClose={() => setShowAssetDrawer(false)}
                handleChange={handleSetTokenAddress}
                assetList={availableTokensForDrawer}
            />

            {/* Toast Messages */}
            <TransactionToast
                open={toastData?.open ?? false}
                onOpenChange={hideToast}
                title={toastData?.title ?? ""}
                description={toastData?.description ?? ""}
                variant={toastData?.variant ?? "default"}
                duration={3000}
            />
        </div>
    );
};
