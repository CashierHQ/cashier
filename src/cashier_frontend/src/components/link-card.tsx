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
        <div className="flex flex-col justify-center items-center flex-grow">
            <div className="text-md md:text-md 2xl:text-lg font-medium mb-3 md:mb-1 2xl:mb-3">
                {renderHeaderTitle()}
            </div>
            <div
                id="phone-frame"
                className="flex flex-col items-center bg-white rounded-[2rem] md:rounded-[1.5rem] 2xl:rounded-[2rem] border-black border-8 mt-3 md:mt-1 2xl:mt-3 px-3 pb-10 aspect-[9/16] w-[50%] md:w-[40%]"
            >
                <div
                    id="phone-notch-section"
                    className="flex w-3/5 h-3 md:h-1 2xl:h-5 bg-black items-center border-black border-8 rounded-b-2xl md:rounded-b-xl 2xl:rounded-b-2xl"
                ></div>
                <div className="w-full flex justify-center items-center mt-3 md:mt-1 2xl:mt-3">
                    <img src="./logo.svg" alt="Cashier logo" className="w-[60px] 2xl:w-[100px]" />
                </div>
                <div className="flex flex-col flex-grow items-center justify-center bg-lightgreen rounded-md mt-3 md:mt-1 2xl:mt-3 p-3 md:h-[300px] w-[100%]">
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
            </div>
        </div>
    );
}
