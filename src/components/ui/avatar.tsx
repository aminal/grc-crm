import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string | null | undefined;
  picture?: string | null;
  className?: string;
};

export function Avatar({ name, picture, className }: AvatarProps): React.ReactElement {
  const label = name?.trim() || "User";
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <span
      aria-label={label}
      className={cn("inline-grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-zinc-100 text-sm font-medium text-zinc-700 dark:bg-white/5 dark:text-zinc-300", className)}
      style={picture ? { backgroundImage: `url(${picture})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {picture ? <span className="sr-only">{label}</span> : initial}
    </span>
  );
}
