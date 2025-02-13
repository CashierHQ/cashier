import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { PartialFormProps } from "@/components/multi-step-form";
import LinkCard from "@/components/link-card";
import { LINK_TEMPLATE_DESCRIPTION_MESSAGE } from "@/constants/message";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import React, { useEffect } from "react";
import { LINK_TYPE } from "@/services/types/enum";
import { Button } from "@/components/ui/button";

export const linkTemplateSchema = z.object({
    title: z.string().min(5),
    linkType: z.string(),
});

export type LinkTemplateInput = z.infer<typeof linkTemplateSchema>;
const TEMPLATE_ORDER = [LINK_TYPE.TIP_LINK, LINK_TYPE.AIRDROP, LINK_TYPE.TOKEN_BASKET];

interface TEMPLATE {
    label: string;
    header: string;
    message: string;
    title: string;
    src: string;
}

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
        header: "Airdrop (Coming soon)",
        src: "/chatToken.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.AIRDROP,
        title: "Airdrop",
    },
    {
        label: "Claim",
        header: "Token basket (Coming soon)",
        src: "/tokenBasket.png",
        message: LINK_TEMPLATE_DESCRIPTION_MESSAGE.TOKEN_BASKET,
        title: "Token basket",
    },
];

export default function LinkTemplate({
    defaultValues = {},
    handleSubmit,
    handleChange,
}: PartialFormProps<LinkTemplateInput, Partial<LinkTemplateInput>>) {
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
        <div className="w-full flex flex-col flex-grow overflow-hidden">
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
                    className="flex flex-col flex-grow"
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
                    <div className="flex flex-grow flex-col justify-center items-center bg-lightgreen rounded-md py-3 md:py-2 2xl:py-3">
                        <Carousel className="items-center" setApi={setApi}>
                            <CarouselContent>
                                {templates.map((template, index) => (
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

                    <Button type="submit" className="my-3">
                        {t("continue")}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
