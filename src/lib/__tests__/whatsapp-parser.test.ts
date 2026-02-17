import { parseWhatsAppText, getParsingConfidence } from '../whatsapp-parser';

describe('WhatsApp Parser', () => {
    describe('Simple unlabeled format', () => {
        it('should correctly parse name, phone, address, and items', () => {
            const input = `Budi
081234567890
Jl. Sudirman No. 1
2x Pocky Matcha @30000
3 Chitato 45000`;

            const result = parseWhatsAppText(input);

            console.log('=== PARSER TEST RESULT ===');
            console.log('Input:', input);
            console.log('\nParsed Orders:', JSON.stringify(result, null, 2));

            expect(result).toHaveLength(1);

            const order = result[0];

            // Check recipient info
            expect(order.recipient?.name).toBe('Budi');
            expect(order.recipient?.phone).toBe('081234567890');
            expect(order.recipient?.addressRaw).toBe('Jl. Sudirman No. 1');

            // Check items
            expect(order.items).toHaveLength(2);

            // Item 1: 2x Pocky Matcha @30000
            expect(order.items![0].name).toBe('Pocky Matcha');
            expect(order.items![0].qty).toBe(2);
            expect(order.items![0].unitPrice).toBe(30000);
            expect(order.items![0].totalPrice).toBe(60000);
            expect(order.items![0].isManualTotal).toBe(false);

            // Item 2: 3 Chitato 45000 (total price for quantity)
            expect(order.items![1].name).toBe('Chitato');
            expect(order.items![1].qty).toBe(3);
            expect(order.items![1].totalPrice).toBe(45000);
            expect(order.items![1].unitPrice).toBe(15000); // 45000 / 3
            expect(order.items![1].isManualTotal).toBe(true);

            // Check confidence
            const confidence = getParsingConfidence(order);
            expect(confidence).toBeGreaterThan(0.8);
        });
    });

    describe('Multiple item patterns', () => {
        it('should handle various item formats', () => {
            const input = `John Doe
08123456789
Jl. Merdeka 123
2x Indomie Goreng @5000
Chitato - 3pcs - 45000
- Pocky 30000
1. Oreo @25000 (2pcs)
5 Taro 50000`;

            const result = parseWhatsAppText(input);
            const order = result[0];

            console.log('\n=== MULTIPLE PATTERNS TEST ===');
            console.log('Items found:', order.items?.length);
            order.items?.forEach((item, i) => {
                console.log(`Item ${i + 1}:`, {
                    name: item.name,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    isManualTotal: item.isManualTotal
                });
            });

            expect(order.items).toHaveLength(5);
        });
    });

    describe('Labeled format', () => {
        it('should handle labeled contact info', () => {
            const input = `Nama: Siti
HP: 08987654321
Alamat: Jl. Gatot Subroto No. 5
2x Pocky @30000`;

            const result = parseWhatsAppText(input);
            const order = result[0];

            console.log('\n=== LABELED FORMAT TEST ===');
            console.log('Name:', order.recipient?.name);
            console.log('Phone:', order.recipient?.phone);
            console.log('Address:', order.recipient?.addressRaw);

            expect(order.recipient?.name).toBe('Siti');
            expect(order.recipient?.phone).toBe('08987654321');
            expect(order.recipient?.addressRaw).toContain('Jl. Gatot Subroto');
        });
    });

    describe('Edge cases', () => {
        it('should handle missing address', () => {
            const input = `Budi
081234567890
2x Pocky @30000`;

            const result = parseWhatsAppText(input);
            const order = result[0];

            expect(order.recipient?.name).toBe('Budi');
            expect(order.recipient?.phone).toBe('081234567890');
            expect(order.items).toHaveLength(1);
        });

        it('should handle phone with country code', () => {
            const input = `Budi
+6281234567890
Jl. Sudirman No. 1
2x Pocky @30000`;

            const result = parseWhatsAppText(input);
            const order = result[0];

            expect(order.recipient?.phone).toMatch(/\+?6281234567890/);
        });
    });
});
