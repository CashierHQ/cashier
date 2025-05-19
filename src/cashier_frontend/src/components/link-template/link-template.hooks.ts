// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
            linkType: LINK_TYPE.SEND_TIP,
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

const TEMPLATE_ORDER = [LINK_TYPE.SEND_TIP, LINK_TYPE.SEND_AIRDROP, LINK_TYPE.SEND_TOKEN_BASKET];

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
