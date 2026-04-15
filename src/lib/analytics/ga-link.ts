type GaLinkConfig = {
  propertyId: string;
  measurementId?: string;
  apiSecret?: string;
  linkedAt: string;
};

const gaLinkByTenant = new Map<string, GaLinkConfig>();

export function setGaLink(tenantId: string, config: Omit<GaLinkConfig, "linkedAt">): GaLinkConfig {
  const payload: GaLinkConfig = {
    ...config,
    linkedAt: new Date().toISOString(),
  };
  gaLinkByTenant.set(tenantId, payload);
  return payload;
}

export function getGaLink(tenantId: string): GaLinkConfig | null {
  return gaLinkByTenant.get(tenantId) ?? null;
}
