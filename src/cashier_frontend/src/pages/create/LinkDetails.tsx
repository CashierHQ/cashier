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
import { Textarea } from "@/components/ui/textarea";
import { ParitalFormProps } from "@/components/multi-step-form";

const linkDetailsSchema = z.object({
    photo: z.string(),
    message: z.string(),
    buttonLabel: z.string(),
    chain: z.string(),
    name: z.string(),
    amount: z.coerce.number(),
});

export default function LinkDetails({ defaultValues = {}, handleSubmit, handleChange }: ParitalFormProps<z.infer<typeof linkDetailsSchema>>) {
    const { t } = useTranslation();

    const form = useForm<z.infer<typeof linkDetailsSchema>>({
        resolver: zodResolver(linkDetailsSchema),
        defaultValues: {
            photo: "",
            message: "",
            buttonLabel: "",
            chain: "ICP",
            name: "",
            amount: 1,
            ...defaultValues,
        },
    })

    return <div className="w-full">
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                onChange={(e: any) => handleChange({ [e.target.name]: e.target.value })}
                className="space-y-8"
            >
                <FormField
                    control={form.control}
                    name="photo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('create.photo')}</FormLabel>
                            <FormControl>
                                <Input type="file" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('create.message')}</FormLabel>
                            <FormControl>
                                <Textarea placeholder={t('create.message')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="chain"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('create.chain')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('create.chain')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('create.name')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('create.name')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('create.amount')}</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder={t('create.amount')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">{t('submit')}</Button>
            </form>
        </Form>
    </div>
}
