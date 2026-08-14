import { CompanySearch } from '@/components/company/company-search';
import { CompanyTable } from '@/components/company/company-table';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { searchCompanies } from '@/lib/data/crm';
import { NewCompanyDialog } from './new-company-dialog';

type CompaniesSearchParams = {
    q?: string | string[];
    newCompany?: string | string[];
};

export default async function CompaniesPage({ searchParams }: {
    searchParams: Promise<CompaniesSearchParams>
}): Promise<React.ReactElement> {
    const params = await searchParams;
    const query = firstSearchParam(params.q);
    const openNewCompany = firstSearchParam(params.newCompany) === '1';
    const companies = await searchCompanies(query);

    return (
        <div>
            <PageHeader
                title='Companies'
                description='Organize our relationships across the industry by tracking companies and their associated team members.'
                actions={
                    <NewCompanyDialog key={openNewCompany ? 'open' : 'closed'} initialOpen={openNewCompany} />
                }
            />

            <div className='space-y-8'>
                <CompanySearch query={query} />

                {companies.length > 0 ? <CompanyTable companies={companies} /> :
                    <EmptyState title='No companies found' />}
            </div>
        </div>
    );
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
