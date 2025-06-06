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

import { IoMdCheckmark, IoMdClose } from "react-icons/io";
import { Spinner } from "./spinner";
import { FC } from "react";

export enum STATUS {
    SUCCESS,
    FAIL,
    IN_PROGRESS,
}

export type StatusProps = {
    status: STATUS | undefined;
    key?: string;
};

export const Status: FC<StatusProps> = ({ status }) => {
    const renderStatusIcon = () => {
        switch (status) {
            case STATUS.SUCCESS:
                return <IoMdCheckmark color="green" size={22} />;
            case STATUS.FAIL:
                return <IoMdClose color="red" size={22} />;
            case STATUS.IN_PROGRESS:
                return <Spinner width={22} />;
            default:
                return <IoMdCheckmark color="green" size={22} className="opacity-0" />;
        }
    };

    return renderStatusIcon();
};
