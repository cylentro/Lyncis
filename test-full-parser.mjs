/**
 * Standalone test - copy the exact logic from whatsapp-parser.ts
 */

const testInput = `Budi
081234567890
Jl. Sudirman No. 1
2x Pocky Matcha @30000
3 Chitato 45000`;

console.log('=== FULL PARSER TEST ===\n');
console.log('Input:');
console.log(testInput);
console.log('\n---\n');

// Step 1: Extract items
const items = [];
const pattern1 = /(\d+)\s*x\s*([^@\n]+?)(?:\s*@\s*(?:Rp\.?\s*)?([0-9.,]+))?(?=\n|$)/gi;
const pattern6 = /^([1-9]\d?)\s+([A-Za-z][^\d\n]+?)\s+(?:Rp\.?\s*)?([0-9.,]+)$/gmi;

let match;
while ((match = pattern1.exec(testInput)) !== null) {
  const qty = parseInt(match[1]);
  const name = match[2].trim();
  const unitPrice = parseInt((match[3] || '0').replace(/[.,\s]/g, ''));
  items.push({ name, qty, unitPrice, totalPrice: qty * unitPrice, isManualTotal: false });
}

while ((match = pattern6.exec(testInput)) !== null) {
  const qty = parseInt(match[1]);
  const name = match[2].trim();
  const totalPrice = parseInt(match[3].replace(/[.,\s]/g, ''));
  const unitPrice = Math.round(totalPrice / qty);
  items.push({ name, qty, unitPrice, totalPrice, isManualTotal: true });
}

console.log('Items extracted:');
items.forEach((item, i) => {
  console.log(`  ${i + 1}. ${item.qty}x ${item.name} - Unit: ${item.unitPrice}, Total: ${item.totalPrice}`);
});

// Step 2: Remove item lines
let cleanedBlock = testInput;
const itemPatterns = [
  /^\d+\s*x\s*[^@\n]+(?:\s*@\s*(?:Rp\.?\s*)?[0-9.,]+)?$/gmi,
  /^([1-9]\d?)\s+[A-Za-z][^\d\n]+?\s+(?:Rp\.?\s*)?[0-9.,]+$/gmi,
];

itemPatterns.forEach(pattern => {
  cleanedBlock = cleanedBlock.replace(pattern, '');
});

cleanedBlock = cleanedBlock.replace(/\n{2,}/g, '\n').trim();

console.log('\nCleaned text (after removing items):');
console.log(cleanedBlock);
console.log('\n---\n');

// Step 3: Extract contact (simplified - just split by lines)
const lines = cleanedBlock.split('\n').map(l => l.trim()).filter(l => l);

const contact = {
  name: '',
  phone: '',
  address: ''
};

// Simple heuristic: first line is name, phone line has digits, rest is address
lines.forEach((line, i) => {
  if (i === 0) {
    contact.name = line;
  } else if (/^[\+\(]?[0-9]{8,}/.test(line)) {
    contact.phone = line.replace(/[^\d+]/g, '');
  } else if (line.match(/\bjl\b|\bjalan\b|\brt\b|\brw\b/i)) {
    contact.address = line;
  }
});

console.log('Contact extracted:');
console.log(`  Name: ${contact.name}`);
console.log(`  Phone: ${contact.phone}`);
console.log(`  Address: ${contact.address}`);

console.log('\n---\n');
console.log('Final Result:');
console.log(JSON.stringify({ recipient: contact, items }, null, 2));
