
import {
    getZoneForProvince,
    getShippingRate,
    calculateShippingCost,
} from '../shipping-zones';

describe('Shipping Zones Logic', () => {
    describe('getZoneForProvince', () => {
        it('returns correct zone for JABODETABEK provinces', () => {
            expect(getZoneForProvince('DKI Jakarta')).toBe('JABODETABEK');
            expect(getZoneForProvince('Banten')).toBe('JABODETABEK');
        });

        it('returns correct zone for JAWA provinces', () => {
            expect(getZoneForProvince('Jawa Barat')).toBe('JAWA');
            expect(getZoneForProvince('Jawa Timur')).toBe('JAWA');
            expect(getZoneForProvince('DI Yogyakarta')).toBe('JAWA');
        });

        it('returns correct zone for remote provinces', () => {
            expect(getZoneForProvince('Papua')).toBe('MALUKU_PAPUA');
            expect(getZoneForProvince('Bali')).toBe('BALI_NUSA');
            expect(getZoneForProvince('Sulawesi Utara')).toBe('SULAWESI');
        });

        it('handles fuzzy matching', () => {
            expect(getZoneForProvince('Propinsi DKI Jakarta')).toBe('JABODETABEK');
            expect(getZoneForProvince('DI. Yogyakarta')).toBe('JAWA');
        });

        it('returns null for unknown provinces', () => {
            expect(getZoneForProvince('Unknown Province')).toBeNull();
            expect(getZoneForProvince('')).toBeNull();
        });
    });

    describe('getShippingRate', () => {
        it('returns rate for valid route', () => {
            const rate = getShippingRate('JABODETABEK', 'JAWA', 'regular');
            expect(rate).not.toBeNull();
            expect(rate?.ratePerKg).toBe(12000);
            expect(rate?.minCharge).toBe(12000);
        });

        it('returns null for invalid/undefined route', () => {
            // instant service only defined for JABODETABEK -> JABODETABEK
            const rate = getShippingRate('JABODETABEK', 'MALUKU_PAPUA', 'instant');
            expect(rate).toBeNull();
        });
    });

    describe('calculateShippingCost', () => {
        it('calculates cost based on weight * rate', () => {
            // 2.5 kg * 8000 = 20000
            expect(calculateShippingCost(2.5, 8000, 10000)).toBe(20000);
        });

        it('applies minimum charge if cost is below min', () => {
            // 0.5 kg * 8000 = 4000 (below min 10000)
            expect(calculateShippingCost(0.5, 8000, 10000)).toBe(10000);
        });
    });
});
