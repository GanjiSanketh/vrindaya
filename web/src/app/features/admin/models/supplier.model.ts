/** Mirrors the backend's SupplierResponse. */
export interface Supplier {
  id: string;
  supplierCode: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  bankDetails: string | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the backend's CreateSupplierRequest/UpdateSupplierRequest (identical shape — SupplierCode/IsActive are never client-editable). */
export interface SupplierRequest {
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  bankDetails: string | null;
  paymentTerms: string | null;
  notes: string | null;
}

export interface SupplierStats {
  totalPurchases: number;
  totalAmountPurchased: number;
  productsPurchased: number;
  lastPurchaseDate: string | null;
}

export type SupplierSortField = 'companyName' | 'createdAt' | 'supplierCode';
