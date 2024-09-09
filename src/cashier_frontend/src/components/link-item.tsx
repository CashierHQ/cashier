interface LinkData {
    linkName: string;
    status: string;
    url: string;
    createdAt: string;
}

export default function LinkItem({ link }: { link: LinkData }) {
    return (
        <div className="w-full flex justify-between items-center my-5">
            <div className="flex gap-x-5 items-center">
                <img src={link.url} alt="link" className="w-10 h-10 rounded-full" />
                <div>
                    <h3 className="text-lg font-semibold">{link.linkName}</h3>
                    <p className="text-sm text-gray-500">{link.createdAt}</p>
                </div>
            </div>
            <p className="text-sm text-gray-500">{link.status}</p>
        </div>
    );
}