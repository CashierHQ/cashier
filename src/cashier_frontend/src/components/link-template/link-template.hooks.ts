import { LINK_TYPE } from "@/services/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { CarouselApi } from "../ui/carousel";

export const linkTemplateSchema = z.object({
    title: z
        .string()
        .min(5, "Link name must be at least 5 characters")
        .max(50, "Link name must be at most 50 characters"),
    linkType: z.string(),
});
export type LinkTemplateSchema = z.infer<typeof linkTemplateSchema>;

export function useLinkTemplateForm(defaultValues?: DefaultValues<LinkTemplateSchema>) {
    const form = useForm<LinkTemplateSchema>({
        resolver: zodResolver(linkTemplateSchema),
        defaultValues: {
            title: "",
            linkType: LINK_TYPE.NFT_CREATE_AND_AIRDROP,
            ...defaultValues,
        },
    });

    return form;
}

export function useCarousel() {
    const [current, setCurrent] = useState(0);
    const [api, setApi] = useState<CarouselApi>();

    useEffect(() => {
        if (api) {
            setCurrent(api.selectedScrollSnap());
            api.on("select", () => setCurrent(api.selectedScrollSnap()));
        }
    }, [api]);

    return {
        current,
        setCurrent,
        api,
        setApi,
    };
}

const TEMPLATE_ORDER = [LINK_TYPE.TIP_LINK, LINK_TYPE.AIRDROP, LINK_TYPE.TOKEN_BASKET];

export function useBindFormAndCarousel(
    form: UseFormReturn<LinkTemplateSchema>,
    carousel: ReturnType<typeof useCarousel>,
    onChange: (data: { linkType: LINK_TYPE }) => void,
) {
    useEffect(() => {
        onChange({
            linkType: TEMPLATE_ORDER[carousel.current],
        });
        form.setValue("linkType", TEMPLATE_ORDER[carousel.current]);
    }, [carousel.current]);
}
