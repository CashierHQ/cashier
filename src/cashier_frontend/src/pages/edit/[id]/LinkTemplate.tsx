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
import LinkCard from "@/components/link-card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import {
    useBindFormAndCarousel,
    useCarousel,
    useLinkTemplateForm,
} from "@/components/link-template/link-template.hooks";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { LINK_TEMPLATES } from "@/constants/linkTemplates";
import { LINK_TYPE } from "@/services/types/enum";
import { useSetLinkTemplate } from "@/hooks/linkHooks";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { useButtonState } from "@/hooks/useButtonState";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
function isLinkTypeSupported(linkType: LINK_TYPE) {
    return linkType === LINK_TYPE.TIP_LINK;
}

export interface LinkTemplateProps {
    onSelectUnsupportedLinkType?: () => void;
}

export default function LinkTemplate({
    onSelectUnsupportedLinkType = () => {},
}: LinkTemplateProps) {
    const { t } = useTranslation();
    const { nextStep } = useMultiStepFormContext();

    const { link, setLink, updateLink } = useCreateLinkStore();
    const { mutateAsync: setLinkTemplate } = useSetLinkTemplate();
    const { isButtonDisabled, setButtonDisabled } = useButtonState();

    const selectedTemplate = useMemo(() => {
        return LINK_TEMPLATES.find((template) => template.label === link?.linkType);
    }, [link?.linkType]);

    const carousel = useCarousel();

    const form = useLinkTemplateForm({ title: link?.title || "" });

    useBindFormAndCarousel(form, carousel, updateLink);

    const handleSubmit = form.handleSubmit(async (data) => {
        setButtonDisabled(true);
        if (isLinkTypeSupported(data.linkType as LINK_TYPE)) {
            const updatedLink = await setLinkTemplate({
                link: link!,
                patch: {
                    title: data.title,
                    description: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP,
                    linkType: data.linkType as LINK_TYPE,
                },
            });

            setLink(updatedLink);
            nextStep();
        } else {
            onSelectUnsupportedLinkType();
        }
        setButtonDisabled(false);
    });

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            <Form {...form}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <div className="flex-shrink-0">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("create.linkName")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("create.linkNamePlaceholder")}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="w-full h-[1px] bg-gray-200 my-3" />
                        <FormLabel className="mx-1 mb-2">{t("create.linkType")}</FormLabel>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-lightgreen flex-1 rounded-md py-4 mb-4 h-full">
                        <div className="relative w-full overflow-hidden h-full">
                            <button
                                type="button"
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm disabled:opacity-50"
                                onClick={() =>
                                    carousel.setCurrent(Math.max(0, carousel.current - 1))
                                }
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
                                        className="flex-shrink-0 flex flex-col justify-center items-center p-4 h-[100%]"
                                        style={{ width: `${100 / LINK_TEMPLATES.length}%` }}
                                    >
                                        <div className="flex flex-col items-center justify-center mb-4">
                                            <p className="text-xl font-bold">{template.header}</p>
                                            <p className="text-sm text-gray-500">
                                                {template.isComingSoon && " (Coming soon)"}
                                            </p>
                                        </div>
                                        <div className="relative h-[90%]">
                                            <img
                                                src={template.src}
                                                alt={template.title}
                                                className="w-full h-auto object-contain max-h-full rounded-3xl mb-4 border-[6px] border-gray-700 aspect-[9/16] bg-white"
                                            />
                                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-5 bg-gray-700 rounded-b-lg z-10"></div>
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
                        </div>

                        <div className="flex gap-4 mt-4 bg-white/50 px-2 py-2 rounded-full">
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

                    <div className="w-full flex-shrink-0 mb-4 flex justify-center disabled:opacity-50 mt-auto">
                        <FixedBottomButton
                            type="submit"
                            variant="default"
                            size="lg"
                            className="w-[95%] max-w-[350px]"
                            disabled={isButtonDisabled || carousel.current !== 0}
                        >
                            {carousel.current === 0 ? t("continue") : "Coming Soon"}
                        </FixedBottomButton>
                    </div>
                </form>
            </Form>
        </div>
    );
}
