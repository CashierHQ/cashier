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

import { useEffect, forwardRef, useRef, useState } from "react";
import { FiUploadCloud, FiTrash } from "react-icons/fi";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onFileChange: (file: File | null) => void;
}
const FileInput = forwardRef<HTMLInputElement, InputProps>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ defaultValue, onFileChange }: any) => {
        const inputRef = useRef<HTMLInputElement>(null);
        const [image, setImage] = useState<string | null>(defaultValue || null);

        const handleSelect = () => {
            inputRef.current?.click();
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImage(URL.createObjectURL(file));
            onFileChange(file);
        };

        const handleDelete = () => {
            inputRef.current!.value = "";
            setImage(null);
            onFileChange(null);
        };

        useEffect(() => {
            return () => {
                if (image) URL.revokeObjectURL(image);
                setImage(null);
            };
        }, []);

        useEffect(() => {
            setImage(defaultValue);
        }, [defaultValue]);

        return (
            <div
                tabIndex={0}
                className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-green mt-3"
            >
                {!image && (
                    <div
                        className="flex flex-col w-full items-center border-[1px] shadow-sm py-5 rounded-md cursor-pointer"
                        onClick={handleSelect}
                    >
                        <div className="p-2 w-[33px] rounded-full border-[1px] shadow-sm border-gray-200 text-green">
                            <FiUploadCloud size="15px" />
                        </div>
                        <p className="font-semibold text-green">Click to upload</p>
                        <p className="text-sm text-gray-400">JPG, PNG, or SVG (max. 500x500px)</p>
                    </div>
                )}
                {image && (
                    <div>
                        <img src={image} alt="image" className="rounded-[10px]" />
                        <div className="flex gap-x-[10px] mt-3">
                            <div
                                className="p-2 w-[38px] rounded-md border-[1px] shadow-sm border-gray-200 text-green"
                                onClick={handleDelete}
                            >
                                <FiTrash size="20px" />
                            </div>
                        </div>
                    </div>
                )}
                <input
                    type="file"
                    className="hidden"
                    accept="image/png, image/svg, image/jpeg"
                    ref={inputRef}
                    onChange={handleChange}
                />
            </div>
        );
    },
);
FileInput.displayName = "Input";

export { FileInput };
