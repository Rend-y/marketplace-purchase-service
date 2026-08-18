export const PRODUCT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  SOLD: 'SOLD',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
