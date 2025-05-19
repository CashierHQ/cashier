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
