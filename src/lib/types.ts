export type OrderStatus = 'unassigned' | 'staged' | 'processed';

export type ServiceType = 'regular' | 'nextday' | 'sameday' | 'instant';

export interface SenderAddress {
    id: string;
    label: string;
    isDefault: boolean;
    name: string;
    phone: string;
    addressRaw: string;
    provinsi: string;
    kota: string;
    kecamatan: string;
    kelurahan: string;
    kodepos: string;
}

export interface JastipItem {
    id: string;
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
    rawWeightKg: number;
    /** IMPORTANT: Prevents circular logic from overriding manual price entries */
    isManualTotal: boolean;
}

export interface Origin {
    id: string;
    name: string;
    code: string; // e.g., "SG-WH-01"
}

export interface JastipOrder {
    id: string;
    createdAt: number;
    updatedAt?: number;
    tag: string;
    status: OrderStatus;
    batchId?: string;

    recipient: {
        name: string;
        phone: string;
        addressRaw: string;
        provinsi: string;
        kota: string;
        kecamatan: string;
        kelurahan: string;
        kodepos: string;
    };

    items: JastipItem[];

    logistics: {
        originId: string | null;
        finalPackedWeight: number;
        dimensions: { l: number; w: number; h: number };
        volumetricWeight: number;
        chargeableWeight: number;
        serviceType?: ServiceType;
        estimatedCost?: number;
    };

    metadata?: {
        potentialItemCount?: number;
        isAiParsed?: boolean;
        sourceFileName?: string;
        isVerified?: boolean;
        /** True for orders imported from Excel that haven't been reviewed yet */
        needsTriage?: boolean;
        /** True when one or more items could not be fully parsed (e.g. missing price) */
        parseWarning?: boolean;
    };
}
