import { Card, CardContent } from "./card";

export function EmptyState({ title, description }: { title: string; description: string }): React.ReactElement {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <h3 className="text-base/7 font-semibold text-zinc-950 uppercase dark:text-zinc-50">{title}</h3>
        <p className="mt-2 text-sm/6 text-zinc-500 font-medium">{description}</p>
      </CardContent>
    </Card>
  );
}
