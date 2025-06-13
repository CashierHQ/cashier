// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export default function PhonePreview({
    src,
    title,
    message,
    small = false,
}: {
    src: string;
    title: string;
    message: string;
    small?: boolean;
}) {
    return (
        <div className="flex flex-col items-center justify-center mb-0 mt-4">
            <div
                className={`relative ${small ? "h-[250px] aspect-[9/16]" : "h-[320px] aspect-[9/16]"}`}
            >
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-5 bg-gray-700 rounded-b-lg z-10"></div>
                <div className="h-full w-full border-[6px] border-gray-700 rounded-3xl bg-white overflow-hidden flex flex-col justify-center items-center px-2 py-4">
                    <img
                        src="logo.svg"
                        className={`w-[50%] mx-auto mt-6 mb-2 ${small ? "mt-0" : "mt-6"}`}
                    />
                    <div className="bg-lightgreen px-2 py-4 rounded-xl flex flex-col items-center justify-center">
                        <img src={src} alt={title} className={`w-[50%] object-contain`} />
                        <div className="flex-1 p-4 flex flex-col">
                            <h3
                                className={`font-semibold mb-2 text-center ${small ? "text-[8px]" : ""}`}
                            >
                                {title}
                            </h3>
                            <p
                                className={`text-[10px] text-gray-600 text-center ${small ? "text-[6px]" : ""}`}
                            >
                                {message}
                            </p>
                        </div>
                        <button
                            disabled
                            className={`bg-green text-white rounded-full w-full py-1 text-[10px] ${small ? "text-[8px] py-0.5" : ""}`}
                        >
                            {title.toLowerCase().includes("receive") ? "Pay" : "Claim"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
