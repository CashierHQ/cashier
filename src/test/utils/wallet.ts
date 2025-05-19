// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const listUser: Record<string, string> = {
    // address with icp setup
    user1: "34b6a24c5848fbf0397ba3d923267ec99653b1d59ecd4f48a088f37d3232724a",

    // address without icp setup
    user2: "85a341ad13ca7df1b23ae5129db545d11c4e021d7cb7ec1bdad8767aa99b5ee8",
    user3: "0d579f20ce8ce4f59972cfc6273af1318cc8307bb849349df4644d5c16034daf",
    user4: "2d30bcf39784fa856466f0e229c40da30bd58470c6424f77e8eb0b09d0126c89",
    user5: "575c8a28ff2ddb887c64b6497022511b029ca664e65459d3138e91d3ad9b788d",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const initWallet = () => {
//     const identity = Secp256k1KeyIdentity.generate();
//     const secretKey = identity.getKeyPair().secretKey;

//     // Convert secret key to hexadecimal string
//     const secretKeyHex = Buffer.from(secretKey).toString("hex");

//     const oldIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);
// };

const convertPrivateKeyToIdentity = (user: string) => {
    // Convert secret key to hexadecimal string
    const secretKeyHex = listUser[user];
    // Convert string to secret key
    const secretKey = Buffer.from(secretKeyHex, "hex");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey as any);

    return oldIdentity;
};

export const getIdentity = (user: string) => {
    return convertPrivateKeyToIdentity(user);
};

export const getRandomIdentity = () => {
    const identity = Secp256k1KeyIdentity.generate();
    return identity;
};
