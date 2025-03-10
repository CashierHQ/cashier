import { useAuth } from "@nfid/identitykit/react";

const useConnectToWallet = () => {
    const { connect } = useAuth();

    const connectToWallet = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        connect();
    };

    return { connectToWallet };
};

export default useConnectToWallet;
