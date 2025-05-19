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

import { State, Template } from "@/services/types/link.service.types";
import { base64SampleLinkImage1, base64SampleLinkImage2 } from "./base64Images";

export const sampleLink1 = {
    id: "",
    title: "Example 1: Special moments",
    image: base64SampleLinkImage1,
    description:
        "I wanted to capture this special moment forever. And I’d like to share it with my closest of friends.",
    amount: 10,
    state: State.PendingPreview,
    template: Template.Left,
    create_at: new Date(),
};

export const sampleLink2 = {
    id: "",
    title: "Example 2: Proof of attendance",
    image: base64SampleLinkImage2,
    description:
        "Thank you for attending our coffee brewing workshop. Here is an NFT as a proof of your attendance.",
    amount: 20,
    state: State.PendingPreview,
    template: Template.Left,
    create_at: new Date(),
};
