import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { string, z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { ParitalFormProps } from "@/components/multi-step-form";
import LinkCard from "@/components/link-card";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import React, { useEffect } from "react";
import { LINK_TYPE } from "@/services/types/enum";

export const linkTemplateSchema = z.object({
    title: z.string().min(5),
    linkType: z.string(),
});

type LinkTemplateInput = z.infer<typeof linkTemplateSchema>;
const TEMPLATE_ORDER = [LINK_TYPE.TIP_LINK, LINK_TYPE.AIRDROP, LINK_TYPE.TOKEN_BASKET];

interface TEMPLATE {
    label: string;
    header: string;
    message: string;
    title: string;
    src: string;
}

const templates: TEMPLATE[] = [
    {
        label: "Claim",
        header: "Tip",
        src: "/icpLogo.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TIP,
        title: "Tipping crypto",
    },
    {
        label: "Claim",
        header: "Airdrop (Comming soon)",
        src: "/defaultLinkImage.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.NFT,
        title: "PEDRO giveaway",
    },
    {
        label: "Claim",
        header: "Token basket (Comming soon)",
        src: "/defaultLinkImage.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.NFT,
        title: "PEDRO giveaway",
    },
];

export default function LinkTemplate({
    defaultValues = {},
    handleSubmit,
    handleChange,
}: ParitalFormProps<LinkTemplateInput, Partial<LinkTemplateInput>>) {
    const { t } = useTranslation();
    const [api, setApi] = React.useState<CarouselApi>();
    const [current, setCurrent] = React.useState(0);
    //const [count, setCount] = React.useState(0);
    const form = useForm<z.infer<typeof linkTemplateSchema>>({
        resolver: zodResolver(linkTemplateSchema),
        defaultValues: {
            title: "",
            linkType: LINK_TYPE.NFT_CREATE_AND_AIRDROP,
            ...defaultValues,
        },
    });

    useEffect(() => {
        if (!api) {
            return;
        }

        //setCount(api.scrollSnapList().length);
        setCurrent(api.selectedScrollSnap());

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap());
        });
    }, [api]);

    useEffect(() => {
        handleChange({
            linkType: TEMPLATE_ORDER[current],
        });
        form.setValue("linkType", TEMPLATE_ORDER[current]);
    }, [current]);

    return (
        <div className="w-full flex flex-col">
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    onChange={(e: React.ChangeEvent<HTMLFormElement>) => {
                        if (e.target.name == "title") {
                            handleChange({
                                title: e.target.value,
                            });
                        }
                    }}
                >
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
                    <div className="flex flex-col items-center bg-lightgreen rounded-md py-3 md:py-2 2xl:py-3 my-3 h-[52vh] 2xl:h-[60vh]">
                        <Carousel className="items-center" setApi={setApi}>
                            <CarouselContent>
                                {templates.map((template, index) => (
                                    <CarouselItem key={`template-${index}`}>
                                        <LinkCard
                                            label={template.label}
                                            header={template.header}
                                            src="/icpLogo.png"
                                            message={template.message}
                                            title={template.title}
                                        />
                                    </CarouselItem>
                                ))}

                                {/* <CarouselItem>
                                    <LinkCard
                                        label="Claim"
                                        header="Default Template"
                                        src="/defaultLinkImage.png"
                                        message={LINK_TEMPLATE_DESCRIPTION_MESSAGE.NFT}
                                        title="PEDRO giveaway"
                                    />
                                </CarouselItem> */}
                            </CarouselContent>
                        </Carousel>
                    </div>

                    <FixedBottomButton type="submit">{t("continue")}</FixedBottomButton>
                </form>
            </Form>
        </div>
    );
}
