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

export default function TipLinkTemplateCard({
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
        <div className="flex flex-col items-center bg-lightgreen rounded-md py-3 my-3 h-[55vh]">
            <div className="text-lg font-medium">{header}</div>
            <div
                id="phone-frame"
                className="flex flex-col items-center bg-white rounded-[2rem] border-black border-8 mt-3 px-3 h-[85vw] w-[50vw] md:w-[70%]"
            >
                <div
                    id="phone-notch-section"
                    className="flex w-3/5 h-3 md:h-7 bg-black items-center border-black border-8 rounded-b-2xl"
                ></div>
                <div className="w-full flex justify-center items-center mt-3">
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[60px]" />
                </div>
                <div className="flex flex-col items-center bg-lightgreen rounded-md mt-3 p-3 max-h-[70%]">
                    <div className="overflow-hidden">
                        <img src={src} alt="Link template" width={70} />
                    </div>

                    <h3 className="font-semibold py-2 text-[0.5rem]">{title}</h3>
                    <h3 className="text-[0.4rem]">{message}</h3>
                    <div
                        className="text-white bg-green rounded-full py-1 mt-3 text-[0.5rem] w-[90%] text-center"
                        onClick={onClaim}
                    >
                        {label}
                    </div>
                </div>
            </div>
        </div>
    );
}
