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


const linkTemplateSchema = z.object({
    linkName: z.string().min(5),
    template: z.string(),
});

interface LinkTemplateProps {
    progress: string;
    defaultValues?: Partial<z.infer<typeof linkTemplateSchema>>;
    handleSubmit: (values: z.infer<typeof linkTemplateSchema>) => any;
    handleBack: () => any;
    isEnd?: boolean;
}

export default function LinkTemplate({ progress, defaultValues = {}, handleSubmit, handleBack, isEnd }: LinkTemplateProps) {
    const form = useForm<z.infer<typeof linkTemplateSchema>>({
        resolver: zodResolver(linkTemplateSchema),
        defaultValues: {
            linkName: "",
            template: "",
            ...defaultValues,
        },
    })

    return <div className="w-11/12 max-w-[400px]">
        <div className="w-full flex justify-between mb-5">
            <Button variant="outline" size="icon" onClick={handleBack}>
                ←
            </Button>
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                Link Template
            </h4>
            <span className="scroll-m-20 tracking-tight">
                {progress}
            </span>
        </div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="linkName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Link name" {...field} />
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
