import { Drawer as DrawerPrimitive } from "vaul-svelte";

import Root from "$lib/shadcn/components/ui/drawer/drawer.svelte";
import Content from "$lib/shadcn/components/ui/drawer/drawer-content.svelte";
import Description from "$lib/shadcn/components/ui/drawer/drawer-description.svelte";
import Overlay from "$lib/shadcn/components/ui/drawer/drawer-overlay.svelte";
import Footer from "$lib/shadcn/components/ui/drawer/drawer-footer.svelte";
import Header from "$lib/shadcn/components/ui/drawer/drawer-header.svelte";
import Title from "$lib/shadcn/components/ui/drawer/drawer-title.svelte";
import NestedRoot from "$lib/shadcn/components/ui/drawer/drawer-nested.svelte";
import Close from "$lib/shadcn/components/ui/drawer/drawer-close.svelte";
import Trigger from "$lib/shadcn/components/ui/drawer/drawer-trigger.svelte";

const Portal: typeof DrawerPrimitive.Portal = DrawerPrimitive.Portal;

export {
	Root,
	NestedRoot,
	Content,
	Description,
	Overlay,
	Footer,
	Header,
	Title,
	Trigger,
	Portal,
	Close,

	//
	Root as Drawer,
	NestedRoot as DrawerNestedRoot,
	Content as DrawerContent,
	Description as DrawerDescription,
	Overlay as DrawerOverlay,
	Footer as DrawerFooter,
	Header as DrawerHeader,
	Title as DrawerTitle,
	Trigger as DrawerTrigger,
	Portal as DrawerPortal,
	Close as DrawerClose,
};
