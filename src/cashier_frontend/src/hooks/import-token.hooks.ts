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
    indexCanisterId: z
        .string()
        .regex(CANISTER_ID_REGEX, i18n.t("import.form.indexCanisterId.error.format")),
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
