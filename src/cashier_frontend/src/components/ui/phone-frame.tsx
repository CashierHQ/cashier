import { cn } from "@/lib/utils";
import { FC, forwardRef, HTMLAttributes } from "react";

const w = "w-[50%] md:w-[40%]";

export const PhoneNotch = forwardRef<
    HTMLDivElement,
    Omit<HTMLAttributes<HTMLDivElement>, "children">
>(({ className, ...props }, ref) => {
    return (
        <div
            data-name="phone-notch-section"
            ref={ref}
            className={cn(
                "flex w-3/5 h-3 md:h-1 2xl:h-5 bg-black items-center border-black border-8 rounded-b-2xl md:rounded-b-xl 2xl:rounded-b-2xl",
                className,
            )}
            {...props}
        />
    );
});

export const PhoneFrame = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ children, className, ...props }, ref) => {
        return (
            <div
                data-name="phone-frame"
                ref={ref}
                className={cn(
                    "flex flex-col items-center bg-white  rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] 2xl:rounded-[3rem] border-black border-8 mt-3 md:mt-1 2xl:mt-3 px-3 pb-10 aspect-[9/16]",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        );
    },
);

export const Phone = {
    Frame: PhoneFrame,
    Notch: PhoneNotch,
};
