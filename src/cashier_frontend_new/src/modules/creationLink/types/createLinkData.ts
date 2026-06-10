export class CreateLinkAsset {
  address: string;
  useAmount: bigint;

  constructor(address: string, useAmount: bigint) {
    this.address = address;
    this.useAmount = useAmount;
  }
}
