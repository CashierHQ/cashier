// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ConfirmationDrawerV2 } from "@/components/confirmation-drawer/confirmation-drawer-v2";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { useNavigate, useLocation } from "react-router-dom";
import { getTokenImage } from "@/utils";
import { Label } from "@/components/ui/label";
import { useDeviceSize } from "@/hooks/responsive-hook";
import { formatDollarAmount, formatNumber } from "@/utils/helpers/currency";
import { useLinkAction } from "@/hooks/useLinkAction";
import { useTokens } from "@/hooks/useTokens";
import {
    ACTION_TYPE,
    CHAIN,
    LINK_STATE,
    LINK_TYPE,
    getLinkTypeString,
} from "@/services/types/enum";
import { Avatar } from "@radix-ui/react-avatar";
import { LOCAL_lINK_ID_PREFIX } from "@/services/link/link-local-storage.service";
import { Info } from "lucide-react";
import { InformationOnAssetDrawer } from "@/components/information-on-asset-drawer/information-on-asset-drawer";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { useIdentity } from "@nfid/identitykit/react";
import { mapLinkDtoToUserInputItem } from "@/services/types/mapper/link.service.mapper";
import { AssetAvatarV2 } from "@/components/ui/asset-avatar";
import { useProcessAction, useUpdateAction } from "@/hooks/action-hooks";
import LinkLocalStorageServiceV2 from "@/services/link/link-local-storage.service.v2";
import { FeeHelpers } from "@/services/fee.service";
import { useLinkPreviewValidation } from "@/hooks/form/useLinkPreviewValidation";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";
import { toast } from "sonner";

export interface LinkPreviewProps {
    onInvalidActon?: () => void;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
}

// Define interface for asset info with logo
interface EnhancedAsset {
    address: string;
    amountPerUse: string | number | bigint;
    logo: string;
    label?: string;
    chain?: CHAIN; // Using the proper CHAIN enum type from imports
    [key: string]: unknown; // For any additional properties that might exist
}

