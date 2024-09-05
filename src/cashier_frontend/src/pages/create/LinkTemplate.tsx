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
} from "@/components/ui/form"
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { ParitalFormProps } from "@/components/composite/MultiStepForm";

const linkTemplateSchema = z.object({
    linkName: z.string().min(5),
    template: z.string(),
});

export default function LinkTemplate({ defaultValues = {}, handleSubmit, handleChange }: ParitalFormProps<z.infer<typeof linkTemplateSchema>>) {
    const { t } = useTranslation();

    const form = useForm<z.infer<typeof linkTemplateSchema>>({
        resolver: zodResolver(linkTemplateSchema),
        defaultValues: {
            linkName: "",
            template: "",
            ...defaultValues,
        },
    })

    return <div className="w-full">
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                onChange={(e: any) => handleChange({ [e.target?.name]: e.target.value })}
                className="space-y-8"
            >
                <FormField
                    control={form.control}
                    name="linkName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('create.linkName')}</FormLabel>
                            <FormControl>
                                <Input placeholder="Link name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">{t('continue')}</Button>
            </form>
        </Form>
    </div>
}
