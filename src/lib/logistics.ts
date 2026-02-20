
/**
 * Calculates volumetric weight in kg based on dimensions in cm.
 * Formula: (L * W * H) / 6000
 * Rounds up to 2 decimal places.
 */
export function calculateVolumetricWeight(
    l: number,
    w: number,
    h: number
): number {
    if (l <= 0 || w <= 0 || h <= 0) return 0;
    const vol = (l * w * h) / 6000;
    return Math.ceil(vol * 100) / 100;
}

/**
 * Calculates chargeable weight as the maximum of actual weight and volumetric weight.
 * Implements standard logistics rounding: 
 * - Decimal <= 0.3 is rounded down
 * - Decimal > 0.3 is rounded up
 * - Minimum chargeable weight is 1.0 kg
 */
export function calculateChargeableWeight(
    actualWeight: number,
    volumetricWeight: number
): number {
    const rawWeight = Math.max(actualWeight, volumetricWeight);
    if (rawWeight === 0) return 0;
    if (rawWeight <= 1) return 1;

    const integerPart = Math.floor(rawWeight);
    const decimalPart = rawWeight - integerPart;

    // Use a small epsilon for float precision issues
    if (decimalPart <= 0.300001) {
        return Math.max(1, integerPart);
    } else {
        return integerPart + 1;
    }
}
