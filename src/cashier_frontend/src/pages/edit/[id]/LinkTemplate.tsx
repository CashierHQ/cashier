// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useCarousel } from "@/components/link-template/link-template.hooks";
import { LINK_TEMPLATES } from "@/constants/linkTemplates";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PhonePreview from "@/components/ui/phone-preview";
import { useDeviceSize } from "@/hooks/responsive-hook";
import { Label } from "@/components/ui/label";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { toast } from "sonner";
import { useLinkTemplateValidation } from "@/hooks/form/useLinkTemplateValidation";
import { useLinkTemplateHandler } from "@/hooks/form/usePageSubmissionHandlers";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useUpdateLinkMutation } from "@/hooks/link-hooks";

export interface LinkTemplateProps {
    onSelectUnsupportedLinkType?: () => void;
    link: LinkDetailModel;
}

export default function LinkTemplate({
    onSelectUnsupportedLinkType = () => {},
    link,
}: LinkTemplateProps) {
    const { t } = useTranslation();
    const { updateUserInput, userInputs, setButtonState } = useLinkCreationFormStore();

    const responsive = useDeviceSize();

    const carousel = useCarousel();

    // Use centralized validation hook - now with toast notifications
    const { validationState, clearValidationError, clearValidationErrorsByField } =
        useLinkTemplateValidation();

    // Use centralized template submission handler
    const { submitTemplate } = useLinkTemplateHandler(link);

    // Get loading state from update mutation if available
    const updateLinkMutation = useUpdateLinkMutation();

    const handleSubmit = async () => {
        const customErrorHandler = (error: Error) => {
            console.error("Error calling state machine", error);
            toast.error(t("common.error"), {
                description: t("link_template.error.failed_to_call"),
            });
        };

        await submitTemplate(onSelectUnsupportedLinkType, customErrorHandler);
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

        // Clear coming soon error when carousel changes
        if (validationState.showComingSoonError) {
            clearValidationError("showComingSoonError");
        }
    }, [carousel.current, link?.id, validationState.showComingSoonError, clearValidationError]);

    // Update button state
    useEffect(() => {
        const currentTemplate = LINK_TEMPLATES[carousel.current];
        const isComingSoon = currentTemplate.isComingSoon;

        setButtonState({
            label: isComingSoon ? "Coming Soon" : t("continue"),
            isDisabled: updateLinkMutation.isPending,
            action: handleSubmit,
        });
    }, [carousel.current, userInputs, updateLinkMutation.isPending, link]);

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
                            // Clear name validation error when user starts typing
                            if (validationState.showNoNameError) {
                                clearValidationError("showNoNameError");
                            }
                            // Clear any field-specific validation errors for title
                            clearValidationErrorsByField("title");

                            updateUserInput(link.id, {
                                title: e.target.value,
                            });
                        }}
                        placeholder={t("create.linkNamePlaceholder")}
                    />
                    {/* Name validation error no longer shown here - using toast instead */}
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

                {/* All validation errors are now displayed via toast notifications */}
            </div>
        </div>
    );
}
