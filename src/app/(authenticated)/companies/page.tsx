import { CompanyTable } from '@/components/company/company-table';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSearch } from '@/components/ui/table-search';
import { canManageRestrictedResources, requireNonGuest } from '@/lib/auth/session';
import { searchCompanies } from '@/lib/data/crm';
import { NewCompanyDialog } from './new-company-dialog';

type CompaniesSearchParams = {
    q?: string | string[];
    newCompany?: string | string[];
};

export default async function CompaniesPage({ searchParams }: {
    searchParams: Promise<CompaniesSearchParams>
}): Promise<React.ReactElement> {
    const user = await requireNonGuest();
    const canManage = canManageRestrictedResources(user);

    const params = await searchParams;
    const query = firstSearchParam(params.q);
    const openNewCompany = canManage && firstSearchParam(params.newCompany) === '1';
    const companies = await searchCompanies(query);

    return (
        <div>
            <PageHeader
                title='Companies'
                actions={canManage ? (
                    <NewCompanyDialog key={openNewCompany ? 'open' : 'closed'} initialOpen={openNewCompany} />
                ) : null}
            />

            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter companies by name, license, location, or facility type' />

                {companies.length > 0 ? <CompanyTable companies={companies} /> :
                    <EmptyState title='No companies found' />}
            </div>
        </div>
    );
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
