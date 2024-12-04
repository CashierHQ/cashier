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
            mobile: "w-screen flex flex-col items-center py-3",
            tablet: "w-screen flex flex-col items-center py-3",
            desktop:
                "h-[90%] w-[30%] flex flex-col items-center py-5 bg-[white] rounded-md drop-shadow-md",
            widescreen:
                "h-[90%] w-[30%] flex flex-col items-center py-5 bg-[white] rounded-md drop-shadow-md",
        },
    },
];
