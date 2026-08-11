import { Card, CardContent } from "./card";

export function EmptyState({ title, description }: { title: string; description: string }): React.ReactElement {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <h3 className="text-base/7 font-semibold text-zinc-950">{title}</h3>
        <p className="mt-2 text-sm/6 text-zinc-600">{description}</p>
      </CardContent>
    </Card>
  );
}
