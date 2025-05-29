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

import { FC } from "react";
import { useTranslation } from "react-i18next";

export const ConfirmationPopupLegalSection: FC = () => {
    const { t } = useTranslation();

    return (
        <section id="confirmation-popup-section-legal-text" className="mb-3 ml-2 mt-2">
            <p className="text-[14px] font-normal text-center px-4">
                By confirming, you agree to the{" "}
                <a
                    className="text-[#36a18b]"
                    target="_blank"
                    href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-7212/01084c48b7877f0"
                >
                    Terms of Service
                </a>{" "}
                and{" "}
                <a
                    className="text-[#36a18b]"
                    target="_blank"
                    href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-7232/38befdcfae1af1b"
                >
                    Privacy Policy
                </a>
            </p>
        </section>
    );
};
