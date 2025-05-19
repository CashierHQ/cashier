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

import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService from "@/services/link/link.service";

export function useFeePreview(linkId: string | undefined) {
    const identity = useIdentity();

    const query = useQuery({
        queryKey: queryKeys.links.feePreview(linkId, identity).queryKey,
        queryFn: async () => {
            if (!linkId || !identity) return [];
            const linkService = new LinkService(identity);
            return linkService.getFeePreview(linkId);
        },
        enabled: !!linkId && !!identity,
        refetchOnWindowFocus: false,
    });

    return query;
}
