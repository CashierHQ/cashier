import { CANISTER_ID_REGEX } from "@/constants/regexp";
import { Chain } from "@/services/types/link.service.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { t as st } from "i18next";
import { useForm } from "react-hook-form";
import z from "zod";

const importTokenFormSchema = z.object({
    chain: z.string().min(1, st("import.form.chain.error.required")),
    ledgerCanisterId: z
        .string()
        .min(1, st("import.form.ledgerCanisterId.error.required"))
        .regex(CANISTER_ID_REGEX, st("import.form.ledgerCanisterId.error.format")),
    indexCanisterId: z
        .string()
        .regex(CANISTER_ID_REGEX, st("import.form.indexCanisterId.error.format")),
});
export type ImportTokenFormSchema = z.infer<typeof importTokenFormSchema>;

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
