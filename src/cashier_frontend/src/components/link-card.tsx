export default function LinkCard({
    src,
    title,
    message,
    label,
}: {
    src: string;
    title: string;
    message: string;
    label: string;
}) {
    return (
        <div className="flex flex-col items-center bg-lightgreen rounded-md mt-5 p-3">
            <img src={src} alt="Link template" />
            <h3 className="font-semibold py-2">{title}</h3>
            <h3 className="text-sm">{message}</h3>
            <button className="text-white bg-green rounded-full py-1 px-8 mt-3 text-sm">
                {label}
            </button>
        </div>
    );
}
