interface LinkData {
    title: string;
    status: string;
    url: string;
    state: any;
}

export default function LinkItem({ link }: { link: LinkData }) {
    return (
        <div className="w-full flex justify-between items-center my-5">
            <div className="flex gap-x-5 items-center">
                {
                    Array.isArray(link.title) && link.title.length === 0 ?
                        <div className="w-10 h-10 rounded-sm bg-gray-200"></div> :
                        <img src={link.url} alt="link" className="w-10 h-10 rounded-sm" />
                }
            </div>
            <div className="flex items-center justify-between grow ml-3">
                <h3 className="text-lg font-base">{Array.isArray(link.title) && link.title.length === 0 ? "No title" : link.title}</h3>
                <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-lightgreen">{Object.keys(link.state[0])[0]}</div>
            </div>
        </div>
    );
}
