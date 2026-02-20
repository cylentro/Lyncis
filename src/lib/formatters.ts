/**
 * Format a number as IDR currency (e.g., Rp 150.000)
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

/**
 * Format weight in kg (e.g., 1,5 kg)
 * Note: uses id-ID locale so decimal uses comma
 */
export function formatWeight(weight: number): string {
    return (weight || 0).toLocaleString('id-ID', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
    }) + ' kg';
}
