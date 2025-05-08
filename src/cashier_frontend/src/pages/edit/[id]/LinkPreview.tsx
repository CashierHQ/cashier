import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { useNavigate, useLocation } from "react-router-dom";
import { getTokenImage } from "@/utils";
import { Label } from "@/components/ui/label";
import { useResponsive } from "@/hooks/responsive-hook";
import { formatPrice } from "@/utils/helpers/currency";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useTokens } from "@/hooks/useTokens";
import { ACTION_TYPE, CHAIN, FEE_TYPE, LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { Avatar } from "@radix-ui/react-avatar";
import LinkLocalStorageService, {
    LOCAL_lINK_ID_PREFIX,
} from "@/services/link/link-local-storage.service";
import { Info } from "lucide-react";
import { InformationOnAssetDrawer } from "@/components/information-on-asset-drawer/information-on-asset-drawer";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { useIdentity } from "@nfid/identitykit/react";
import { mapLinkDtoToUserInputItem } from "@/services/types/mapper/link.service.mapper";
import { AssetAvatarV2 } from "@/components/ui/asset-avatar";
import { useFeeService } from "@/hooks/useFeeService";

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
    const responsive = useResponsive();
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
    // Debug state for countering redirects
    const [redirectCounter, setRedirectCounter] = useState(0);

    const { getFee } = useFeeService();

    // Check if there's an existing action and show confirmation drawer
    useEffect(() => {
        if (action && action.type === ACTION_TYPE.CREATE_LINK) {
            setShowConfirmation(true);
        }
    }, [action]);

    // Update the button state
    useEffect(() => {
        setButtonState({
            label: isDisabled ? t("processing") : t("create.create"),
            isDisabled: isDisabled || isLoading || shouldRedirect,
            action: handleSubmit,
        });
    }, [isDisabled, isLoading, shouldRedirect]);

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
        setRedirectCounter((prev) => {
            const newCount = prev + 1;
            console.log(`Redirect effect called ${newCount} times`);
            console.log("timestamp:", new Date().toISOString());
            return newCount;
        });

        const handleRedirect = async () => {
            try {
                setIsDisabled(true);
                setCreateActionInProgress(true); // Set flag to prevent multiple calls

                // Only call handleCreateAction if there's no action yet
                if (!action) {
                    await handleCreateAction();
                }

                if (oldIdParam && identity) {
                    const localStorageService = new LinkLocalStorageService(
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
        if (!link) {
            throw new Error("Link is not defined");
        }
        const updatedAction = await createAction(link.id, ACTION_TYPE.CREATE_LINK);
        setAction(updatedAction);
    };

    const handleSubmit = async () => {
        console.log("handleSubmit");
        setIsDisabled(true);

        try {
            if (link && link.id.startsWith(LOCAL_lINK_ID_PREFIX)) {
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
            console.error("Error creating link", error);
            if (isCashierError(error)) {
                onCashierError(error);
            }

            console.log("🚀 ~ handleSubmit ~ error:", error);
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

    return (
        <div
            className={`w-full flex flex-col h-full ${responsive.isSmallDevice ? "justify-start" : "gap-4"}`}
        >
            <div className="input-label-field-container mt-2">
                <Label>Link info</Label>
                <div className="flex flex-col gap-2 justify-between items-center light-borders-green px-4 py-3">
                    <div className="flex items-center w-full justify-between">
                        <p className="text-[14px] font-normal">Type</p>
                        <p className="text-[14px] font-normal">
                            {link?.linkType?.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                    </div>
                    <div className="flex items-center w-full justify-between">
                        <p className="text-[14px] font-normal">Max number of uses</p>
                        <p className="text-[14px] font-normal">
                            {link.maxActionNumber ? link.maxActionNumber.toString() : "1"}
                        </p>
                    </div>
                    <div className="flex items-center w-full justify-between">
                        <p className="text-[14px] font-normal">Gate</p>
                        <p className="text-[14px] font-normal">none</p>
                    </div>
                </div>
            </div>

            {isSendLinkType && (
                <div className="input-label-field-container mt-4">
                    <div className="flex items-center w-full justify-between">
                        <Label>
                            Asset{link.maxActionNumber > 1 ? "s" : ""} to transfer to link
                        </Label>
                        <button
                            className="flex items-center gap-1"
                            onClick={() => setShowAssetInfo(true)}
                        >
                            <Info size={18} color="#36A18B" />
                        </button>
                    </div>
                    <div className="light-borders-green px-4 py-3 flex flex-col gap-3">
                        {enhancedAssets.map((asset, index) => {
                            // Calculate token amount with proper decimals
                            const token = getToken(asset.address);

                            const tokenDecimals = token?.decimals ?? 8;
                            const totalTokenAmount =
                                (Number(asset.amountPerUse) * Number(link?.maxActionNumber)) /
                                10 ** tokenDecimals;
                            const tokenSymbol = token?.symbol;

                            // Calculate approximate USD value
                            const tokenPrice = getTokenPrice(asset.address) || 0;
                            const approximateUsdValue = totalTokenAmount * tokenPrice;

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
                                                {totalTokenAmount}
                                            </p>
                                        </div>
                                        <p className="text-[10px] font-normal text-grey/50">
                                            ~${formatPrice(approximateUsdValue.toString())}
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
                        const fee = getFee(
                            CHAIN.IC,
                            link.linkType as LINK_TYPE,
                            FEE_TYPE.LINK_CREATION,
                        );
                        if (!fee) return null;

                        const token = getToken(fee.address);

                        const tokenSymbol = token?.symbol || fee.symbol || "ICP";

                        const tokenDecimals = fee.decimals || token?.decimals || 8;
                        const displayAmount = Number(fee.amount) / 10 ** tokenDecimals;
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
                                            {formatPrice(displayAmount.toString())} {tokenSymbol}
                                        </p>
                                    </div>
                                    <p className="text-[10px] font-normal text-grey/50">
                                        ~${formatPrice(usdValue.toString())}
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
            <ConfirmationDrawer
                open={showConfirmation && !showInfo}
                onClose={() => setShowConfirmation(false)}
                onInfoClick={() => setShowInfo(true)}
                onActionResult={onActionResult}
                onCashierError={onCashierError}
                onSuccessContinue={handleSetLinkToActive}
            />
        </div>
    );
}
