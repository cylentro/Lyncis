import { parseWhatsAppText, getParsingConfidence } from '../whatsapp-parser';

describe('WhatsApp Parser', () => {
    describe('Scenario 1: Unlabeled block — qty×name @price + qty name price', () => {
        it('should correctly parse name, phone, address, and items', async () => {
            const input = `2x Pocky Matcha @30000
3 Chitato 45000
Budi
(+6281)234-567-890
Jl. Sudirman No. 1 kec. setiabudi`;

            const result = await parseWhatsAppText(input);

            expect(result).toHaveLength(1);
            const order = result[0];

            expect(order.recipient?.name).toBe('Budi');
            expect(order.recipient?.phone).toBe('6281234567890');
            expect(order.recipient?.addressRaw).toBe('Jl. Sudirman No. 1 kec. setiabudi');

            expect(order.items).toHaveLength(2);
            // Items might be out of order due to pattern grouping
            const pocky = order.items?.find(i => i.name === 'Pocky Matcha');
            const chitato = order.items?.find(i => i.name === 'Chitato');

            expect(pocky).toBeDefined();
            expect(pocky?.qty).toBe(2);
            expect(pocky?.unitPrice).toBe(30000);

            expect(chitato).toBeDefined();
            expect(chitato?.qty).toBe(3);
            expect(chitato?.unitPrice).toBe(15000); // 45000/3
        });
    });

    describe('Scenario 6: Dot thousand separator', () => {
        it('should parse prices with dots correctly', async () => {
            const input = `Nama: Rexlesis
HP: 081234567891
Alamat: Jl. Prof. DR. Satrio No.Kav.19, Kuningan, Karet Kuningan, Kecamatan Setiabudi, Kota Jakarta Selatan 12940
Pesanan:
2 ayam goreng @10k
3x coca cola 21.000`;

            const result = await parseWhatsAppText(input);
            const order = result[0];

            expect(order.items).toHaveLength(2);
            const ayam = order.items?.find(i => i.name === 'ayam goreng');
            const coca = order.items?.find(i => i.name === 'coca cola');

            expect(ayam).toBeDefined();
            expect(ayam?.unitPrice).toBe(10000);
            expect(coca).toBeDefined();
            expect(coca?.unitPrice).toBe(21000);
        });
    });

    describe('Scenario 8: Numbered list format', () => {
        it('should parse numbered lists with inline qty correctly', async () => {
            const input = `Nama: Siti
HP: 087812345678
Alamat: Jl. Raya Bogor Km.25, Ciracas, Jakarta Timur 13740
Pesanan:
1. Chitato Sapi Panggang @12000 (2pcs)
2. Pocky Matcha @30000
3. Teh Botol Sosro @5000 (3pcs)`;

            const result = await parseWhatsAppText(input);
            const order = result[0];

            expect(order.items).toHaveLength(3);
            const chitato = order.items?.find(i => i.name === 'Chitato Sapi Panggang');
            const teh = order.items?.find(i => i.name === 'Teh Botol Sosro');

            expect(chitato).toBeDefined();
            expect(chitato?.qty).toBe(2);
            expect(teh).toBeDefined();
            expect(teh?.qty).toBe(3);
        });
    });

    describe('Scenario 12: Missing Price', () => {
        it('should include unpriced items with price 0', async () => {
            const input = `Nama: Rexles
HP: 081234567890
Alamat: Jl. Prof. DR. Satrio No.Kav.18, Kuningan, Karet Kuningan, Kecamatan Setiabudi
Pesanan:
2 ayam goreng
3x coca cola`;

            const result = await parseWhatsAppText(input);
            const order = result[0];

            expect(order.items).toHaveLength(2);
            const ayam = order.items?.find(i => i.name === 'ayam goreng');
            const coca = order.items?.find(i => i.name === 'coca cola');

            expect(ayam).toBeDefined();
            expect(ayam?.unitPrice).toBe(0);
            expect(coca).toBeDefined();
            expect(coca?.unitPrice).toBe(0);
        });
    });

    describe('Scenario 19: Multiple orders', () => {
        it('should split multiple orders by separators', async () => {
            const input = `Nama: Order A
HP: 081111111111
Alamat: Jl. A No.1, Menteng, Jakarta Pusat 10310
Pesanan: 1x Chitato @12000

===

Nama: Order B
HP: 082222222222
Alamat: Jl. B No.2, Gambir, Jakarta Pusat 10110
Pesanan: 2x Pocky @30000

---

Nama: Order C
HP: 083333333333
Alamat: Jl. C No.3, Sawah Besar, Jakarta Pusat 10710
Pesanan: 3 Aqua 600ml 9000`;

            const result = await parseWhatsAppText(input);
            expect(result).toHaveLength(3);
            expect(result[0].recipient?.name).toBe('Order A');
            expect(result[1].recipient?.name).toBe('Order B');
            expect(result[2].recipient?.name).toBe('Order C');
        });
    });
});
