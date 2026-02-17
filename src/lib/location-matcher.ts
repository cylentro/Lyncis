/**
 * Location Matcher Utility
 * Extracts and matches Indonesian location data from text
 */

export interface LocationData {
    province_name: string;
    city_name: string;
    district_name: string;
    subdistrict_name: string;
    postal_code: string;
}

export interface ExtractedLocation {
    provinsi: string;
    kota: string;
    kecamatan: string;
    kelurahan: string;
    kodepos: string;
    confidence: number; // 0-1 score
}

let cachedLocations: LocationData[] | null = null;

/**
 * Load location data from JSON file
 */
export async function loadLocationData(): Promise<LocationData[]> {
    if (cachedLocations) return cachedLocations;

    try {
        if (typeof window === 'undefined') {
            // Server-side / Node environment
            const fs = await import('fs');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'public', 'data', 'location.json');
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            cachedLocations = data;
            return data;
        } else {
            // Client-side / Browser environment
            const res = await fetch('/data/location.json');
            const data = await res.json();
            cachedLocations = data;
            return data;
        }
    } catch (err) {
        console.error('Failed to load location data:', err);
        return [];
    }
}

/**
 * Extract potential location keywords from address text
 */
function extractLocationKeywords(text: string): {
    postalCodes: string[];
    kelurahan: string[];
    kecamatan: string[];
    kota: string[];
    provinsi: string[];
} {
    const result = {
        postalCodes: [] as string[],
        kelurahan: [] as string[],
        kecamatan: [] as string[],
        kota: [] as string[],
        provinsi: [] as string[]
    };

    // Extract postal codes (5 digits)
    const postalMatches = text.match(/\b\d{5}\b/g);
    if (postalMatches) {
        result.postalCodes = postalMatches;
    }

    // Common Indonesian location markers
    // Common Indonesian location markers with lookahead boundaries
    // We must ensure that each marker stops capturing if it encounters another marker or a comma/end of string
    const stopLookahead = '(?=\\s*,|\\s*kel\\.?|\\s*kelurahan|\\s*kec\\.?|\\s*kecamatan|\\s*kota|\\s*kab\\.?|\\s*kabupaten|\\s*prov\\.?|\\s*provinsi|\\s*\\d{5}|\\s*$)';

    const kelurahanMarkers = new RegExp(`(?:kel\\.?|kelurahan)\\s+([A-Za-z0-9\\s()\\-]+?)${stopLookahead}`, 'gi');
    const kecamatanMarkers = new RegExp(`(?:kec\\.?|kecamatan)\\s+([A-Za-z0-9\\s()\\-]+?)${stopLookahead}`, 'gi');
    const kotaMarkers = new RegExp(`(?:kota|kab\\.?|kabupaten)\\s+([A-Za-z0-9\\s()\\-]+?)${stopLookahead}`, 'gi');
    const provinsiMarkers = new RegExp(`(?:prov\\.?|provinsi)\\s+([A-Za-z0-9\\s()\\-]+?)${stopLookahead}`, 'gi');

    let match;
    while ((match = kelurahanMarkers.exec(text)) !== null) {
        result.kelurahan.push(match[1].trim());
    }
    while ((match = kecamatanMarkers.exec(text)) !== null) {
        result.kecamatan.push(match[1].trim());
    }
    while ((match = kotaMarkers.exec(text)) !== null) {
        result.kota.push(match[1].trim());
    }
    while ((match = provinsiMarkers.exec(text)) !== null) {
        result.provinsi.push(match[1].trim());
    }

    return result;
}

/**
 * Fuzzy match a search term against location database
 */
function fuzzyMatchLocation(
    searchTerm: string,
    locations: LocationData[],
    field: keyof LocationData
): LocationData[] {
    const searchLower = searchTerm.toLowerCase().trim();

    // Exact match first
    const exactMatches = locations.filter(loc =>
        loc[field].toLowerCase() === searchLower
    );

    if (exactMatches.length > 0) return exactMatches;

    // Partial match
    const partialMatches = locations.filter(loc =>
        loc[field].toLowerCase().includes(searchLower) ||
        searchLower.includes(loc[field].toLowerCase())
    );

    return partialMatches;
}

/**
 * Split a name with parentheses into variants (e.g., "Setia Budi (Setiabudi)" -> ["Setia Budi (Setiabudi)", "Setia Budi", "Setiabudi"])
 */
function getVariants(name: string): string[] {
    const variants = [name];
    const match = name.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
        variants.push(match[1].trim());
        variants.push(match[2].trim());
    }
    return variants;
}

