import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CompanyTabs } from "@/components/company/company-tabs";
import { createInteractionEntryAction } from "../../actions";
import { listInteractions } from "@/lib/data/crm";
import { formatCompanySubheading, formatDateTime } from "@/lib/domain/format";
import { loadCompanyRoute } from "../company-route";
import { LogInteractionDialog } from "./log-interaction-dialog";

export default async function CompanyActivityPage({ params }: { params: Promise<{ companyId: string }> }): Promise<React.ReactElement> {
  const { companyId: routeSegment } = await params;
  const { company, companyId, companySlug } = await loadCompanyRoute(routeSegment, "/activity");
  const interactions = await listInteractions(companyId);

  return (
    <div>
      <PageHeader title={company.data.company_name} description={formatCompanySubheading(company.data)} actions={<LogInteractionDialog companyId={companyId} />} />
      <CompanyTabs companySlug={companySlug} active="activity" />

      <div className="space-y-4">
        {interactions.map((interaction) => (
          <Card key={interaction.id}>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white">{interaction.data.interaction_method} · {formatDateTime(interaction.data.contact_date_time)}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800">{interaction.data.discussion_notes}</p>
                </div>
                <div className="text-sm text-zinc-600 sm:text-right">
                  <p>{interaction.data.salesperson_name}</p>
                  <p>{interaction.data.salesperson_email}</p>
                </div>
              </div>

              {interaction.entries.length > 0 ? (
                <div className="mt-4 space-y-3 border-l border-zinc-950/10 pl-4 dark:border-white/10">
                  {interaction.entries.map((entry) => (
                    <div key={entry.id} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      <p className="text-xs text-zinc-500">{formatDateTime(entry.data.contact_date_time)} · {entry.data.salesperson_name}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{entry.data.discussion_notes}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <details className="mt-4 rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:bg-zinc-900">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-700">Add follow-up</summary>
                <form action={createInteractionEntryAction.bind(null, companyId, interaction.id)} className="mt-4 space-y-3">
                  <Textarea name="discussion_notes" required placeholder="Follow-up details" />
                  <Button variant="secondary">Add Follow-up</Button>
                </form>
              </details>
            </CardContent>
          </Card>
        ))}
        {interactions.length === 0 ? <Card><CardContent><p className="text-base/6 uppercase font-semibold text-zinc-500 text-center py-12">No activity has been logged yet</p></CardContent></Card> : null}
      </div>
    </div>
  );
}
