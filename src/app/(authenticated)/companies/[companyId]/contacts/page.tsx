import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddContactDialog, ViewContactDialog } from "@/components/company/add-contact-dialog";
import { CompanyTabs } from "@/components/company/company-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listContacts } from "@/lib/data/crm";
import { formatCompanySubheading } from "@/lib/domain/format";
import { e164Phone, formatPhone, googleVoiceCallUrl } from "@/lib/domain/phone";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { loadCompanyRoute } from "../company-route";

export default async function CompanyContactsPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ contact?: string }> }): Promise<React.ReactElement> {
  const user = await requireUser();
  const { companyId: routeSegment } = await params;
  const query = await searchParams;
  const { company, companyId, companySlug } = await loadCompanyRoute(routeSegment, "/contacts");
  const contacts = await listContacts(companyId);
  const contactsHref = `/companies/${companySlug}/contacts`;
  const selectedContactId = typeof query.contact === "string" ? query.contact.trim() : "";
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) ?? null;
  const selectedContactEmail = selectedContact?.data.email.trim() ?? "";
  const selectedContactPhone = selectedContact ? formatPhone(selectedContact.data.phone) : null;
  const selectedContactDialablePhone = selectedContact ? e164Phone(selectedContact.data.phone) : null;
  const selectedContactCallUrl = user.google_voice_number && selectedContactDialablePhone ? googleVoiceCallUrl(selectedContactDialablePhone, user.email) : null;

  return (
    <div>
      <PageHeader title={company.data.company_name} description={formatCompanySubheading(company.data)} actions={<AddContactDialog companyId={companyId} />} />
      <CompanyTabs companySlug={companySlug} active="contacts" />

      <div className="mt-4">
        {contacts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => {
                const isPrimary = contact.id === company.data.primary_contact_id;
                const email = contact.data.email.trim();
                const phone = formatPhone(contact.data.phone);
                const href = `${contactsHref}?contact=${contact.id}`;
                const label = `View ${contact.data.name}`;

                return (
                  <TableRow key={contact.id} className={cn("group cursor-pointer", contact.id === selectedContact?.id && "bg-zinc-950/2.5 dark:bg-white/5")}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={href} className="font-semibold text-base text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                          <span className="absolute inset-0" />
                          {contact.data.name}
                        </Link>
                        {isPrimary ? <Badge color="blue">Primary</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium uppercase text-zinc-700 dark:text-zinc-400/85">
                      <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                        <span className="sr-only">{label}</span>
                      </Link>
                      {contact.data.title || "No title"}
                    </TableCell>
                    <TableCell>
                      <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                        <span className="sr-only">{label}</span>
                      </Link>
                      <ContactValue value={email || "No email"} muted={!email} />
                    </TableCell>
                    <TableCell>
                      <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10">
                        <span className="sr-only">{label}</span>
                      </Link>
                      <ContactValue value={phone || "No phone"} muted={!phone} />
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Card className="rounded-lg bg-zinc-50/80 shadow-none ring-0 dark:bg-zinc-900">
            <CardContent>
              <p className="py-12 text-center text-base/6 font-semibold uppercase text-zinc-500 dark:text-zinc-400">No contacts yet</p>
            </CardContent>
          </Card>
        )}
      </div>
      {selectedContact ? (
        <ViewContactDialog
          key={selectedContact.id}
          companyId={companyId}
          contactId={selectedContact.id}
          contact={selectedContact.data}
          email={selectedContactEmail}
          phone={selectedContactPhone}
          dialablePhone={selectedContactDialablePhone}
          callUrl={selectedContactCallUrl}
          isPrimary={selectedContact.id === company.data.primary_contact_id}
          closeHref={contactsHref}
        />
      ) : null}
    </div>
  );
}

function ContactValue({ value, muted = false }: {
  value: string;
  muted?: boolean;
}): React.ReactElement {
  const valueClassName = muted
    ? "font-medium text-zinc-500 dark:text-zinc-300"
    : "font-medium text-zinc-950 dark:text-white";

  return <span className={valueClassName}>{value}</span>;
}
