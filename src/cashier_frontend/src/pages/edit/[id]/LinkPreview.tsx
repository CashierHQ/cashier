import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { LinkPreviewCashierFeeSection } from "@/components/link-preview/link-preview-cashier-fee-section";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { LINK_TYPE } from "@/services/types/enum";

import { useEffect, useState } from "react";
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
import { FormLabel } from "@/components/ui/form";
import { useResponsive } from "@/hooks/responsive-hook";

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

    const [showInfo, setShowInfo] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);
    const { mutateAsync: createAction } = useCreateAction();
    const { mutateAsync: setLinkActive } = useSetLinkActive();

    const { data: feeData } = useFeePreview(link?.id);

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

        const label = link.linkType === LINK_TYPE.SEND_TIP ? "Tip" : "Claim";
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
            <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <Label>{t("create.preview")}</Label>
                </div>
                {renderLinkCard()}
            </div>

            <LinkPreviewCashierFeeSection
                intents={feeData ?? []}
                onInfoClick={() => setShowInfo(true)}
            />

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
