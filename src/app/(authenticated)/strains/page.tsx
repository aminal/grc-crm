import { redirect } from "next/navigation";

type StrainsSearchParams = Record<string, string | string[] | undefined>;

export default async function StrainsPage({ searchParams }: {
  searchParams: Promise<StrainsSearchParams>;
}): Promise<never> {
  const params = await searchParams;
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) {
          query.append(key, entry);
        }
      });
      return;
    }

    if (value) {
      query.set(key, value);
    }
  });

  const search = query.toString();
  redirect(search ? `/settings/strains?${search}` : "/settings/strains");
}
