import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { useCashierFeeIntents } from "@/components/confirmation-drawer/confirmation-drawer.hooks";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import LinkCard from "@/components/link-card";
import { LinkPreviewCashierFeeSection } from "@/components/link-preview/link-preview-cashier-fee-section";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { LINK_TYPE } from "@/services/types/enum";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { useCreateAction, useFeePreview, useSetLinkActive } from "@/hooks/linkHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { useNavigate } from "react-router-dom";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { getTokenImage } from "@/utils";
import { FormLabel } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
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

    const { link, action, setAction, setLink } = useCreateLinkStore();

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

        const label = link.linkType === LINK_TYPE.TIP_LINK ? "Tip" : "Claim";
        const message =
            link.linkType === LINK_TYPE.TIP_LINK
                ? LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP
                : link.description;
        const src =
            link.linkType === LINK_TYPE.TIP_LINK
                ? getTokenImage(link?.asset_info?.[0].address ?? "")
                : link.image;

        return (
            <div className="flex flex-col items-center justify-center mb-6 mt-4">
                <div className="relative h-[320px] aspect-[9/16]">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-5 bg-gray-700 rounded-b-lg z-10"></div>
                    <div className="h-full w-full border-[6px] border-gray-700 rounded-3xl bg-white overflow-hidden flex flex-col p-2">
                        <img src="logo.svg" className="w-[50%] mx-auto mt-6 mb-2" />
                        <div className="bg-lightgreen px-2 py-4 rounded-xl flex flex-col items-center justify-center">
                            <img src={src} alt={link.title} className="w-[50%] object-contain" />
                            <div className="flex-1 p-4 flex flex-col">
                                <h3 className="font-semibold mb-2 text-center">{link.title}</h3>
                                <p className="text-[10px] text-gray-600 text-center">{message}</p>
                            </div>
                            <button className="bg-green text-white rounded-full w-full py-1 text-[10px]">
                                Claim
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
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
            <div className="flex justify-between items-center mb-2">
                <Label>{t("create.preview")}</Label>
            </div>
            {renderLinkCard()}

            <LinkPreviewCashierFeeSection
                intents={feeData ?? []}
                onInfoClick={() => setShowInfo(true)}
            />

            <FixedBottomButton
                type="submit"
                variant="default"
                size="lg"
                className=""
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
