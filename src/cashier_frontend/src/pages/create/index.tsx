import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import LinkTemplate from "./LinkTemplate";
import LinkDetails from "./LinkDetails";

export default function CreatePage() {
    const { state } = useLocation();
    const [formData, setFormData] = useState<any>({});
    const navigate = useNavigate();

    const steps = [
        {
            Form: LinkTemplate,
            props: {
                handleSubmit: (values: any) => {
                    if (!formData.name) setFormData({ ...formData, ...values, name: values.linkName });
                    else setFormData({ ...formData, ...values });
                    navigate("/create", { state: { step: 1 } });
                },
                handleBack: () => {
                    navigate("/");
                },
                defaultValues: formData
            }
        },
        {
            Form: LinkDetails,
            props: {
                handleSubmit: (values: any) => {
                    console.log({ ...formData, ...values });
                    setFormData({ ...formData, ...values });
                    navigate("/");
                },
                handleBack: () => {
                    navigate("/create", { state: { step: 0, } });
                },
                defaultValues: formData
            }
        }
    ];

    return (
        <div className="w-screen flex flex-col items-center py-5">
            {steps.map(({ Form, props }, index) => {
                if ((!state && index == 0) || (state && state.step == index)) {
                    return <Form
                        key={index}
                        progress={`${index + 1}/${steps.length}`}
                        isEnd={index == steps.length - 1}
                        {...props} />
                }
                return null;
            })}
        </div>
    );
}