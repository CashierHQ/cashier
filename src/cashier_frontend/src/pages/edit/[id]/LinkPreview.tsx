import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFeePreview } from "@/hooks/linkHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { useNavigate } from "react-router-dom";
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
    onInvalidActon = () => {},
    onCashierError = () => {},
    onActionResult,
}: LinkPreviewProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const responsive = useResponsive();

    const { link, action, setAction, refetchLinkDetail, callLinkStateMachine, createAction } =
        useLinkAction();
    const { getToken, getTokenPrice } = useTokens();
    const [showInfo, setShowInfo] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);
    const { rawTokenList, getTokenMap } = useTokens();

    // State for enhanced asset info with logos
    const [enhancedAssets, setEnhancedAssets] = useState<EnhancedAsset[]>([]);

    // Effect to map rawTokenList logos to asset_info
    useEffect(() => {
        const tokenMap = getTokenMap();
        if (link?.asset_info && tokenMap) {
            const enhanced = link.asset_info.map((asset) => {
                console.log("asset_info", link?.asset_info);
                const matchingToken = tokenMap[asset.address];
                console.log("matchingToken", matchingToken);
                return {
                    ...asset,
                    logo: matchingToken?.logo || getTokenImage(asset.address),
                };
            });
            setEnhancedAssets(enhanced);
        }
    }, [link?.asset_info, rawTokenList]);

    const { data: feeData } = useFeePreview(link?.id);

    const handleCreateAction = async () => {
        const updatedAction = await createAction(link!.id, ACTION_TYPE.CREATE_LINK);
        console.log("🚀 ~ handleCreateAction ~ updatedAction:", updatedAction);
        setAction(updatedAction);
    };

    const handleSubmit = async () => {
        const validationResult = true;

        setIsDisabled(true);

        try {
            if (validationResult) {
                if (!action) {
                    console.log("🚀 ~ handleSubmit ~ create action:", action);
                    await handleCreateAction();
                }

                setShowConfirmation(true);
            } else {
                onInvalidActon();
            }
        } catch (error) {
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
                                                    src={asset.logo}
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
                                    {formatPrice((useFeeTotal(feeData ?? []) || 0).toString())}{" "}
                                    {NETWORK_FEE_DEFAULT_SYMBOL}
                                </p>
                                <img
                                    src={getTokenImage(NETWORK_FEE_DEFAULT_ADDRESS)}
                                    alt={NETWORK_FEE_DEFAULT_SYMBOL}
                                    className="w-5 translate-x-1 rounded-full h-5"
                                />
                            </div>
                            <p className="text-[11px] font-normal text-grey/60">
                                ≈$
                                {formatPrice(
                                    (
                                        convert(
                                            useFeeTotal(feeData ?? []),
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
                className="mt-auto"
                onClick={handleSubmit}
                disabled={isDisabled}
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
