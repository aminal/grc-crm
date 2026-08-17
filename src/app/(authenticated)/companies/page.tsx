import { CompanyTable, type CompanyTableSortKey } from '@/components/company/company-table';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { paginatedTableItems, TablePagination, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from '@/components/ui/table';
import { TableSearch } from '@/components/ui/table-search';
import { canManageRestrictedResources, requireNonGuest } from '@/lib/auth/session';
import { searchCompanies } from '@/lib/data/crm';
import type { CompanyData, FirestoreRecord } from '@/lib/domain/types';
import { NewCompanyDialog } from './new-company-dialog';

const companySortKeys = ['company', 'status', 'location', 'facility'] as const;

type CompaniesSearchParams = {
    q?: string | string[];
    newCompany?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
};

export default async function CompaniesPage({ searchParams }: {
    searchParams: Promise<CompaniesSearchParams>
}): Promise<React.ReactElement> {
    const user = await requireNonGuest();
    const canManage = canManageRestrictedResources(user);

    const params = await searchParams;
    const query = firstSearchParam(params.q);
    const sortKey = tableSortKeyFromSearchParam(params.sort, companySortKeys);
    const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
    const sortParams = tableSortParams(sortKey, sortDirection);
    const openNewCompany = canManage && firstSearchParam(params.newCompany) === '1';
    const companies = sortCompanies(await searchCompanies(query), sortKey, sortDirection);
    const currentPage = tablePageFromSearchParam(params.page, companies.length);
    const paginatedCompanies = paginatedTableItems(companies, currentPage);
    const paginationHref = companiesHref(query, sortParams);

    return (
        <div>
            <PageHeader
                title='Companies'
                actions={canManage ? (
                    <NewCompanyDialog key={openNewCompany ? 'open' : 'closed'} initialOpen={openNewCompany} />
                ) : null}
            />

            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter companies by name, license, location, or facility type' preservedParams={sortParams} />

                {companies.length > 0 ? (
                    <>
                        <CompanyTable companies={paginatedCompanies} query={query} sortKey={sortKey} sortDirection={sortDirection} />
                        <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={companies.length} />
                    </>
                ) : (
                    <EmptyState title='No companies found' />
                )}
            </div>
        </div>
    );
}

function sortCompanies(companies: FirestoreRecord<CompanyData>[], sortKey: CompanyTableSortKey | null, sortDirection: TableSortDirection | null): FirestoreRecord<CompanyData>[] {
    if (!sortKey || !sortDirection) {
        return companies;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...companies].sort((a, b) => compareStrings(companySortValue(a, sortKey), companySortValue(b, sortKey)) * direction);
}

function companySortValue(company: FirestoreRecord<CompanyData>, sortKey: CompanyTableSortKey): string {
    switch (sortKey) {
        case 'company':
            return company.data.company_name;
        case 'status':
            return company.data.status;
        case 'location':
            return [company.data.address.city, company.data.address.state].filter(Boolean).join(', ');
        case 'facility':
            return company.data.facility_type;
    }
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });
}

function companiesHref(query: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams();
    if (query) {
        searchParams.set('q', query);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        }
    });

    const search = searchParams.toString();
    return search ? `/companies?${search}` : '/companies';
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
