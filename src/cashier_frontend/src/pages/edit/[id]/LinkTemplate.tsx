import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useCarousel } from "@/components/link-template/link-template.hooks";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { LINK_TEMPLATES } from "@/constants/linkTemplates";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { useSetLinkTemplate } from "@/hooks/linkHooks";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { useButtonState } from "@/hooks/useButtonState";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import PhonePreview from "@/components/ui/phone-preview";
import { useResponsive } from "@/hooks/responsive-hook";
import { Label } from "@/components/ui/label";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import useToast from "@/hooks/useToast";
import TransactionToast from "@/components/transaction/transaction-toast";
function isLinkTypeSupported(linkType: LINK_TYPE) {
    return linkType === LINK_TYPE.SEND_TIP || linkType === LINK_TYPE.SEND_TOKEN_BASKET;
}

export interface LinkTemplateProps {
    onSelectUnsupportedLinkType?: () => void;
}

export default function LinkTemplate({
    onSelectUnsupportedLinkType = () => {},
}: LinkTemplateProps) {
    const { t } = useTranslation();
    const { nextStep } = useMultiStepFormContext();
    const { updateUserInput, getUserInput, userInputs } = useLinkCreationFormStore();

    const { toastData, showToast, hideToast } = useToast();

    const responsive = useResponsive();

    const { link, setLink } = useLinkActionStore();
    const { mutateAsync: setLinkTemplate } = useSetLinkTemplate();
    const { isButtonDisabled, setButtonDisabled } = useButtonState();

    const carousel = useCarousel();

    const handleSubmit = async () => {
        const currentLink = link ? getUserInput(link.id) : undefined;

        if (!currentLink?.title) {
            showToast("Error", "Please enter a title", "error");
            return;
        }

        setButtonDisabled(true);
        if (isLinkTypeSupported(currentLink?.linkType as LINK_TYPE)) {
            const updatedLink = await setLinkTemplate({
                link: link!,
                patch: {
                    title: currentLink?.title ?? "",
                    description: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP,
                    linkType: currentLink?.linkType as LINK_TYPE,
                },
            });
            setLink(updatedLink);

            updateUserInput(
                link!.id, // Ensure link.id is not undefined
                {
                    state: LINK_STATE.ADD_ASSET,
                },
            );
            nextStep();
        } else {
            onSelectUnsupportedLinkType();
        }
        setButtonDisabled(false);
    };

    useEffect(() => {
        carousel.setCurrent(
            LINK_TEMPLATES.findIndex((template) => template.linkType === link?.linkType) || 0,
        );
    }, [link]);

    useEffect(() => {
        const selectedTemplate = LINK_TEMPLATES[carousel.current];
        console.log(selectedTemplate);
        if (link?.id) {
            updateUserInput(link.id, {
                linkType: selectedTemplate.linkType,
            });
        }
    }, [carousel.current]);

    if (!link) {
        return null;
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
                <div className="input-label-field-container mt-2">
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
                </div>

                <Separator className="my-4 max-w-[100%] mx-auto opacity-50" />
            </div>

            <div className="input-label-field-container">
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
                            className="relative flex transition-transform duration-300 ease-in-out h-[20rem] md:h-[420px] pb-2"
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

            <FixedBottomButton
                onClick={handleSubmit}
                variant="default"
                size="lg"
                disabled={isButtonDisabled || LINK_TEMPLATES[carousel.current].isComingSoon}
            >
                {LINK_TEMPLATES[carousel.current].isComingSoon ? "Coming Soon" : t("continue")}
            </FixedBottomButton>

            <TransactionToast
                open={toastData?.open ?? false}
                onOpenChange={hideToast}
                title={toastData?.title ?? ""}
                description={toastData?.description ?? ""}
                variant={toastData?.variant ?? "default"}
            />
        </div>
    );
}
