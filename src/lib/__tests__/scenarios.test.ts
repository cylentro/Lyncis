import { describe, it, expect } from 'vitest';
import { parseWhatsAppText } from '../whatsapp-parser';

describe('Parser Scenario Regressions', () => {

    it('Scenario 5: Recognition of "1 Teh Pucuk 2.5k"', async () => {
        const input = `Nama: Dewi
HP: 081298765432
Alamat: Jl. Gatot Subroto No.5, Karet Semanggi, Setiabudi, Jakarta Selatan 12930
Pesanan:
2x Mie Goreng @3.5k
1 Teh Pucuk 2.5k
3 Aqua 600ml @2k`;

        const results = await parseWhatsAppText(input);
        expect(results.length).toBe(1);
        const order = results[0];

        // Teh Pucuk (Pattern 6 or 9)
        const tehPucuk = order.items?.find(i => i.name.toLowerCase().includes('teh pucuk'));
        expect(tehPucuk).toBeDefined();
        expect(tehPucuk?.unitPrice).toBe(2500);

        // Aqua 600ml (Pattern 7)
        const aqua = order.items?.find(i => i.name.toLowerCase().includes('aqua'));
        expect(aqua).toBeDefined();
        expect(aqua?.name).toContain('600ml');

        // Check address leakage
        expect(order.recipient?.addressRaw).not.toContain('Teh Pucuk');
        expect(order.recipient?.addressRaw).not.toContain('Mie Goreng');
    });

    it('Scenario 9: item "Aqua 600ml 3000" in list', async () => {
        const input = `Nama: Hendra
HP: 089612345678
Alamat: Jl. Margonda Raya No.100, Depok, Jawa Barat 16424
Pesanan:
- Indomie Goreng 3500
- Chitato 12000 x2
- Aqua 600ml 3000`;

        const results = await parseWhatsAppText(input);
        expect(results.length).toBe(1);
        const order = results[0];

        const aqua = order.items?.find(i => i.name.toLowerCase().includes('aqua'));
        expect(aqua).toBeDefined();
        expect(aqua?.unitPrice).toBe(3000);

        // Address leakage check
        expect(order.recipient?.addressRaw).not.toContain('Aqua');
    });

    it('Scenario 11: "Aqua 600ml 6 18000" — exactly 2 items, no duplicates', async () => {
        const input = `Nama: Fajar
HP: 085612345678
Alamat: Jl. Raya Serpong No.7, Tangerang Selatan, Banten 15310
Pesanan:
Indomie Goreng Rendang 3 9000
Aqua 600ml 6 18000`;

        const results = await parseWhatsAppText(input);
        expect(results.length).toBe(1);
        const order = results[0];

        // MUST have exactly 2 items (no duplicates from P6+P8 both matching)
        expect(order.items?.length).toBe(2);

        const indomie = order.items?.find(i => i.name.toLowerCase().includes('indomie'));
        expect(indomie).toBeDefined();
        expect(indomie?.qty).toBe(3);

        const aqua = order.items?.find(i => i.name.toLowerCase().includes('aqua'));
        expect(aqua).toBeDefined();
        expect(aqua?.qty).toBe(6);
        expect(aqua?.unitPrice).toBe(3000); // 18000 / 6

        expect(order.recipient?.addressRaw).not.toContain('Aqua');
    });

    it('Scenario 19-A: "Pesanan: 1x Chitato @12000" inline (with x)', async () => {
        const input = `Nama: Order A
HP: 081111111111
Alamat: Jl. A No.1, Menteng, Jakarta Pusat 10310
Pesanan: 1x Chitato @12000`;

        const results = await parseWhatsAppText(input);
        expect(results.length).toBe(1);
        const order = results[0];

        expect(order.items?.length).toBe(1);
        expect(order.items?.[0].name).toContain('Chitato');
        expect(order.recipient?.addressRaw).not.toContain('Chitato');
        expect(order.recipient?.addressRaw).not.toContain('Pesanan');
    });

    it('Scenario 19-C: "Pesanan: 3 Aqua 600ml 9000" inline (without x)', async () => {
        const input = `Nama: Order C
HP: 083333333333
Alamat: Jl. C No.3, Sawah Besar, Jakarta Pusat 10710
Pesanan: 3 Aqua 600ml 9000`;

        const results = await parseWhatsAppText(input);
        expect(results.length).toBe(1);
        const order = results[0];

        // "Pesanan: 3 Aqua 600ml 9000" should parse as 1 item (qty 3)
        const aquaC = order.items?.find(i => i.name.toLowerCase().includes('aqua'));
        expect(aquaC).toBeDefined();
        expect(aquaC?.qty).toBe(3);
        // Address must NOT contain item lines
        expect(order.recipient?.addressRaw).not.toContain('Aqua');
        expect(order.recipient?.addressRaw).not.toContain('Pesanan');
    });

    it('Scenario 3: "alamat taman duren sawit" should NOT be an item', async () => {
        const input = `chris
telepon: 08123456901
alamat taman duren sawit 13440
order:
1 chitato @30k
2 indomie @15000`;

        const results = await parseWhatsAppText(input);
        expect(results.length).toBe(1);
        const order = results[0];

        // "alamat taman duren sawit" should be address, not an item
        const asItem = order.items?.find(i => i.name.toLowerCase().includes('taman duren sawit'));
        expect(asItem).toBeUndefined();

        expect(order.recipient?.addressRaw).toContain('taman duren sawit');
        expect(order.items?.length).toBe(2);
    });

    it('Scenario 2: potentialItemCount skips foreign-format address with kecamatan keyword', async () => {
        const input = `2x Pocky Matcha @30000
Budi
+65-8123-(4567)
3 Chitato 45000
Buangkok avenue 1 #19-1928 kecamatan setiabudi kelurahan setia budi`;

        const { countPotentialItems } = await import('../item-parser');
        const count = countPotentialItems(input);
        // "Buangkok avenue 1 #19-1928 kecamatan..." must NOT be counted
        expect(count).toBe(2);
    });

    it('Scenario 3: potentialItemCount skips unlabeled address "alamat taman duren sawit"', async () => {
        const input = `chris
telepon: 08123456901
alamat taman duren sawit 13440
order:
1 chitato @30k
2 indomie @15000`;

        const { countPotentialItems } = await import('../item-parser');
        const count = countPotentialItems(input);
        // "alamat taman duren sawit 13440" must NOT be counted
        expect(count).toBe(2);
    });

});
