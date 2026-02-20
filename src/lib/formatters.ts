/**
 * Format a number as IDR currency (e.g., Rp 150.000 or IDR 150,000)
 */
export function formatCurrency(amount: number, locale: string = 'id-ID'): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

/**
 * Format weight in kg (e.g., 1,5 kg or 1.5 kg)
 */
export function formatWeight(weight: number, locale: string = 'id-ID'): string {
    return (weight || 0).toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
    }) + ' kg';
}
