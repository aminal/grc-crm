import { ChatBubbleLeftRightIcon, EnvelopeIcon, PhoneIcon } from "@heroicons/react/20/solid";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddContactDialog, EditContactDialog } from "@/components/company/add-contact-dialog";
import { CompanyTabs } from "@/components/company/company-tabs";
import { buttonClasses } from "@/components/ui/button";
import { setPrimaryContactAction } from "../../actions";
import { listContacts } from "@/lib/data/crm";
import { formatCompanySubheading } from "@/lib/domain/format";
import { e164Phone, formatPhone, googleVoiceCallUrl } from "@/lib/domain/phone";
import { requireUser } from "@/lib/auth/session";
import { loadCompanyRoute } from "../company-route";

export default async function CompanyContactsPage({ params }: { params: Promise<{ companyId: string }> }): Promise<React.ReactElement> {
  const user = await requireUser();
  const { companyId: routeSegment } = await params;
  const { company, companyId, companySlug } = await loadCompanyRoute(routeSegment, "/contacts");
  const contacts = await listContacts(companyId);

  return (
    <div>
      <PageHeader title={company.data.company_name} description={formatCompanySubheading(company.data)} actions={<AddContactDialog companyId={companyId} />} />
      <CompanyTabs companySlug={companySlug} active="contacts" />

      <div className="space-y-4">
        {contacts.map((contact) => {
          const isPrimary = contact.id === company.data.primary_contact_id;
          const email = contact.data.email.trim();
          const phone = formatPhone(contact.data.phone);
          const dialablePhone = e164Phone(contact.data.phone);
          const callUrl = user.google_voice_number && dialablePhone ? googleVoiceCallUrl(dialablePhone, user.email) : null;
          return (
            <Card key={contact.id} className="rounded-xl bg-zinc-50/80 shadow-none ring-0 dark:bg-zinc-900">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-base font-semibold uppercase text-purple-700 ring-1 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-200 dark:ring-purple-400/20">
                        {contact.data.name.trim().slice(0, 1) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-xl/7 font-semibold text-zinc-950 dark:text-white">{contact.data.name}</p>
                              {isPrimary ? <Badge color="blue">Primary</Badge> : null}
                            </div>
                            <p className="mt-0.5 text-sm/6 font-medium text-zinc-500 uppercase dark:text-zinc-400">{contact.data.title || "No title"}</p>
                          </div>
                          <div className="inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600 shadow-xs dark:bg-white/5 dark:text-zinc-400">
                            <ChatBubbleLeftRightIcon className="size-4 shrink-0 text-purple-500 dark:text-purple-500/85" aria-hidden="true" />
                            <span className="truncate">Prefers {contact.data.preferred_communication}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      {email ? (
                        <ContactMethod
                          label="Email"
                          value={email}
                          href={`mailto:${email}`}
                          icon={<EnvelopeIcon className="size-4" aria-hidden="true" />}
                        />
                      ) : null}
                      {phone ? (
                        <ContactMethod
                          label="Phone"
                          value={phone}
                          href={dialablePhone ? `tel:${dialablePhone}` : undefined}
                          icon={<PhoneIcon className="size-4" aria-hidden="true" />}
                        />
                      ) : null}
                      {!email && !phone ? (
                        <div className="rounded-xl bg-zinc-950/40 p-2.5 text-center text-sm/6 font-semibold uppercase text-zinc-500 dark:text-zinc-400">No contact details</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {callUrl ? <a href={callUrl} target="_blank" rel="noreferrer" className={buttonClasses("secondary")}>Call</a> : null}
                    {!isPrimary ? (
                      <form action={setPrimaryContactAction.bind(null, companyId, contact.id)}>
                        <button className={buttonClasses("secondary")}>Make Primary</button>
                      </form>
                    ) : null}
                    <EditContactDialog companyId={companyId} contactId={contact.id} contact={contact.data} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {contacts.length === 0 ? <Card><CardContent><p className="py-12 text-center text-base/6 font-semibold uppercase text-zinc-500">No contacts yet</p></CardContent></Card> : null}
      </div>
    </div>
  );
}

function ContactMethod({ label, value, icon, href }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
}): React.ReactElement {
  const content = (
    <>
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs/5 font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-0.5 break-words text-md/6 font-medium text-zinc-950 dark:text-white">{value}</p>
      </div>
    </>
  );
  const className = "flex gap-3 rounded-xl bg-zinc-950/40 p-2.5 transition hover:bg-zinc-950/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500";

  return href ? <a href={href} className={className}>{content}</a> : <div className={className}>{content}</div>;
}
