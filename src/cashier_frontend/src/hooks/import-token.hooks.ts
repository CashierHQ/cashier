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

import { CANISTER_ID_REGEX } from "@/constants/regexp";
import { Chain } from "@/services/types/link.service.types";
import { zodResolver } from "@hookform/resolvers/zod";
import i18n from "@/locales/config";
import { useForm } from "react-hook-form";
import z from "zod";

const importTokenFormSchema = z.object({
    chain: z.string().min(1, i18n.t("import.form.chain.error.required")),
    ledgerCanisterId: z
        .string()
        .min(1, i18n.t("import.form.ledgerCanisterId.error.required"))
        .regex(CANISTER_ID_REGEX, i18n.t("import.form.ledgerCanisterId.error.format")),
    indexCanisterId: z.string().refine(
        (val) => {
            const isEmpty = val === "";
            const isCanisterId = CANISTER_ID_REGEX.test(val);

            return isEmpty || isCanisterId;
        },
        {
            message: i18n.t("import.form.indexCanisterId.error.format"),
        },
    ),
});
export type ImportTokenFormData = z.infer<typeof importTokenFormSchema>;

export function useImportTokenForm() {
    const form = useForm({
        resolver: zodResolver(importTokenFormSchema),
        defaultValues: {
            chain: Chain.IC,
            ledgerCanisterId: "",
            indexCanisterId: "",
        },
    });

    return form;
}
