import type { OnlinePaymentMethod } from "./types";

interface OrganizationPaymentDetails {
  orgTreasurerNumber?: unknown;
  orgBankName?: unknown;
  orgBankAccountNumber?: unknown;
  orgBankAccountName?: unknown;
}

export function configuredPaymentDetail(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function availableOnlinePaymentMethods(
  details: OrganizationPaymentDetails | null | undefined
): OnlinePaymentMethod[] {
  const methods: OnlinePaymentMethod[] = [];

  if (configuredPaymentDetail(details?.orgTreasurerNumber)) {
    methods.push("gcash");
  }

  if (
    configuredPaymentDetail(details?.orgBankName) &&
    configuredPaymentDetail(details?.orgBankAccountNumber) &&
    configuredPaymentDetail(details?.orgBankAccountName)
  ) {
    methods.push("bank_transfer");
  }

  return methods;
}
