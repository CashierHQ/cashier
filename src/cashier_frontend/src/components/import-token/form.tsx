import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { IconInput } from "@/components/icon-input";
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
            <form className="flex flex-col flex-grow h-full" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6 flex-grow py-6">
                    <FormField
                        name="chain"
                        render={({ field: { ref, ...field } }) => {
                            return (
                                <FormItem>
                                    <FormLabel>{t("import.form.chain.label")}</FormLabel>
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
                                <FormLabel>{t("import.form.ledgerCanisterId.label")}</FormLabel>
                                <div className="relative">
                                    <IconInput
                                        type="text"
                                        step="any"
                                        placeholder={"_____-_____-_____-_____-cai"}
                                        isCurrencyInput={false}
                                        rightIcon={<Clipboard color="#36A18B" size={20} />}
                                        onRightIconClick={async () => {
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                field.onChange(text);
                                            } catch (err) {
                                                console.error("Failed to read clipboard:", err);
                                            }
                                        }}
                                        {...field}
                                        className="pl-3 py-5 font-light rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
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
                                    <FormLabel>{t("import.form.indexCanisterId.label")}</FormLabel>
                                    <p className="text-green text-xs leading-none">
                                        {t("optional")}
                                    </p>
                                </div>

                                <div className="relative">
                                    <IconInput
                                        type="text"
                                        step="any"
                                        placeholder={"_____-_____-_____-_____-cai"}
                                        isCurrencyInput={false}
                                        rightIcon={<Clipboard color="#36A18B" size={20} />}
                                        onRightIconClick={async () => {
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                field.onChange(text);
                                            } catch (err) {
                                                console.error("Failed to read clipboard:", err);
                                            }
                                        }}
                                        {...field}
                                        className="pl-3 py-5 font-light rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                                    />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button size="lg" className="mt-auto">
                    {t("continue")}
                </Button>
            </form>
        </Form>
    );
}
