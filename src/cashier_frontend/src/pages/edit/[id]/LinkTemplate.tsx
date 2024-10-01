import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ParitalFormProps } from "@/components/multi-step-form";
import LinkCard from "@/components/link-card";

const linkTemplateSchema = z.object({
    title: z.string().min(5),
});

export default function LinkTemplate({
    defaultValues = {},
    handleSubmit,
    handleChange,
}: ParitalFormProps<z.infer<typeof linkTemplateSchema>>) {
    const { t } = useTranslation();

    const form = useForm<z.infer<typeof linkTemplateSchema>>({
        resolver: zodResolver(linkTemplateSchema),
        defaultValues: {
            title: "",
            ...defaultValues,
        },
    });

    return (
        <div className="w-full flex flex-col">
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    onChange={(e: any) => handleChange({ [e.target?.name]: e.target.value })}
                >
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("create.linkName")}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t("create.linkNamePlaceholder")} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="w-full h-[1px] bg-gray-200 my-5" />
                    <img src="/default-template.svg" alt="Default template" className="w-full" />
                    <Button type="submit" className="fixed bottom-[30px] w-[80vw] max-w-[350px] left-1/2 -translate-x-1/2">{t("continue")}</Button>
                </form>
            </Form>
        </div>
    );
}