export default function LinkPreview({
    // onInvalidActon = () => {},
    onCashierError = () => {},
    onActionResult,
}: LinkPreviewProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const responsive = useDeviceSize();
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get("redirect");
    const oldIdParam = searchParams.get("oldId");
    const shouldRedirect = redirectParam === "true";

    const {
        link,
        action,
        setAction,
        refetchLinkDetail,
        callLinkStateMachine,
        createAction,
        createNewLink,
        isLoading,
    } = useLinkAction();
    const { getToken, getTokenPrice, rawTokenList, createTokenMap } = useTokens();
    const [showInfo, setShowInfo] = useState(false);
    const [showAssetInfo, setShowAssetInfo] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);
    const { getUserInput, addUserInput, setButtonState } = useLinkCreationFormStore();
    const identity = useIdentity();

    // State for enhanced asset info with logos
    const [enhancedAssets, setEnhancedAssets] = useState<EnhancedAsset[]>([]);

    // flag to indicate if the action is in progress
    const [createActionInProgress, setCreateActionInProgress] = useState(false);

    // Button state management has been moved to ConfirmationDrawerV2
    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();

    // Use centralized validation hook with balance checking
    const { validateLinkPreviewWithBalance } = useLinkPreviewValidation();

    // Button state is now managed directly in ConfirmationDrawerV2

    // Handle process create action - this function is passed as startTransaction to ConfirmationDrawerV2
    const handleStartTransaction = async (): Promise<void> => {
        try {
            if (!action || !link) {
                throw new Error("Action or Link is not defined");
            }

            const validationResult = validateLinkPreviewWithBalance(link, {
                maxActionNumber: link.maxActionNumber,
                includeLinkCreationFee: true, // No creation fee for processing existing actions
            });
            if (!validationResult.isValid) {
                const msg = validationResult.errors.map((error) => error.message).join(", ");
                toast.error(msg);
                console.error("Validation failed:", msg);
                return;
            }

            const firstUpdatedAction = await processAction({
                actionId: action.id,
                linkId: link.id,
                actionType: action.type,
            });

            setAction(firstUpdatedAction);

            if (firstUpdatedAction) {
                const response = await icrc112Execute({
                    transactions: firstUpdatedAction.icrc112Requests,
                });

                if (response) {
                    const secondUpdatedAction = await updateAction({
                        actionId: action.id,
                        linkId: link.id,
                        external: true,
                    });

                    if (secondUpdatedAction) {
                        setAction(secondUpdatedAction);
                    }
                }
            }
        } catch (error) {
            console.error("Error in startTransaction:", error);
            if (isCashierError(error)) {
                onCashierError(error);
            }
            throw error;
        }
    };

    // Check if there's an existing action and show confirmation drawer
    useEffect(() => {
        if (action && action.type === ACTION_TYPE.CREATE_LINK) {
            setShowConfirmation(true);
        }
    }, [action]);

    // Update the button state
    useEffect(() => {
        setButtonState({
            label: isDisabled || isLoading ? t("processing") : t("create.create"),
            isDisabled: isDisabled || isLoading,
            action: handleSubmit,
        });
    }, [isDisabled, isLoading, shouldRedirect, showConfirmation]);

    // Effect to map rawTokenList logos to asset_info
    useEffect(() => {
        const tokenMap = createTokenMap();
        const userInputData = oldIdParam ? getUserInput(oldIdParam) : undefined;

        if (link?.asset_info && tokenMap) {
            const enhanced = link.asset_info.map((asset) => {
                const matchingToken = tokenMap[asset.address];
                return {
                    ...asset,
                    logo: matchingToken?.logo || getTokenImage(asset.address),
                };
            });
            setEnhancedAssets(enhanced);
        } else if (userInputData && userInputData.assets && tokenMap) {
            const enhanced = userInputData.assets.map((asset) => {
                const matchingToken = tokenMap[asset.address];
                return {
                    address: asset.address,
                    amountPerUse: asset.linkUseAmount,
                    logo: matchingToken?.logo || getTokenImage(asset.address),
                    label: asset.label,
                    chain: asset.chain,
                };
            });
            setEnhancedAssets(enhanced);
        }
    }, [link?.asset_info, rawTokenList]);

    // Effect to handle redirect and call process action if redirect is true
    // IMPORTANT: This effect previously caused multiple calls to handleCreateAction, resulting in backend errors.
    // Problems that were fixed:
    // 1. Missing flag to prevent multiple simultaneous calls (createActionInProgress)
    // 2. Effect would re-trigger whenever link or action updated, causing chain reactions
    // 3. Effect didn't properly check if action already existed before creating a new one
    // 4. Missing action dependency in dependency array
    //
    // Solution:
    // - Added createActionInProgress flag to prevent duplicate calls
    // - Added proper conditionals to skip when already in progress or when unnecessary
    // - Only call handleCreateAction if no action exists
    // - Fixed dependency array to include action
    // - Added counter for debugging purposes
    useEffect(() => {
        // Skip if already redirecting or if we don't have necessary data
        if (
            createActionInProgress ||
            !link ||
            !shouldRedirect ||
            link.id.startsWith(LOCAL_lINK_ID_PREFIX)
        ) {
            return;
        }

        // Track the number of times this effect is triggered (for debugging)
        console.log(`Redirect effect called at timestamp: ${new Date().toISOString()}`);

        const handleRedirect = async () => {
            try {
                setIsDisabled(true);
                setCreateActionInProgress(true); // Set flag to prevent multiple calls

                // Only call handleCreateAction if there's no action yet
                if (!action) {
                    await handleCreateAction();
                }

                if (oldIdParam && identity) {
                    const localStorageService = new LinkLocalStorageServiceV2(
                        identity.getPrincipal().toString(),
                    );
                    localStorageService.deleteLink(oldIdParam);
                }

                setShowConfirmation(true);
            } catch (error) {
                if (isCashierError(error)) {
                    onCashierError(error);
                }
            } finally {
                setIsDisabled(false);
            }
        };

        handleRedirect();
    }, [shouldRedirect, link, action]); // Added action as dependency

    const handleCreateAction = async () => {
        // Validate link exists before creating action
        if (!link) {
            throw new Error("Link is not defined");
        }

        console.log("Creating action for link:", link);

        // Validate action creation prerequisites using centralized validation with balance check (no creation fee for existing links)
        const validationResult = validateLinkPreviewWithBalance(link, {
            maxActionNumber: link.maxActionNumber,
            includeLinkCreationFee: true,
        });
        if (!validationResult.isValid) {
            // Validation errors are automatically shown via toast
            return;
        }

        try {
            const updatedAction = await createAction(link.id, ACTION_TYPE.CREATE_LINK);
            setAction(updatedAction);
            return updatedAction;
        } catch (error) {
            console.error("Error creating action:", error);
            throw error;
        }
    };

    /**
     * Handles the submit action when user clicks the create/continue button.
     * If the link has a local ID (starts with LOCAL_lINK_ID_PREFIX), it creates a new link in the backend,
     * updates the local storage with the newly created link data, and redirects to the edit page with the new link ID.
     * If the link already exists in the backend, it creates an action (if one doesn't exist) and shows the confirmation drawer.
     * @returns {Promise<void>}
     */
    const handleSubmit = async () => {
        try {
            setIsDisabled(true);

            // Check if link exists first
            if (!link) {
                throw new Error("Link is not defined");
            }

            // Validate the link using centralized validation with balance check (include creation fee for new links)
            const validationResult = validateLinkPreviewWithBalance(link, {
                includeLinkCreationFee: true, // Include creation fee for new link creation
            });
            if (!validationResult.isValid) {
                // Validation errors are automatically shown via toast
                return;
            }

            if (link.id.startsWith(LOCAL_lINK_ID_PREFIX)) {
                // First create the link in the backend
                const res = await createNewLink(link.id);

                if (!res) {
                    throw new Error("Failed to create new link");
                }

                const input = mapLinkDtoToUserInputItem(res?.link);
                addUserInput(res.link.id, input);

                if (res) {
                    navigate(`/edit/${res.link.id}?redirect=true&oldId=${res.oldId}`);
                }
            } else {
                if (!action) {
                    handleCreateAction();
                }
                setShowConfirmation(true);
            }
        } catch (error) {
            if (isCashierError(error)) {
                onCashierError(error);
            }
        } finally {
            setIsDisabled(false);
        }
    };

    const handleSetLinkToActive = async () => {
        const res = await callLinkStateMachine({
            linkId: link!.id,
            linkModel: {},
            isContinue: true,
        });

        if (res.state === LINK_STATE.ACTIVE) {
            navigate(`/details/${link!.id}`);
            refetchLinkDetail();
        }
    };

    if (!link || !link.linkType) {
        return null;
    }

    const isSendLinkType = [
        LINK_TYPE.SEND_AIRDROP.toString(),
        LINK_TYPE.SEND_TIP.toString(),
        LINK_TYPE.SEND_TOKEN_BASKET.toString(),
    ].includes(link.linkType);

    const isPaymentLink = (): boolean => {
        return (
            link.linkType === LINK_TYPE.RECEIVE_PAYMENT ||
            link.linkType === LINK_TYPE.RECEIVE_MULTI_PAYMENT
        );
    };

    // Helper method to check if this is a send-type link
    const isSendLink = (): boolean => {
        return (
            link.linkType === LINK_TYPE.SEND_TIP ||
            link.linkType === LINK_TYPE.SEND_AIRDROP ||
            link.linkType === LINK_TYPE.SEND_TOKEN_BASKET ||
            link.linkType === LINK_TYPE.NFT_CREATE_AND_AIRDROP
        );
    };

    // Helper method to render user pays section
    const renderUserPays = (): JSX.Element => {
        if (isPaymentLink()) {
            // For payment links, show the user payment amount
            return (
                <div className="flex flex-col items-end gap-2">
                    {link.asset_info
                        .sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""))
                        .map((asset, index) => {
                            const token = getToken(asset.address);
                            if (!token) return null;
                            return (
                                <div key={`pay-${index}`} className="flex items-center gap-2">
                                    <p className="text-sm text-primary/80">
                                        {formatNumber(
                                            (
                                                Number(asset.amountPerUse) /
                                                10 ** token.decimals
                                            ).toString(),
                                        )}{" "}
                                        {token.symbol}
                                    </p>
                                    <AssetAvatarV2 token={token} className="w-4 h-4" />
                                </div>
                            );
                        })}
                </div>
            );
        } else {
            // For send links, user pays nothing
            return <p className="text-sm text-primary/80">-</p>;
        }
    };

    const renderUserClaims = (): JSX.Element => {
        if (isSendLink()) {
            // For send links, show what users can claim
            return (
                <div className="flex flex-col items-end gap-2">
                    {link.asset_info
                        .sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""))
                        .map((asset, index) => {
                            const token = getToken(asset.address);
                            if (!token) return null;
                            return (
                                <div key={`claim-${index}`} className="flex items-center gap-2">
                                    <p className="text-sm text-primary/80">
                                        {formatNumber(
                                            (
                                                Number(asset.amountPerUse) /
                                                10 ** token.decimals
                                            ).toString(),
                                        )}{" "}
                                        {token.symbol}
                                    </p>
                                    <AssetAvatarV2 token={token} className="w-4 h-4" />
                                </div>
                            );
                        })}
                </div>
            );
        } else {
            // For payment links, user claims nothing
            return <p className="text-sm text-primary/80">-</p>;
        }
    };

    return (
        <div
            className={`w-full flex flex-col flex-1 overflow-y-auto max-h-[calc(100vh-150px)] pb-24 mt-2 ${responsive.isSmallDevice ? "justify-start" : "gap-4"}`}
        >
            <div>
                <div className="flex gap-2 items-center mb-2 justify-between">
                    <Label>{t("details.linkInfo")}</Label>
                </div>
                <div
                    id="link-detail-section"
                    className="flex flex-col border-[1px] rounded-lg border-lightgreen"
                >
                    <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                        <p className="font-medium text-sm">Type</p>
                        <p className="text-sm text-primary/80">
                            {getLinkTypeString(link.linkType!)}
                        </p>
                    </div>
                    <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                        <p className="font-medium text-sm">User pays</p>
                        {renderUserPays()}
                    </div>
                    <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-3">
                        <p className="font-medium text-sm">User claims</p>
                        {renderUserClaims()}
                    </div>
                    <div className="flex flex-row items-center justify-between border-lightgreen border-t px-5 py-3">
                        <p className="font-medium text-sm">Max use</p>
                        <p className="text-sm text-primary/80">
                            {link.maxActionNumber ? link.maxActionNumber.toString() : "1"}
                        </p>
                    </div>
                </div>
            </div>

            {isSendLinkType && (
                <div className="input-label-field-container mt-4">
                    <div className="flex items-center w-full justify-between">
                        <Label>
                            Transfer to link
                            <span className="text-[#b6b6b6] text-[11px] ml-1">
                                {" "}
                                including network fees
                            </span>
                        </Label>
                        <button
                            className="flex items-center gap-1"
                            onClick={() => setShowAssetInfo(true)}
                        >
                            <Info size={18} color="#36A18B" />
                        </button>
                    </div>
                    <div className="light-borders-green px-4 py-3 flex flex-col gap-3">
                        {enhancedAssets
                            .sort((a, b) => {
                                return (a.address ?? "").localeCompare(b.address ?? "");
                            })
                            .map((asset, index) => {
                                // Calculate token amount with proper decimals
                                const token = getToken(asset.address);

                                const forecastAmount = FeeHelpers.forecastActualAmountWithoutIntent(
                                    token!,
                                    BigInt(asset.amountPerUse),
                                    Number(link?.maxActionNumber ?? 1),
                                );
                                const tokenSymbol = token?.symbol;

                                // Calculate approximate USD value
                                const tokenPrice = getTokenPrice(asset.address) || 0;
                                const approximateUsdValue = forecastAmount * tokenPrice;

                                return (
                                    <div key={index} className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5">
                                            <Avatar className="w-5 h-5 rounded-full overflow-hidden">
                                                <AssetAvatarV2
                                                    token={token}
                                                    className="w-full h-full object-cover"
                                                />
                                            </Avatar>
                                            <p className="text-[14px] font-normal">{tokenSymbol}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1">
                                                <p className="text-[14px] font-normal">
                                                    {formatNumber(forecastAmount.toString())}
                                                </p>
                                            </div>
                                            <p className="text-[10px] font-normal text-[#b6b6b6]">
                                                {formatDollarAmount(approximateUsdValue)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            <div className="input-label-field-container mt-4 mb-16">
                <div className="flex items-center w-full justify-between">
                    <Label>Link creation fee</Label>
                    <button className="flex items-center gap-1" onClick={() => setShowInfo(true)}>
                        <Info size={18} color="#36A18B" />
                    </button>
                </div>
                <div className="light-borders-green px-4 py-3 flex flex-col gap-3">
                    {/* Use getFee instead of getAllFees to get fee information */}
                    {(() => {
                        const fee = FeeHelpers.getLinkCreationFee();
                        console.log("Link creation fee:", fee);
                        const token = getToken(fee.address);
                        const tokenSymbol = fee.symbol;
                        const displayAmount = FeeHelpers.forecastIcrc2Fee(
                            token!,
                            BigInt(fee.amount),
                            // only for link creation fee
                            Number(1),
                        );

                        const tokenPrice = getTokenPrice(fee.address) || 0;
                        const usdValue = displayAmount * tokenPrice;

                        return (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <Avatar className="w-5 h-5 rounded-full overflow-hidden">
                                        <AssetAvatarV2
                                            token={token!}
                                            className="w-full h-full object-cover"
                                        />
                                    </Avatar>
                                    <p className="text-[14px] font-normal">{tokenSymbol}</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                        <p className="text-[14px] font-normal">
                                            {formatNumber(Number(displayAmount).toString())}
                                        </p>
                                    </div>
                                    <p className="text-[10px] font-normal text-[#b6b6b6]">
                                        {formatDollarAmount(usdValue)}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />
            <InformationOnAssetDrawer
                open={showAssetInfo}
                onClose={() => setShowAssetInfo(false)}
            />
            <ConfirmationDrawerV2
                action={action}
                open={showConfirmation && !showInfo}
                onClose={() => {
                    setShowConfirmation(false);
                }}
                onInfoClick={() => setShowInfo(true)}
                onActionResult={onActionResult}
                onCashierError={onCashierError}
                onSuccessContinue={handleSetLinkToActive}
                startTransaction={handleStartTransaction}
                maxActionNumber={Number(link?.maxActionNumber ?? 1)}
            />
        </div>
    );
}
