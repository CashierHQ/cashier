import { Button } from "@/components/ui/button";
import usePnpStore from "@/stores/plugAndPlayStore";
import React from "react";

const TestPage: React.FC = () => {
  const { account, connect, disconnect, pnp } = usePnpStore();

  const connectMtd = async () => {
    await connect("ii");
  };
  const connectMtd2 = async () => {
    await connect("iiSigner");
  };

  const test = async () => {
    if (!pnp) {
      console.log("PNP not initialized");
      return;
    }
    const adapterConfig = pnp;

    console.log("Adapter config:", adapterConfig);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-semibold mb-4">Test Page</h1>
      <p className="text-gray-600 mb-6">
        This is a simple test page for manual verification.
      </p>
      <div className="space-x-2">
        <Button
          onClick={connectMtd}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Login 1
        </Button>
        <Button
          onClick={connectMtd2}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Login 2
        </Button>
        <Button onClick={test}>Test</Button>
        {account && (
          <>
            <p>Connected with {account.owner}</p>
            <Button onClick={() => disconnect()}>Logout</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default TestPage;
