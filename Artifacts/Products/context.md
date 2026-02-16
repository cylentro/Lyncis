# PROJECT CONTEXT: Lyncis (LJI-POC)

## IDENTITY & MISSION

**Lyncis** is a high-velocity staging and orchestration layer for logistics companies. It is designed to ingest chaotic, unstructured data from Jastipers (Personal Shoppers) and transform it into structured, fulfillment-ready batches.

- App Name: Lyncis
- Version: 1.0.0 (POC)
- Primary Goal: Minimize "Time-to-Label" for logistics hubs handling informal commerce.

## TECH STACK & SYSTEM ARCHITECTURE

Lyncis is built as a PWA (Progressive Web App) with an Offline-First mindset to support users in low-connectivity environments (e.g., warehouses or international trips).

- Framework: Next.js 15 (App Router)
- State Management & Persistence: Dexie.js (IndexedDB) for client-side storage.
- UI/Styling: Tailwind CSS + Shadcn/UI + Lucide Icons.
- Parsing Intelligence: 
    - Tier 1: Local Regex (Fastest, 0-cost).
    - Tier 2: LLM Extraction (Gemini 2.5 Flash) for complex WhatsApp text.
- Address Engine: Custom Indonesian Hierarchy Parser + Google Places/OSM API for failover.

## DATA MODELS (TypeScript Definitions)

### 1. Order Object Schema

```
type OrderStatus = 'unassigned' | 'staged' | 'processed';
    
interface JastipOrder {
      id: string; // UUID v4
      createdAt: number; // Unix timestamp
      tag: string; // User-defined label (e.g., "BKK-MAY-2024")
      status: OrderStatus;
      
      // Recipient Information (Strict Indonesian Hierarchy)
      recipient: {
        name: string;
        phone: string;
        addressRaw: string; // Original input string
        provinsi: string;
        kota: string;
        kecamatan: string;
        kelurahan: string;
        kodepos: string;
      };
    
      // Item List & Circular Pricing
      items: Array<{
        id: string;
        name: string;
        qty: number;
        unitPrice: number;
        totalPrice: number;
        isManualTotal: boolean; // Flag to prevent rounding overrides
        rawWeightKg: number; // Estimated weight per unit
      }>;
    
      // Final Logistics Metrics
      logistics: {
        originId: string | null; // e.g., "HUB-BATAM-01"
        finalPackedWeight: number; // Actual scale weight
        dimensions: { l: number; w: number; h: number }; // In cm
        volumetricWeight: number; // (L*W*H)/6000
        chargeableWeight: number; // Max(finalWeight, volumetricWeight)
      };
    }
```

## CORE FUNCTIONAL ENGINES

### A. The Circular Pricing Controller

The UI components for item entry must implement the following reactive logic:

1. Direct Unit Update: When `unitPrice` is modified, calculate `totalPrice = qty * unitPrice`.
2. Total Price Update: When `totalPrice` is modified, calculate `unitPrice = totalPrice / qty`.
3. Conflict Handling: If `totalPrice` is manually overridden by the user, set `isManualTotal = true` to ensure the system does not re-calculate it if `qty` changes later without a prompt.

### B. The Hybrid Intake Engine

Lyncis uses a dual-entry method to maximize flexibility:

#### 1. Excel Upload (The "Big Bang")

- Sticky Header Mapping: Upon upload, the system generates a hash of all column headers.
- Memory: If the hash matches an entry in `localStorage.header_maps`, auto-populate the field mapping.
- New Mappings: If unknown, the user maps columns (e.g., "No. HP" -> `phone`). The system then "learns" this fingerprint for future use.

#### 2. WhatsApp Paste (The "Drip")

- Pattern Recognition: Scans text for common Jastip markers (e.g., "Nama:", "Almt:", "Qty:").
- Regex Fallback: If pattern confidence is low, the raw string is sent to Gemini Flash with a specific system prompt to return the `JastipOrder` JSON structure.

### C. The Address Validation Funnel

1. Extraction: Regex pulls keywords for Provinsi and Kota.
2. Inference: If a unique `Kecamatan` is found, the system auto-fills the parent `Kota` and `Provinsi` from a local static dictionary.
3. Visual Failover: A "Map Lookup" button opens an autocomplete search bar. Selecting a result populates the entire Indonesian hierarchy automatically.

## WORKSPACE LOGIC (THE BUCKET)

### 1. Tag Lifecycle

- Active Autocomplete: Tags associated with `unassigned` orders are available in suggestions.
- Archive: Once a batch is `processed`, the tag is removed from the fast-entry autocomplete but remains available in the "Historical Filter" dropdown.

### 2. Fulfillment Batching

- Users select multiple orders from the "Open Bucket."
- Final Step: Select `Origin` (fixed per batch).
- Packing Phase: Input `finalPackedWeight` and `dimensions` per order to generate the final logistics payload.

## UI/UX & LABELING (Bahasa Indonesia)

| System Key | UI Label (ID) |
| --- | --- |
| `Recipient Name` | `Nama Penerima` |
| `Address` | `Alamat Lengkap` |
| `Order Bucket` | `Keranjang Pesanan` |
| `Origin` | `Asal Pengiriman` |
| `Final Weight` | `Berat Akhir (Setelah Packing)` |
| `Chargeable Weight` | `Berat Tagihan` |
| `Staged` | `Siap Kirim` |

## SYSTEM CONSTRAINTS for ANTIGRAVITY

- No Central DB: Do not attempt to use Firestore or SQL. Strictly use `Dexie.js`.
- No Auth for POC: Assume a single-user environment for now.
- Offline Priority: Ensure all parsing logic (except LLM fallback) works without an internet connection.
- Component Structure: All components should be located in `@/components/lyncis/`.