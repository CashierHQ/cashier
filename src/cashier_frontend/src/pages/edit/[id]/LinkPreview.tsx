import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { LinkPreviewCashierFeeSection } from "@/components/link-preview/link-preview-cashier-fee-section";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { LINK_TYPE } from "@/services/types/enum";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { useCreateAction, useFeePreview, useSetLinkActive } from "@/hooks/linkHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { useNavigate } from "react-router-dom";
import { getTokenImage } from "@/utils";
import { Label } from "@/components/ui/label";
import PhonePreview from "@/components/ui/phone-preview";
import { useResponsive } from "@/hooks/responsive-hook";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { useTokenStore } from "@/stores/tokenStore";
import { formatPrice } from "@/utils/helpers/currency";
import { useFeeTotal } from "@/hooks/useFeeMetadata";
import { NETWORK_FEE_DEFAULT_ADDRESS, NETWORK_FEE_DEFAULT_SYMBOL } from "@/constants/defaultValues";
import { convert } from "@/utils/helpers/convert";
export interface LinkPreviewProps {
    onInvalidActon?: () => void;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
}

export default function LinkPreview({
    onInvalidActon = () => {},
    onCashierError = () => {},
    onActionResult,
}: LinkPreviewProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const responsive = useResponsive();

    const { link, action, setAction, setLink } = useLinkActionStore();
    const linkCreationFormStore = useLinkCreationFormStore();
    const tokenStore = useTokenStore();
    const [showInfo, setShowInfo] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);
    const { mutateAsync: createAction } = useCreateAction();
    const { mutateAsync: setLinkActive } = useSetLinkActive();

    const { data: feeData } = useFeePreview(link?.id);

    const currentLink = linkCreationFormStore.getUserInput(link?.id ?? "");

    const handleCreateAction = async () => {
        const updatedAction = await createAction({
            linkId: link!.id,
        });
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

    const renderLinkCard = () => {
        if (!link) return null;

        const message =
            link.linkType === LINK_TYPE.SEND_TIP
                ? LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP
                : link.description;
        const src =
            link.linkType === LINK_TYPE.SEND_TIP
                ? getTokenImage(link?.asset_info?.[0].address ?? "")
                : link.image;

        return <PhonePreview src={src} title={link.title} message={message} />;
    };

    const handleSetLinkToActive = async () => {
        const activeLink = await setLinkActive({ link: link! });
        setLink(activeLink);

        navigate(`/details/${link!.id}`);
    };

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

            <div className="input-label-field-container mt-4">
                <Label>Assets to transfer to link</Label>
                <div className="light-borders px-4 py-3 flex flex-col gap-3">
                    {currentLink &&
                        currentLink.assets &&
                        currentLink?.assets?.map((asset, index) => (
                            <div key={index} className="flex justify-between items-start">
                                <p className="text-[14px] font-normal">Token</p>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center">
                                        <p className="text-[14px] font-normal">
                                            {Number(asset.amount) /
                                                10 **
                                                    (tokenStore.getToken(asset.address)?.decimals ??
                                                        8)}{" "}
                                            {tokenStore.getToken(asset.address)?.symbol}
                                        </p>
                                        <img
                                            src={getTokenImage(asset.address)}
                                            alt={asset.address}
                                            className="w-5 translate-x-1 rounded-full h-5"
                                        />
                                    </div>
                                    <p className="text-[11px] font-normal text-grey/60">
                                        ≈$
                                        {formatPrice(
                                            (
                                                (Number(asset.amount) / 10 ** 8) *
                                                (tokenStore.getTokenPrice(asset.address) || 0)
                                            ).toString(),
                                        )}
                                        {/* {tokenStore.getTokenPrice(asset.address)} */}
                                    </p>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

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
                                            tokenStore.getTokenPrice(NETWORK_FEE_DEFAULT_ADDRESS) ||
                                                0,
                                        ) || 0
                                    ).toString(),
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {/* <LinkPreviewCashierFeeSection
                intents={feeData ?? []}
                onInfoClick={() => setShowInfo(true)}
            /> */}

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

            {/* <Button disabled={isDisabled} onClick={handleSubmit} className="my-3">
                {isDisabled ? t("processing") : t("create.create")}
            </Button> */}

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