/**
 * Match extracted location data to the location database
 */
export async function matchLocation(addressText: string): Promise<ExtractedLocation | null> {
    const locations = await loadLocationData();
    if (locations.length === 0) return null;

    const keywords = extractLocationKeywords(addressText);

    // Priority 1: Postal Code (most specific)
    if (keywords.postalCodes.length > 0) {
        const postalCode = keywords.postalCodes[0];
        const postalMatches = locations.filter(loc => loc.postal_code === postalCode);

        if (postalMatches.length > 0) {
            const match = postalMatches[0];
            return {
                provinsi: match.province_name,
                kota: match.city_name,
                kecamatan: match.district_name,
                kelurahan: match.subdistrict_name,
                kodepos: match.postal_code,
                confidence: 0.95
            };
        }
    }

    // Priority 2: Keyword Scoring with Cross-Validation
    let candidates: LocationData[] = [];
    let searchScope: 'kelurahan' | 'kecamatan' | 'kota' | 'provinsi' | null = null;
    let primaryTerm = '';

    if (keywords.kelurahan.length > 0) {
        searchScope = 'kelurahan';
        primaryTerm = keywords.kelurahan[0].toLowerCase();
        candidates = locations.filter(l => l.subdistrict_name.toLowerCase().includes(primaryTerm));
    } else if (keywords.kecamatan.length > 0) {
        searchScope = 'kecamatan';
        primaryTerm = keywords.kecamatan[0].toLowerCase();
        candidates = locations.filter(l => l.district_name.toLowerCase().includes(primaryTerm));
    } else if (keywords.kota.length > 0) {
        searchScope = 'kota';
        primaryTerm = keywords.kota[0].toLowerCase();
        candidates = locations.filter(l => l.city_name.toLowerCase().includes(primaryTerm));
    }

    if (candidates.length === 0) return null;

    // Score candidates -> The higher the better
    const scored = candidates.map(loc => {
        let score = 0;

        // Base scoring from primary match
        if (searchScope === 'kelurahan') {
            const variants = getVariants(loc.subdistrict_name.toLowerCase());
            score += 10; // Base for partial match
            // Bonus for exact variant match
            if (variants.some(v => v === primaryTerm)) score += 15; // Increased bonus to ensure priority
        } else if (searchScope === 'kecamatan') {
            const variants = getVariants(loc.district_name.toLowerCase());
            score += 10;
            if (variants.some(v => v === primaryTerm)) score += 15;
        } else if (searchScope === 'kota') {
            const variants = getVariants(loc.city_name.toLowerCase());
            score += 5;
            if (variants.some(v => v === primaryTerm)) score += 10;
        }

        // Cross-validation bonuses (boost score if other fields match)
        if (keywords.kecamatan.length > 0 && searchScope !== 'kecamatan') {
            const variants = getVariants(loc.district_name.toLowerCase());
            if (variants.some(v => v.includes(keywords.kecamatan[0].toLowerCase()))) score += 15;
        }
        if (keywords.kota.length > 0 && searchScope !== 'kota') {
            const variants = getVariants(loc.city_name.toLowerCase());
            if (variants.some(v => v.includes(keywords.kota[0].toLowerCase()))) score += 10;
        }
        if (keywords.provinsi.length > 0) {
            const variants = getVariants(loc.province_name.toLowerCase());
            if (variants.some(v => v.includes(keywords.provinsi[0].toLowerCase()))) score += 5;
        }

        return { loc, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (best.score >= 20) {
        return {
            provinsi: best.loc.province_name,
            kota: best.loc.city_name,
            kecamatan: best.loc.district_name,
            kelurahan: best.loc.subdistrict_name,
            kodepos: best.loc.postal_code,
            confidence: Math.min(0.5 + (best.score / 60), 1.0)
        };
    }

    return null;
}

/**
 * Search for locations matching a query (for autocomplete)
 */
export function searchLocations(
    query: string,
    locations: LocationData[],
    limit: number = 10
): LocationData[] {
    if (!query || query.length < 3) return [];

    const searchLower = query.toLowerCase();
    return locations
        .filter((loc) => {
            return (
                loc.province_name.toLowerCase().includes(searchLower) ||
                loc.city_name.toLowerCase().includes(searchLower) ||
                loc.district_name.toLowerCase().includes(searchLower) ||
                loc.subdistrict_name.toLowerCase().includes(searchLower) ||
                loc.postal_code.includes(searchLower)
            );
        })
        .slice(0, limit);
}
