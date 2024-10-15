import { cn } from "@/lib/utils";

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
    return (
        <div className="flex flex-col items-center bg-lightgreen rounded-md py-5 mt-5 h-[57vh]">
            <div className="text-lg font-medium">{header}</div>
            <div
                id="phone-frame"
                className="flex flex-col items-center bg-white rounded-[2rem] border-black border-8 mt-3 px-3 h-[95vw] w-[50vw] md:w-[70%]"
            >
                <div
                    id="phone-notch-section"
                    className="flex w-3/5 h-3 md:h-7 bg-black items-center border-black border-8 rounded-b-2xl"
                ></div>
                <div className="w-full flex justify-center items-center mt-3">
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[60px]" />
                </div>
                <div className="flex flex-col items-center bg-lightgreen rounded-md mt-3 p-3">
                    <img src={src} alt="Link template" />
                    <h3 className="font-semibold py-2 text-[0.7rem]">{title}</h3>
                    <h3 className="text-[0.5rem]">{message}</h3>
                    <div
                        className="text-white bg-green rounded-full py-1 mt-3 text-[0.6rem] w-[100%] text-center"
                        onClick={onClaim}
                    >
                        {label}
                    </div>
                </div>
            </div>
        </div>
    );
}
