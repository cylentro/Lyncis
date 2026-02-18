export type OrderStatus = 'unassigned' | 'staged' | 'processed';

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
    tag: string;
    status: OrderStatus;

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
    };

    metadata?: {
        potentialItemCount?: number;
        isAiParsed?: boolean;
    };
}
