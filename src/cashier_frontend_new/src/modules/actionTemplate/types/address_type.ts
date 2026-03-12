import { type AddressType as BackendSharedAddressType } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { AddressType as SharedAddressType } from "$shared";

export type SharedAddressTypeValue =
  | typeof SharedAddressType.Creator
  | typeof SharedAddressType.User
  | typeof SharedAddressType.Link
  | typeof SharedAddressType.Treasury;

/**
 * Mapper for converting between frontend SharedAddressType and backend AddressType
 */
export class SharedAddressTypeMapper {
  /**
   * Convert frontend SharedAddressType to corresponding backend AddressType
   * @param addressType
   * @returns
   */
  static toBackendType(
    addressType: SharedAddressTypeValue,
  ): BackendSharedAddressType {
    switch (addressType) {
      case SharedAddressType.Creator:
        return { Creator: null };
      case SharedAddressType.User:
        return { User: null };
      case SharedAddressType.Link:
        return { Link: null };
      case SharedAddressType.Treasury:
        return { Treasury: null };
      default:
        return assertUnreachable(addressType);
    }
  }

  /**
   * Convert backend AddressType to corresponding frontend SharedAddressType
   * @param addressType
   * @returns
   */
  static toLocalType(addressType: BackendSharedAddressType): SharedAddressType {
    return rsMatch(addressType, {
      Creator: () => SharedAddressType.Creator,
      User: () => SharedAddressType.User,
      Link: () => SharedAddressType.Link,
      Treasury: () => SharedAddressType.Treasury,
    });
  }
}
