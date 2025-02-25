import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { ImportTokenFormData, useImportTokenForm } from "@/hooks/import-token.hooks";
import { Message } from "../ui/message";
import { Clipboard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Chain } from "@/services/types/link.service.types";

interface ImportTokenFormProps {
    onSubmit?: (data: ImportTokenFormData) => void;
}

export function ImportTokenForm({ onSubmit = () => {} }: ImportTokenFormProps) {
    const { t } = useTranslation();
    const form = useImportTokenForm();

    const handleSubmit = form.handleSubmit(onSubmit);

    return (
        <Form {...form}>
            <form className="flex flex-col flex-grow" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6 flex-grow py-6">
                    <FormField
                        name="chain"
                        render={({ field: { ref, ...field } }) => {
                            return (
                                <FormItem>
                                    <FormLabel>{t("import.form.chain.label")}:</FormLabel>
                                    <Select {...field}>
                                        <SelectTrigger ref={ref}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(Chain).map((chain) => (
                                                <SelectItem key={chain} value={chain}>
                                                    {chain}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            );
                        }}
                    />

                    <Message>{t("import.form.message1")}</Message>

                    <FormField
                        name="ledgerCanisterId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("import.form.ledgerCanisterId.label")}:</FormLabel>
                                <div className="relative">
                                    <Input
                                        {...field}
                                        className="placeholder:text-grey pr-9"
                                        placeholder={t("import.form.ledgerCanisterId.placeholder")}
                                    />
                                    <Clipboard
                                        className="absolute top-1/2 -translate-y-1/2 right-3 stroke-green "
                                        size={16}
                                    />
                                </div>

                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Message>{t("import.form.message2")}</Message>

                    <FormField
                        name="indexCanisterId"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between">
                                    <FormLabel>{t("import.form.indexCanisterId.label")}:</FormLabel>
                                    <p className="text-green text-sm leading-none">
                                        {t("optional")}
                                    </p>
                                </div>

                                <div className="relative">
                                    <Input
                                        {...field}
                                        className="placeholder:text-grey pr-9"
                                        placeholder={t("import.form.indexCanisterId.placeholder")}
                                    />
                                    <Clipboard
                                        className="absolute top-1/2 -translate-y-1/2 right-3 stroke-green "
                                        size={16}
                                    />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button>{t("continue")}</Button>
            </form>
        </Form>
    );
}
