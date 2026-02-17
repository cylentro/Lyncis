/**
 * Quick test for WhatsApp parser
 */

const testInput = `Budi
08123456789
Jl. Sudirman No. 1 
2x Pocky Matcha @30000
3 Chitato 45000`;

console.log('Testing WhatsApp Parser...\n');
console.log('Input:');
console.log(testInput);
console.log('\n---\n');

// Import would be: import { parseWhatsAppText } from '@/lib/whatsapp-parser';
// For testing, we'll just show expected output

const expectedOutput = {
  recipient: {
    name: 'Budi',
    phone: '08123456789',
    addressRaw: 'Jl. Sudirman No. 1',
  },
  items: [
    {
      name: 'Pocky Matcha',
      qty: 2,
      unitPrice: 30000,
      totalPrice: 60000,
      isManualTotal: false
    },
    {
      name: 'Chitato',
      qty: 3,
      unitPrice: 15000, // 45000 / 3
      totalPrice: 45000,
      isManualTotal: true // Because price is total for quantity
    }
  ]
};

console.log('Expected Output:');
console.log(JSON.stringify(expectedOutput, null, 2));
