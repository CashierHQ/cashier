import { cn } from "@/lib/utils";

export default function LinkCardWithoutPhoneFrame({
    src,
    title,
    message,
    label,
    onClaim,
    disabled,
}: {
    src: string;
    header?: string;
    title: string;
    message: string;
    label: string;
    onClaim?: () => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex flex-col items-center bg-lightgreen rounded-xl mt-5 py-5 px-8">
            <div className="flex flex-col items-center bg-lightgreen rounded-xl mt-3 p-3">
                <img
                    src={src}
                    alt="Link template"
                    className="w-[250px] md:w-[60px] xl:w-[60px] 2xl:w-[100px]"
                />
                <div className="mb-8 text-center">
                    <h3 className="text-lg font-semibold py-2">{title}</h3>
                    <h3 className="text-md text-[#475467]">{message}</h3>
                </div>

                {disabled ? (
                    <div
                        className={cn(
                            "text-green bg-white rounded-full py-3 px-8 mt-3 text-base w-[100%] text-center font-bold",
                            onClaim ? "cursor-pointer" : "",
                        )}
                    >
                        {label}
                    </div>
                ) : (
                    <div
                        className={cn(
                            "text-white bg-green rounded-full py-3 px-8 mt-3 text-base w-[100%] text-center",
                            onClaim ? "cursor-pointer" : "",
                        )}
                        onClick={onClaim}
                    >
                        {label}
                    </div>
                )}
            </div>
        </div>
    );
}
