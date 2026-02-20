
import { ServiceType } from './types';

// Zone groups
export type ShippingZone =
    | 'JABODETABEK'
    | 'JAWA'
    | 'BALI_NUSA'
    | 'SUMATERA'
    | 'KALIMANTAN'
    | 'SULAWESI'
    | 'MALUKU_PAPUA';

// 34 Provinces mapping based on location.json
export const PROVINCE_TO_ZONE: Record<string, ShippingZone> = {
    // JABODETABEK
    'DKI JAKARTA': 'JABODETABEK',
    'BANTEN': 'JABODETABEK',

    // JAWA
    'JAWA BARAT': 'JAWA',
    'JAWA TENGAH': 'JAWA',
    'DI YOGYAKARTA': 'JAWA',
    'JAWA TIMUR': 'JAWA',

    // BALI_NUSA (Bali & Nusa Tenggara)
    'BALI': 'BALI_NUSA',
    'NUSA TENGGARA BARAT': 'BALI_NUSA',
    'NUSA TENGGARA TIMUR': 'BALI_NUSA',

    // SUMATERA
    'ACEH': 'SUMATERA',
    'SUMATERA UTARA': 'SUMATERA',
    'SUMATERA BARAT': 'SUMATERA',
    'RIAU': 'SUMATERA',
    'KEPULAUAN RIAU': 'SUMATERA',
    'JAMBI': 'SUMATERA',
    'SUMATERA SELATAN': 'SUMATERA',
    'KEPULAUAN BANGKA BELITUNG': 'SUMATERA',
    'BENGKULU': 'SUMATERA',
    'LAMPUNG': 'SUMATERA',

    // KALIMANTAN
    'KALIMANTAN BARAT': 'KALIMANTAN',
    'KALIMANTAN TENGAH': 'KALIMANTAN',
    'KALIMANTAN SELATAN': 'KALIMANTAN',
    'KALIMANTAN TIMUR': 'KALIMANTAN',
    'KALIMANTAN UTARA': 'KALIMANTAN',

    // SULAWESI
    'SULAWESI UTARA': 'SULAWESI',
    'GORONTALO': 'SULAWESI',
    'SULAWESI TENGAH': 'SULAWESI',
    'SULAWESI BARAT': 'SULAWESI',
    'SULAWESI SELATAN': 'SULAWESI',
    'SULAWESI TENGGARA': 'SULAWESI',

    // MALUKU_PAPUA
    'MALUKU': 'MALUKU_PAPUA',
    'MALUKU UTARA': 'MALUKU_PAPUA',
    'PAPUA BARAT': 'MALUKU_PAPUA',
    'PAPUA': 'MALUKU_PAPUA',
    // New provinces (fuzzy logic handles these or defaults?)
    'PAPUA SELATAN': 'MALUKU_PAPUA',
    'PAPUA TENGAH': 'MALUKU_PAPUA',
    'PAPUA PEGUNUNGAN': 'MALUKU_PAPUA',
    'PAPUA BARAT DAYA': 'MALUKU_PAPUA',
};

// Labels for UI
export const SERVICE_LABELS: Record<ServiceType, string> = {
    regular: 'Regular',
    nextday: 'Next Day',
    sameday: 'Same Day',
    instant: 'Instant',
    cold: 'Cold Delivery',
};

