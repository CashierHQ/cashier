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

const linkDetailsSchema = z.object({
    photo: z.string(),
    message: z.string(),
    buttonLabel: z.string(),
    chain: z.string(),
    name: z.string(),
    amount: z.number(),
});

interface LinkDetailsProps {
    progress: string;
    defaultValues?: Partial<z.infer<typeof linkDetailsSchema>>;
    handleSubmit: (values: z.infer<typeof linkDetailsSchema>) => any;
    handleBack: () => any;
    isEnd?: boolean;
}

export default function LinkDetails({ progress, defaultValues = {}, handleSubmit, handleBack, isEnd }: LinkDetailsProps) {
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

    return <div className="w-11/12 max-w-[400px]">
        <div className="w-full flex justify-between mb-5">
            <Button variant="outline" size="icon" onClick={handleBack}>
                ←
            </Button>
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                Link Details
            </h4>
            <span className="scroll-m-20 tracking-tight">
                {progress}
            </span>
        </div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="photo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Photo</FormLabel>
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
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Message" {...field} />
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
                            <FormLabel>Chain</FormLabel>
                            <FormControl>
                                <Input placeholder="Chain" {...field} />
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
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Name" {...field} />
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
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                                <Input placeholder="Amount" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">{isEnd ? "Submit" : "Continue"}</Button>
            </form>
        </Form>
    </div>
}
