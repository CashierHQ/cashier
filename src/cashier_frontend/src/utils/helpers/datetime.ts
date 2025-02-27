import i18n from "@/locales/config";

export function formatDate(date: Date) {
    return date.toLocaleDateString(i18n.language || "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
