import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { activeTableSortDirection, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableSortHref, type TableSortDirection } from "@/components/ui/table";
import type { FirestoreRecord, UserProfileData, UserRole } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const roleColors: Record<UserRole, "purple" | "blue" | "emerald" | "zinc"> = {
  Admin: "purple",
  Manager: "blue",
  Employee: "emerald",
  Guest: "zinc",
};

export type UserTableSortKey = "name" | "email" | "role" | "title";

export function UserTable({
  users,
  selectedUserId,
  viewerRole,
  hrefBase = "/users",
  query = "",
  sortKey = null,
  sortDirection = null,
}: {
  users: FirestoreRecord<UserProfileData>[];
  selectedUserId?: string;
  viewerRole: UserRole;
  hrefBase?: string;
  query?: string;
  sortKey?: UserTableSortKey | null;
  sortDirection?: TableSortDirection | null;
}): React.ReactElement {
  if (users.length === 0) {
    return <EmptyState title="No users found" description="Users will appear here once they sign in." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-0"><span className="sr-only">Avatar</span></TableHead>
          <TableHead sortHref={userSortHref("name", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("name", sortKey, sortDirection)}>Name</TableHead>
          <TableHead sortHref={userSortHref("email", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("email", sortKey, sortDirection)}>Email</TableHead>
          <TableHead sortHref={userSortHref("role", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("role", sortKey, sortDirection)}>Role</TableHead>
          <TableHead sortHref={userSortHref("title", query, sortKey, sortDirection)} sortDirection={activeTableSortDirection("title", sortKey, sortDirection)}>Title</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const separator = hrefBase.includes("?") ? "&" : "?";
          const href = `${hrefBase}${separator}user=${encodeURIComponent(user.id)}`;
          const label = `Edit ${user.data.display_name || user.data.email}`;
          const role = user.data.role || "Guest";
          const canEdit = viewerRole === "Admin" || role !== "Admin";
          const isSelected = canEdit && selectedUserId === user.id;
          const displayName = user.data.display_name || "—";
          const avatarName = user.data.display_name || user.data.email;

          return (
            <TableRow key={user.id} className={cn("group", canEdit && "cursor-pointer", isSelected && "bg-zinc-950/2.5 dark:bg-white/5")}>
              <TableCell>
                {canEdit ? (
                  <Link href={href} className="flex items-center">
                    <span className="absolute inset-0" />
                    <Avatar name={avatarName} picture={user.data.picture} className="size-8" />
                  </Link>
                ) : (
                  <div className="flex items-center">
                    <Avatar name={avatarName} picture={user.data.picture} className="size-8" />
                  </div>
                )}
              </TableCell>
              <TableCell>
                {canEdit ? (
                  <Link href={href} className="font-semibold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                    <span className="absolute inset-0" />
                    {displayName}
                  </Link>
                ) : (
                  <span className="font-semibold text-zinc-950 dark:text-white">{displayName}</span>
                )}
              </TableCell>
              <TableCell>
                {canEdit && (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                )}
                {user.data.email}
              </TableCell>
              <TableCell>
                {canEdit && (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                )}
                <Badge color={roleColors[role]}>{role}</Badge>
              </TableCell>
              <TableCell>
                {canEdit && (
                  <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                    <span className="sr-only">{label}</span>
                  </Link>
                )}
                {user.data.title || "Guest"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function userSortHref(column: UserTableSortKey, query: string, sortKey: UserTableSortKey | null, sortDirection: TableSortDirection | null): string {
  return tableSortHref("/users", column, { q: query }, sortKey, sortDirection);
}
