import { Phone } from "./ui/phone-frame";

export default function LinkCard({
    src,
    header,
    title,
    message,
    label,
    onClaim,
}: {
    src: string;
    header?: string;
    title: string;
    message: string;
    label: string;
    onClaim?: () => void;
}) {
    /* TODO: Remove after we have all the flows for templates */
    const comingSoonLabel = header?.includes("(Coming soon)") ? "Coming soon" : "";

    const renderHeaderTitle = () => {
        if (comingSoonLabel.length > 0) {
            return (
                <span>
                    {header?.replace("(Coming soon)", "").trim()}{" "}
                    <span className="text-red-500 font-bold">{`(Coming soon)`}</span>
                </span>
            );
        } else {
            return <span>{header}</span>;
        }
    };

    return (
        <div className="flex flex-col flex-grow justify-center items-center">
            <div className="text-md md:text-md 2xl:text-lg font-medium mb-3 md:mb-1 2xl:mb-3">
                {renderHeaderTitle()}
            </div>

            <Phone.Frame className="h-[380px] sm:h-[420px] md:h-[320px] 2xl:h-[420px]">
                <Phone.Notch />

                <div className="w-full flex justify-center items-center mt-3 md:mt-1 2xl:mt-3">
                    <img src="./logo.svg" alt="Cashier logo" className="w-[60px] 2xl:w-[100px]" />
                </div>

                <div className="flex flex-col flex-grow items-center justify-center bg-lightgreen rounded-md mt-3 md:mt-1 2xl:mt-3 p-3 w-full">
                    <div className="overflow-hidden">
                        <img
                            src={src}
                            alt="Link template"
                            className="w-[200px] md:w-[60px] xl:w-[60px] 2xl:w-[80px] object-fit"
                        />
                    </div>

                    <h3 className="font-semibold py-2 md:py-1 2xl:py-2 text-xs">{title}</h3>
                    <h3 className="text-[0.4rem]">{message}</h3>
                    <div
                        className="text-white bg-green rounded-full py-1 mt-3 text-[0.5rem] md:text-[0.5rem] 2xl:text-[1rem] w-[90%] text-center"
                        onClick={onClaim}
                    >
                        {label}
                    </div>
                </div>
            </Phone.Frame>
        </div>
    );
}
