
import { JastipOrder } from './types';

export interface ValidationResult {
    isComplete: boolean;
    issues: string[];
}

/**
 * Validates if an order has all necessary fields to proceed to fulfillment.
 */
export function validateOrderForBatch(order: JastipOrder): ValidationResult {
    const issues: string[] = [];

    // Recipient Checks
    if (!order.recipient.name?.trim()) {
        issues.push("Nama penerima kosong");
    }
    if (!order.recipient.phone?.trim()) {
        issues.push("No. telepon kosong");
    }
    if (!order.recipient.addressRaw?.trim()) {
        issues.push("Alamat lengkap kosong");
    }

    // Structured Location Checks (Required for logistics/shipping calculation)
    if (!order.recipient.provinsi?.trim()) {
        issues.push("Provinsi belum teridentifikasi");
    }
    if (!order.recipient.kota?.trim()) {
        issues.push("Kota belum teridentifikasi");
    }
    if (!order.recipient.kecamatan?.trim()) {
        issues.push("Kecamatan belum teridentifikasi");
    }
    if (!order.recipient.kelurahan?.trim()) {
        issues.push("Kelurahan belum teridentifikasi");
    }
    if (!order.recipient.kodepos?.trim()) {
        issues.push("Kodepos belum teridentifikasi");
    }

    // Item Checks
    if (!order.items || order.items.length === 0) {
        issues.push("Tidak ada barang");
    } else {
        // Check if items have prices
        const hasPrice = order.items.some(item => item.unitPrice > 0 || item.totalPrice > 0);
        if (!hasPrice) {
            issues.push("Semua barang belum ada harga");
        }
    }

    return {
        isComplete: issues.length === 0,
        issues,
    };
}

/**
 * Validates a batch of orders.
 */
export function validateBatch(orders: JastipOrder[]): {
    allComplete: boolean;
    results: Map<string, ValidationResult>;
} {
    const results = new Map<string, ValidationResult>();
    let allComplete = true;

    for (const order of orders) {
        const result = validateOrderForBatch(order);
        results.set(order.id, result);
        if (!result.isComplete) {
            allComplete = false;
        }
    }

    return { allComplete, results };
}