// Rate definitions
// NOTE: These are simplified sample rates. In reality, this would be a much larger matrix or API call.
const ZONE_RATES: { originZone: ShippingZone; destZone: ShippingZone; service: ServiceType; ratePerKg: number; minCharge: number }[] = [
    // --- JABODETABEK ORIGIN ---
    // Intra-JABODETABEK
    { originZone: 'JABODETABEK', destZone: 'JABODETABEK', service: 'regular', ratePerKg: 8000, minCharge: 8000 },
    { originZone: 'JABODETABEK', destZone: 'JABODETABEK', service: 'nextday', ratePerKg: 12000, minCharge: 12000 },
    { originZone: 'JABODETABEK', destZone: 'JABODETABEK', service: 'sameday', ratePerKg: 20000, minCharge: 20000 },
    { originZone: 'JABODETABEK', destZone: 'JABODETABEK', service: 'instant', ratePerKg: 35000, minCharge: 35000 },
    { originZone: 'JABODETABEK', destZone: 'JABODETABEK', service: 'cold', ratePerKg: 50000, minCharge: 50000 },

    // To JAWA
    { originZone: 'JABODETABEK', destZone: 'JAWA', service: 'regular', ratePerKg: 12000, minCharge: 12000 },
    { originZone: 'JABODETABEK', destZone: 'JAWA', service: 'nextday', ratePerKg: 18000, minCharge: 18000 },

    // To BALI_NUSA
    { originZone: 'JABODETABEK', destZone: 'BALI_NUSA', service: 'regular', ratePerKg: 25000, minCharge: 25000 },
    { originZone: 'JABODETABEK', destZone: 'BALI_NUSA', service: 'nextday', ratePerKg: 38000, minCharge: 38000 },

    // To SUMATERA
    { originZone: 'JABODETABEK', destZone: 'SUMATERA', service: 'regular', ratePerKg: 28000, minCharge: 28000 },
    { originZone: 'JABODETABEK', destZone: 'SUMATERA', service: 'nextday', ratePerKg: 42000, minCharge: 42000 },

    // To KALIMANTAN
    { originZone: 'JABODETABEK', destZone: 'KALIMANTAN', service: 'regular', ratePerKg: 32000, minCharge: 32000 },
    { originZone: 'JABODETABEK', destZone: 'KALIMANTAN', service: 'nextday', ratePerKg: 48000, minCharge: 48000 },

    // To SULAWESI
    { originZone: 'JABODETABEK', destZone: 'SULAWESI', service: 'regular', ratePerKg: 35000, minCharge: 35000 },
    { originZone: 'JABODETABEK', destZone: 'SULAWESI', service: 'nextday', ratePerKg: 52000, minCharge: 52000 },

    // To MALUKU_PAPUA
    { originZone: 'JABODETABEK', destZone: 'MALUKU_PAPUA', service: 'regular', ratePerKg: 85000, minCharge: 85000 },
    { originZone: 'JABODETABEK', destZone: 'MALUKU_PAPUA', service: 'nextday', ratePerKg: 120000, minCharge: 120000 },

    // --- JAWA ORIGIN ---
    { originZone: 'JAWA', destZone: 'JABODETABEK', service: 'regular', ratePerKg: 10000, minCharge: 10000 },
    { originZone: 'JAWA', destZone: 'JAWA', service: 'regular', ratePerKg: 9000, minCharge: 9000 },
    { originZone: 'JAWA', destZone: 'SUMATERA', service: 'regular', ratePerKg: 25000, minCharge: 25000 },
    { originZone: 'JAWA', destZone: 'KALIMANTAN', service: 'regular', ratePerKg: 30000, minCharge: 30000 },

    // --- SUMATERA ORIGIN ---
    { originZone: 'SUMATERA', destZone: 'SUMATERA', service: 'regular', ratePerKg: 12000, minCharge: 12000 },
    { originZone: 'SUMATERA', destZone: 'JABODETABEK', service: 'regular', ratePerKg: 25000, minCharge: 25000 },
    { originZone: 'SUMATERA', destZone: 'JAWA', service: 'regular', ratePerKg: 28000, minCharge: 28000 },

    // --- SULAWESI ORIGIN ---
    { originZone: 'SULAWESI', destZone: 'SULAWESI', service: 'regular', ratePerKg: 15000, minCharge: 15000 },
    { originZone: 'SULAWESI', destZone: 'JABODETABEK', service: 'regular', ratePerKg: 40000, minCharge: 40000 },
];

/**
 * Gets the shipping zone for a given province name using fuzzy matching.
 */
export function getZoneForProvince(province: string): ShippingZone | null {
    if (!province) return null;

    const normalized = province.toUpperCase().trim();

    // Direct lookup
    if (PROVINCE_TO_ZONE[normalized]) {
        return PROVINCE_TO_ZONE[normalized];
    }

    // Fuzzy fallbacks for common variations
    if (normalized.includes('JAKARTA')) return 'JABODETABEK';
    if (normalized.includes('YOGYAKARTA')) return 'JAWA';
    if (normalized.includes('DI YOGYAKARTA')) return 'JAWA';
    if (normalized.includes('JAWA')) return 'JAWA';
    if (normalized.includes('BALI')) return 'BALI_NUSA';
    if (normalized.includes('NUSA TENGGARA')) return 'BALI_NUSA';
    if (normalized.includes('SUMATERA')) return 'SUMATERA'; // Note: careful not to catch 'SUMEDANG' etc if user enters city logic mistakenly
    if (normalized.includes('KALIMANTAN')) return 'KALIMANTAN';
    if (normalized.includes('SULAWESI')) return 'SULAWESI';
    if (normalized.includes('PAPUA')) return 'MALUKU_PAPUA';
    if (normalized.includes('MALUKU')) return 'MALUKU_PAPUA';

    // Default or null if no match found
    return null;
}

/**
 * Gets the shipping rate based on origin, destination, and service type.
 * Returns null if no rate is found.
 */
export function getShippingRate(
    originZone: ShippingZone,
    destZone: ShippingZone,
    service: ServiceType
): { ratePerKg: number; minCharge: number } | null {
    const rate = ZONE_RATES.find(
        (r) =>
            r.originZone === originZone &&
            r.destZone === destZone &&
            r.service === service
    );
    return rate ? { ratePerKg: rate.ratePerKg, minCharge: rate.minCharge } : null;
}

/**
 * Calculates shipping cost based on chargeable weight and rate.
 * Uses max(chargeableWeight * rate, minCharge).
 */
export function calculateShippingCost(
    chargeableWeight: number,
    ratePerKg: number,
    minCharge: number
): number {
    if (chargeableWeight <= 0) return 0;
    return Math.max(chargeableWeight * ratePerKg, minCharge);
}

/**
 * Gets all available service types for a given origin and destination zone.
 */
export function getAvailableServices(
    originZone: ShippingZone,
    destZone: ShippingZone
): ServiceType[] {
    return ZONE_RATES
        .filter(r => r.originZone === originZone && r.destZone === destZone)
        .map(r => r.service);
}
