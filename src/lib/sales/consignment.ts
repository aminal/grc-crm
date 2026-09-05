export type ConsignmentPackageFields = {
  consignment_distributor_id?: string;
};

export const MIXED_CONSIGNMENT_MESSAGE = "An order cannot mix consignment packages with in-house packages.";
export const MULTIPLE_DISTRIBUTORS_MESSAGE = "An order cannot mix consignment packages from different distributors.";

export function isConsignmentPackage(packageFields: ConsignmentPackageFields): boolean {
  return Boolean(packageFields.consignment_distributor_id);
}

export function assertSingleConsignmentSource(packageFieldsList: ConsignmentPackageFields[]): void {
  const distributorIds = new Set(packageFieldsList.filter(isConsignmentPackage).map((packageFields) => packageFields.consignment_distributor_id));
  if (distributorIds.size === 0) {
    return;
  }

  if (distributorIds.size > 1) {
    throw new Error(MULTIPLE_DISTRIBUTORS_MESSAGE);
  }

  if (packageFieldsList.some((packageFields) => !isConsignmentPackage(packageFields))) {
    throw new Error(MIXED_CONSIGNMENT_MESSAGE);
  }
}
