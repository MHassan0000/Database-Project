import {
  LayoutDashboard,
  Package,
  LineChart,
  Boxes,
  FolderKanban,
  Truck,
  ClipboardList,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard, roles: ["admin", "manager", "viewer"] },
  { id: "catalog", label: "Catalog", icon: Package, roles: ["admin", "manager", "viewer"] },
  { id: "inventory", label: "Inventory", icon: Boxes, roles: ["admin", "manager", "viewer"] },
  { id: "suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "manager", "viewer"] },
  { id: "orders", label: "Orders", icon: ShoppingCart, roles: ["admin", "manager", "viewer"] },
  { id: "reports", label: "Analytics", icon: LineChart, roles: ["admin", "manager", "viewer"] },
  { id: "projects", label: "Workflows", icon: FolderKanban, roles: ["admin", "manager"] },
  { id: "audit", label: "Audit Log", icon: ClipboardList, roles: ["admin", "manager"] },
  { id: "users", label: "Users", icon: Users, roles: ["admin"] },
];

export function getNavItemsForRole(role?: UserRole | null) {
  const userRole = role ?? "viewer";
  return NAV_ITEMS.filter((item) => item.roles.includes(userRole));
}
