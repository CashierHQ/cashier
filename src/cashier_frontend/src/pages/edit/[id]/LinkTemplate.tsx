import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import {
    useBindFormAndCarousel,
    useCarousel,
    useLinkTemplateForm,
} from "@/components/link-template/link-template.hooks";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { LINK_TEMPLATES } from "@/constants/linkTemplates";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { useSetLinkTemplate } from "@/hooks/linkHooks";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { useButtonState } from "@/hooks/useButtonState";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import PhonePreview from "@/components/ui/phone-preview";
import { useResponsive } from "@/hooks/responsive-hook";
import { Label } from "@/components/ui/label";
import { Message } from "@/components/ui/message";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import useToast from "@/hooks/useToast";
import TransactionToast from "@/components/transaction/transaction-toast";
function isLinkTypeSupported(linkType: LINK_TYPE) {
    return linkType === LINK_TYPE.SEND_TIP;
}

export interface LinkTemplateProps {
    onSelectUnsupportedLinkType?: () => void;
}

export default function LinkTemplate({
    onSelectUnsupportedLinkType = () => {},
}: LinkTemplateProps) {
    const { t } = useTranslation();
    const { nextStep } = useMultiStepFormContext();
    const linkCreationFormStore = useLinkCreationFormStore();

    const { toastData, showToast, hideToast } = useToast();

    const responsive = useResponsive();

    const { link, setLink, updateLink } = useLinkActionStore();
    const { mutateAsync: setLinkTemplate } = useSetLinkTemplate();
    const { isButtonDisabled, setButtonDisabled } = useButtonState();

    const carousel = useCarousel();

    const handleSubmit = async () => {
        const currentLink = linkCreationFormStore.userInputs.find(
            (input) => input.linkId === link?.id,
        );

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

            linkCreationFormStore.updateUserInput(
                linkCreationFormStore.userInputs.findIndex((input) => input.linkId === link?.id),
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
        const selectedTemplate = LINK_TEMPLATES[carousel.current];
        console.log(selectedTemplate);
        linkCreationFormStore.updateUserInput(
            linkCreationFormStore.userInputs.findIndex((input) => input.linkId === link?.id),
            {
                linkType: selectedTemplate.linkType,
            },
        );
    }, [carousel.current]);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <Label>{t("create.linkName")}</Label>
                    </div>
                    <Input
                        value={
                            linkCreationFormStore.userInputs.find(
                                (input) => input.linkId === link?.id,
                            )?.title
                        }
                        onChange={(e) => {
                            linkCreationFormStore.updateUserInput(
                                linkCreationFormStore.userInputs.findIndex(
                                    (input) => input.linkId === link?.id,
                                ),
                                {
                                    title: e.target.value,
                                },
                            );
                        }}
                        className="pl-3 py-5 text-md rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                        placeholder={t("create.linkNamePlaceholder")}
                    />
                    {/* <Message>{t("create.linkNamePlaceholder")}</Message> */}
                </div>

                <Separator className="mt-3 mb-4 max-w-[97%] mx-auto" />

                <div className="flex justify-between items-center mb-2">
                    <Label>{t("create.linkType")}</Label>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-lightgreen rounded-md py-4 mb-4 h-fit">
                <div className="relative w-full overflow-hidden h-full">
                    <button
                        type="button"
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm disabled:opacity-50"
                        onClick={() => carousel.setCurrent(Math.max(0, carousel.current - 1))}
                        disabled={carousel.current === 0}
                    >
                        <ChevronLeft className="text-green" strokeWidth={3} />
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
                                className="flex-shrink-0 flex flex-col justify-center items-center p-2 h-[100%]"
                                style={{ width: `${100 / LINK_TEMPLATES.length}%` }}
                            >
                                <div className="flex flex-col items-center justify-center mb-2 gap-0">
                                    <p className="text-xl font-bold">{template.header}</p>
                                    <p className="text-sm text-gray-500">
                                        {template.isComingSoon && " (Coming soon)"}
                                    </p>
                                </div>
                                <div className="relative h-[90%] aspect-[9/16]">
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
                        <ChevronRight className="text-green" strokeWidth={3} />
                    </button>

                    <div className="flex gap-4 mt-4 items-center justify-center w-full">
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

            <div className="w-full flex-shrink-0 mb-4 flex justify-center disabled:opacity-50 mt-auto">
                <FixedBottomButton
                    onClick={handleSubmit}
                    variant="default"
                    size="lg"
                    className="w-[95%] max-w-[350px]"
                    disabled={isButtonDisabled || carousel.current !== 0}
                >
                    {carousel.current === 0 ? t("continue") : "Coming Soon"}
                </FixedBottomButton>
            </div>

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
