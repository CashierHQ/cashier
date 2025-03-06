import { useButtonStateStore } from "@/stores/buttonStateStore";

export const useButtonState = () => {
    const isButtonDisabled = useButtonStateStore((state) => state.isButtonDisabled);
    const setButtonDisabled = useButtonStateStore((state) => state.setButtonDisabled);

    return { isButtonDisabled, setButtonDisabled };
};
