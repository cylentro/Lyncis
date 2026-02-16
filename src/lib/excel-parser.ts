import * as XLSX from 'xlsx';

export interface ExcelParseResult {
    headers: string[];
    rows: Record<string, string>[];
}

/**
 * Parses an Excel or CSV file and returns headers and rows as a JSON object.
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });

                // Use the first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                // raw: false ensures everything is converted to strings for easier mapping later
                const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
                    raw: false,
                    defval: '',
                });

                if (rows.length === 0) {
                    resolve({ headers: [], rows: [] });
                    return;
                }

                // Extract headers from the first row object keys
                const headers = Object.keys(rows[0]);

                // Ensure all rows are Record<string, string>
                const stringifiedRows = rows.map(row => {
                    const stringified: Record<string, string> = {};
                    for (const key in row) {
                        stringified[key] = String(row[key]);
                    }
                    return stringified;
                });

                resolve({ headers, rows: stringifiedRows });
            } catch (error) {
                reject(new Error('Gagal membaca file Excel. Pastikan file tidak rusak.'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Gagal membaca file.'));
        };

        reader.readAsArrayBuffer(file);
    });
}
