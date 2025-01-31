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
            mobile: "w-screen h-dvh max-h-dvh flex flex-col items-center pt-3 pb-20",
            tablet: "w-screen h-dvh max-h-dvh flex flex-col items-center pt-3 pb-14",
            desktop:
                "h-[90%] w-[40%] flex flex-col items-center pt-5 pb-14 bg-[white] rounded-md drop-shadow-md",
            widescreen:
                "h-[90%] w-[40%] flex flex-col items-center pt-5 pb-14 bg-[white] rounded-md drop-shadow-md",
        },
    },
];
