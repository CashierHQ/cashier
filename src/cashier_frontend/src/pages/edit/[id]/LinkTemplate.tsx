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
import { Button } from "@/components/ui/button";
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
        <div className="w-full flex flex-col flex-grow overflow-hidden">
            <Form {...form}>
                <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
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
                    <div className="flex flex-grow flex-col items-center bg-lightgreen rounded-md py-3 md:py-2 2xl:py-3">
                        <Carousel className="items-center" setApi={carousel.setApi}>
                            <CarouselContent>
                                {LINK_TEMPLATES.map((template, index) => (
                                    <CarouselItem key={`template-${index}`}>
                                        <LinkCard
                                            label={template.label}
                                            header={template.header}
                                            src={template.src}
                                            message={template.message}
                                            title={template.title}
                                        />
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </div>

                    <Button
                        type="submit"
                        className="my-3 mx-auto w-[95%]"
                        disabled={isButtonDisabled}
                        size="lg"
                    >
                        {t("continue")}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
