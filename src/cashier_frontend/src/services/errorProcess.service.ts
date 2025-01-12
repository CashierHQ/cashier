export const getCashierError = (error: Error): Error => {
    if (error.message.includes("Insufficient balance")) {
        return new Error("Insufficient balance.");
    } else return error;
};
