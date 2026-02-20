
import {
    calculateVolumetricWeight,
    calculateChargeableWeight,
} from '../logistics';

describe('Logistics Calculations', () => {
    describe('calculateVolumetricWeight', () => {
        it('calculates volumetric weight correctly for standard dimensions', () => {
            // 30 x 20 x 10 = 6000 / 6000 = 1.0 kg
            expect(calculateVolumetricWeight(30, 20, 10)).toBe(1.0);
        });

        it('calculates volumetric weight for larger dimensions', () => {
            // 50 x 40 x 3 = 6000 = 1.0 kg
            // 50 x 40 x 30 = 60000 / 6000 = 10.0 kg
            expect(calculateVolumetricWeight(50, 40, 30)).toBe(10.0);
        });

        it('handles zero dimensions by returning 0', () => {
            expect(calculateVolumetricWeight(0, 20, 10)).toBe(0);
        });

        it('handles negative dimensions by returning 0', () => {
            expect(calculateVolumetricWeight(-10, 20, 10)).toBe(0);
        });
    });

    describe('calculateChargeableWeight', () => {
        it('uses actual weight when it is greater than volumetric', () => {
            // max(2.5, 1.0) = 2.5
            expect(calculateChargeableWeight(2.5, 1.0)).toBe(2.5);
        });

        it('uses volumetric weight when it is greater than actual', () => {
            // max(0.5, 1.0) = 1.0
            expect(calculateChargeableWeight(0.5, 1.0)).toBe(1.0);
        });
    });
});
