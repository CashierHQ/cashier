import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFeePreview } from "@/hooks/linkHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { useNavigate, useLocation } from "react-router-dom";
import { getTokenImage } from "@/utils";
import { Label } from "@/components/ui/label";
import { useResponsive } from "@/hooks/responsive-hook";
import { formatPrice } from "@/utils/helpers/currency";
import { useFeeTotal } from "@/hooks/useFeeMetadata";
import { NETWORK_FEE_DEFAULT_ADDRESS, NETWORK_FEE_DEFAULT_SYMBOL } from "@/constants/defaultValues";
import { convert } from "@/utils/helpers/convert";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useTokens } from "@/hooks/useTokens";
import { ACTION_TYPE, CHAIN, LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { ICP_ADDRESS, ICP_LOGO } from "@/const";
import LinkLocalStorageService, {
    LOCAL_lINK_ID_PREFIX,
} from "@/services/link/link-local-storage.service";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { useIdentity } from "@nfid/identitykit/react";
import { mapLinkDtoToUserInputItem } from "@/services/types/mapper/link.service.mapper";

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
    const { getToken, getTokenPrice } = useTokens();
    const [showInfo, setShowInfo] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);
    const { rawTokenList, createTokenMap } = useTokens();
    const { getUserInput, addUserInput } = useLinkCreationFormStore();
    const identity = useIdentity();

    // State for enhanced asset info with logos
    const [enhancedAssets, setEnhancedAssets] = useState<EnhancedAsset[]>([]);

    // Check if there's an existing action and show confirmation drawer
    useEffect(() => {
        if (action && action.type === ACTION_TYPE.CREATE_LINK) {
            setShowConfirmation(true);
        }
    }, [action]);

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

    // Effect to handle redirect and process action
    useEffect(() => {
        if (shouldRedirect && link && !link.id.startsWith(LOCAL_lINK_ID_PREFIX)) {
            const handleRedirect = async () => {
                try {
                    setIsDisabled(true);
                    await handleCreateAction();

                    if (oldIdParam && identity) {
                        const localStorageService = new LinkLocalStorageService(
                            identity.getPrincipal().toString(),
                        );
                        localStorageService.deleteLink(oldIdParam);
                    }

                    setShowConfirmation(true);
                } catch (error) {
                    console.error("Error processing action", error);
                    if (isCashierError(error)) {
                        onCashierError(error);
                    }
                } finally {
                    setIsDisabled(false);
                }
            };

            handleRedirect();
        }
    }, [shouldRedirect, link]);

    const { data: feeData } = useFeePreview(link?.id);
    const feeTotal = useFeeTotal(feeData ?? []) || 0;

    const handleCreateAction = async () => {
        if (!link) {
            throw new Error("Link is not defined");
        }
        const updatedAction = await createAction(link.id, ACTION_TYPE.CREATE_LINK);
        setAction(updatedAction);
    };

    const handleSubmit = async () => {
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
                handleCreateAction();
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
            className={`w-full flex flex-col h-full ${responsive.isSmallDevice ? "justify-between" : "gap-4"}`}
        >
            <div className="input-label-field-container">
                <Label>Link info</Label>
                <div className="flex justify-between items-center light-borders px-4 py-3">
                    <p className="text-[14px] font-normal">Type</p>
                    <p className="text-[14px] font-medium">
                        {link?.linkType?.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                </div>
            </div>

            {isSendLinkType && (
                <div className="input-label-field-container mt-4">
                    <Label>Assets to transfer to link</Label>
                    <div className="light-borders px-4 py-3 flex flex-col gap-3">
                        {enhancedAssets.map((asset, index) => {
                            // Calculate token amount with proper decimals
                            const tokenDecimals = getToken(asset.address)?.decimals ?? 8;
                            const totalTokenAmount =
                                (Number(asset.amountPerUse) * Number(link?.maxActionNumber)) /
                                10 ** tokenDecimals;
                            const tokenSymbol = getToken(asset.address)?.symbol;

                            // Calculate approximate USD value
                            const tokenPrice = getTokenPrice(asset.address) || 0;
                            const approximateUsdValue = totalTokenAmount * tokenPrice;

                            return (
                                <div key={index} className="flex justify-between items-start">
                                    <p className="text-[14px] font-normal">Token</p>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1">
                                            <p className="text-[14px] font-normal">
                                                {totalTokenAmount} {tokenSymbol}
                                            </p>
                                            <Avatar className="w-5 h-5 rounded-full overflow-hidden">
                                                <AvatarImage
                                                    src={
                                                        asset.address === ICP_ADDRESS
                                                            ? ICP_LOGO
                                                            : asset.logo
                                                    }
                                                    alt={tokenSymbol || asset.address}
                                                    className="w-full h-full object-cover"
                                                />
                                            </Avatar>
                                        </div>
                                        <p className="text-[11px] font-normal text-grey/60">
                                            ≈${formatPrice(approximateUsdValue.toString())}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-4 input-label-field-container">
                <Label>Cashier Fees</Label>
                <div className="bg-lightgreen rounded-[8px] px-4 py-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <p className="text-[14px] font-normal">Link creation</p>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center">
                                <p className="text-[14px] font-normal">
                                    {formatPrice(feeTotal.toString())} {NETWORK_FEE_DEFAULT_SYMBOL}
                                </p>
                                <img
                                    // src={getTokenImage(NETWORK_FEE_DEFAULT_ADDRESS)}
                                    src={ICP_LOGO}
                                    alt={NETWORK_FEE_DEFAULT_SYMBOL}
                                    className="w-5 translate-x-1 rounded-full h-5"
                                />
                            </div>
                            <p className="text-[11px] font-normal text-grey/60">
                                ≈$
                                {formatPrice(
                                    (
                                        convert(
                                            feeTotal,
                                            getTokenPrice(NETWORK_FEE_DEFAULT_ADDRESS) || 0,
                                        ) || 0
                                    ).toString(),
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <FixedBottomButton
                type="submit"
                variant="default"
                size="lg"
                className="w-full mt-auto disabled:bg-disabledgreen"
                onClick={handleSubmit}
                disabled={isDisabled || isLoading || shouldRedirect}
            >
                {isDisabled ? t("processing") : t("create.create")}
            </FixedBottomButton>

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

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
