// Feldtypen uebernommen aus vtg-rlp/src/lib/bc-types.ts (identisches
// "vtg"-Schema in Business Central, nur andere Company/Tenant fuer NRW).
// Muss gegen NRWs eigenes Feldmapping verifiziert werden, sobald es vorliegt.
export type BcCompany = {
  systemId: string;
  companyName: string;
  interfaceCode: string;
  vtgCompanyNo: string;
  dlr: string;
  name: string;
  name2: string;
  address: string;
  address2: string;
  postCode: string;
  city: string;
  phoneNo: string;
  phoneNo2: string;
  mobilePhoneNo: string;
  email: string;
  salutation: string;
  chairperson: string;
  bnrZd: string;
  grantRate: number;
  homepageUsername: string;
  homepagePassword: string;
  snapshotDateTime: string;
};

export type BcBudgetLine = {
  systemId: string;
  entryNo: number;
  interfaceCode: string;
  companyName: string;
  vtgCompanyNo: string;
  dlr: string;
  financialYear: number;
  glAccountNo: string;
  glAccountName: string;
  balance: number;
  carryOverPrevYear: number;
  annualBudget: number;
  termBudget: number;
  notEligibleFinYear: number;
  notEligiblePrevYear: number;
  snapshotDateTime: string;
};
