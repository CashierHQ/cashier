// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export interface UIResponsiveType {
    htmlId: string;
    responsive: {
        mobile: string;
        tablet?: string;
        desktop?: string;
        widescreen?: string;
    };
}

export const responsiveMapper: UIResponsiveType[] = [
    {
        htmlId: "edit_multistepform_wrapper",
        responsive: {
            mobile: "w-screen h-dvh max-h-dvh flex flex-col items-center py-3",
            tablet: "w-screen h-dvh max-h-dvh flex flex-col items-center py-3",
            desktop:
                "h-[90%] w-[40%] flex flex-col items-center py-5 bg-[white] rounded-md drop-shadow-md",
            widescreen:
                "h-[90%] w-[40%] flex flex-col items-center py-5 bg-[white] rounded-md drop-shadow-md",
        },
    },
];
