import networksData from "./networks.json";

export type Network = {
  id: string;
  name: string;
  iconUrl: string;
};

export const AVAILABLE_NETWORKS: Network[] = networksData as Network[];
