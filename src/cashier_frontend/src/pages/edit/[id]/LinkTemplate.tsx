// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useCarousel } from "@/components/link-template/link-template.hooks";
import { LINK_TEMPLATES } from "@/constants/linkTemplates";
import { getAssetLabelForLinkType, LINK_TYPE } from "@/services/types/enum";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PhonePreview from "@/components/ui/phone-preview";
import { useDeviceSize } from "@/hooks/responsive-hook";
import { Label } from "@/components/ui/label";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { useLinkAction } from "@/hooks/useLinkAction";
import { stateToStepIndex } from ".";
import { MessageBanner } from "@/components/ui/message-banner";
import { toast } from "sonner";

function isLinkTypeSupported(linkType: LINK_TYPE) {
    const supportedLinkTypes = [
        LINK_TYPE.SEND_TIP,
        LINK_TYPE.SEND_TOKEN_BASKET,
        LINK_TYPE.SEND_AIRDROP,
        LINK_TYPE.RECEIVE_PAYMENT,
    ];

    return supportedLinkTypes.includes(linkType);
}

export interface LinkTemplateProps {
    onSelectUnsupportedLinkType?: () => void;
}

export default function LinkTemplate({
    onSelectUnsupportedLinkType = () => {},
}: LinkTemplateProps) {
    const { t } = useTranslation();
    const { setStep } = useMultiStepFormContext();
    const { updateUserInput, getUserInput, userInputs, setButtonState } =
        useLinkCreationFormStore();

    const responsive = useDeviceSize();

    const { link, callLinkStateMachine, isUpdating } = useLinkAction();

    const carousel = useCarousel();

    const [showComingSoonError, setShowComingSoonError] = useState(false);
    const [showNoNameError, setShowNoNameError] = useState(false);

    const handleSubmit = async () => {
        const supportMultiAsset = [LINK_TYPE.SEND_TOKEN_BASKET];

        const currentLink = link ? getUserInput(link.id) : undefined;

        if (!currentLink?.title || currentLink.title.trim() === "") {
            setShowNoNameError(true);
            return;
        }

        if (LINK_TEMPLATES[carousel.current].isComingSoon) {
            setShowComingSoonError(true);
            return;
        }

        if (isLinkTypeSupported(currentLink?.linkType as LINK_TYPE)) {
            if (!currentLink || !currentLink.linkId) {
                toast.error(t("common.error"), {
                    description: t("link_template.error.link_not_found"),
                });
                return;
            }

            // force the asset should change the label if transition from multiple to single asset
            if (
                !supportMultiAsset.includes(currentLink?.linkType as LINK_TYPE) &&
                currentLink.assets &&
                currentLink.assets.length > 1
            ) {
                const forceNewAsset = currentLink.assets[0];
                forceNewAsset.label = getAssetLabelForLinkType(
                    currentLink.linkType as LINK_TYPE,
                    forceNewAsset.address,
                );
                currentLink.assets = [forceNewAsset];
            }

            try {
                const stateMachineRes = await callLinkStateMachine({
                    linkId: currentLink.linkId,
                    linkModel: currentLink,
                    isContinue: true,
                });

                console.log("🚀 ~ stateMachineRes:", stateMachineRes);

                const stepIndex = stateToStepIndex(stateMachineRes.state);
                setStep(stepIndex);
            } catch (error) {
                console.error("Error calling state machine", error);
                toast.error(t("common.error"), {
                    description: t("link_template.error.failed_to_call"),
                });
            }
        } else {
            onSelectUnsupportedLinkType();
        }
    };

    useEffect(() => {
        carousel.setCurrent(
            LINK_TEMPLATES.findIndex((template) => template.linkType === link?.linkType) || 0,
        );
    }, [link]);

    useEffect(() => {
        const selectedTemplate = LINK_TEMPLATES[carousel.current];
        if (link?.id) {
            updateUserInput(link.id, {
                linkType: selectedTemplate.linkType,
            });
        }
    }, [carousel.current]);

    // Update button state
    useEffect(() => {
        const currentTemplate = LINK_TEMPLATES[carousel.current];
        const isComingSoon = currentTemplate.isComingSoon;

        setButtonState({
            label: isComingSoon ? "Coming Soon" : t("continue"),
            isDisabled: isUpdating,
            action: handleSubmit,
        });
    }, [carousel.current, userInputs, isUpdating, link]);

    if (!link) {
        return null;
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden mt-2">
            <div className="flex-shrink-0">
                <div className="input-label-field-container">
                    <Label>{t("create.linkName")}</Label>
                    <Input
                        value={userInputs.get(link.id)?.title}
                        onChange={(e) => {
                            updateUserInput(link.id, {
                                title: e.target.value,
                            });
                        }}
                        placeholder={t("create.linkNamePlaceholder")}
                    />
                    {showNoNameError && (
                        <MessageBanner variant="info" text={t("create.errors.no_name")} />
                    )}
                </div>
            </div>

            <div className="input-label-field-containe mt-4">
                <Label>{t("create.linkType")}</Label>
                <div className="flex flex-col items-center justify-center bg-lightgreen rounded-[16px] py-3 h-fit">
                    <div className="relative w-full overflow-hidden h-full">
                        <button
                            type="button"
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm disabled:opacity-50"
                            onClick={() => carousel.setCurrent(Math.max(0, carousel.current - 1))}
                            disabled={carousel.current === 0}
                        >
                            <ChevronLeft className="text-green" strokeWidth={1.7} />
                        </button>

                        <div
                            className="relative flex transition-transform duration-300 ease-in-out h-[20rem] md:h-[400px] pb-2"
                            style={{
                                transform: `translateX(-${carousel.current * (100 / LINK_TEMPLATES.length)}%)`,
                                width: `${LINK_TEMPLATES.length * 100}%`,
                            }}
                        >
                            {LINK_TEMPLATES.map((template, index) => (
                                <div
                                    key={`custom-template-${index}`}
                                    className="flex-shrink-0 flex flex-col justify-center items-center px-2 h-[100%]"
                                    style={{ width: `${100 / LINK_TEMPLATES.length}%` }}
                                >
                                    <div className="flex flex-col items-center justify-center mb-2 gap-0">
                                        <p className="text-[14px] font-medium uppercase">
                                            {template.header}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {template.isComingSoon && " (Coming soon)"}
                                        </p>
                                    </div>
                                    <div className="relative h-fit">
                                        <PhonePreview
                                            src={template.src}
                                            title={template.title}
                                            message={template.message}
                                            small={responsive.isSmallDevice}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm disabled:opacity-50"
                            onClick={() =>
                                carousel.setCurrent(
                                    Math.min(LINK_TEMPLATES.length - 1, carousel.current + 1),
                                )
                            }
                            disabled={carousel.current === LINK_TEMPLATES.length - 1}
                        >
                            <ChevronRight className="text-green" strokeWidth={1.7} />
                        </button>

                        <div className="flex gap-4 mt-0 items-center justify-center w-full">
                            <div className="flex gap-4 bg-white/50 px-2 py-2 rounded-full">
                                {LINK_TEMPLATES.map((_, index) => (
                                    <button
                                        key={`dot-${index}`}
                                        type="button"
                                        className={`w-2 h-2 rounded-full ${
                                            index === carousel.current ? "bg-green" : "bg-white"
                                        }`}
                                        onClick={() => carousel.setCurrent(index)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
