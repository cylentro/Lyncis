/**
 * Simple test runner for WhatsApp parser
 * Run with: node test-whatsapp-parser.mjs
 */

// Import the parser (we'll need to transpile or use dynamic import)
const testInput = `2x Pocky Matcha @30000 
3 Chitato 45000
Budi
081234567890
Jl. Sudirman No. 1`;

console.log('=== WhatsApp Parser Test ===\n');
console.log('Input:');
console.log(testInput);
console.log('\n---\n');

// We'll manually test the logic here
// First, let's see what the item extraction would find

const itemPatterns = {
  pattern1: /^\s*(\d+)\s*x\s*([^@\n]+?)(?:\s*@\s*(?:Rp\.?\s*)?([0-9.,]+))?\s*$/gmi,
  pattern6: /^\s*([1-9]\d?)\s+([A-Za-z][^\d\n]+?)\s+(?:Rp\.?\s*)?([0-9.,]+)\s*$/gmi,
};

console.log('Testing Pattern 1 (Qty x Item @ Price):');
let match;
const pattern1Regex = /^\s*(\d+)\s*x\s*([^@\n]+?)(?:\s*@\s*(?:Rp\.?\s*)?([0-9.,]+))?\s*$/gmi;
while ((match = pattern1Regex.exec(testInput)) !== null) {
  console.log(`  Found: "${match[0]}"`);
  console.log(`    Qty: ${match[1]}, Name: ${match[2].trim()}, Price: ${match[3] || '0'}`);
}

console.log('\nTesting Pattern 6 (Qty Item TotalPrice):');
const pattern6Regex = /^\s*([1-9]\d?)\s+([A-Za-z][^\d\n]+?)\s+(?:Rp\.?\s*)?([0-9.,]+)\s*$/gmi;
while ((match = pattern6Regex.exec(testInput)) !== null) {
  console.log(`  Found: "${match[0]}"`);
  console.log(`    Qty: ${match[1]}, Name: ${match[2].trim()}, TotalPrice: ${match[3]}`);
}

console.log('\n---\n');

// Test item removal
let cleanedBlock = testInput;
const removalPatterns = [
  { name: 'Pattern 1', regex: /^\s*\d+\s*x\s*[^@\n]+(?:\s*@\s*(?:Rp\.?\s*)?[0-9.,]+)?\s*$/gmi },
  { name: 'Pattern 6', regex: /^([1-9]\d?)\s+[A-Za-z][^\d\n]+?\s+(?:Rp\.?\s*)?[0-9.,]+$/gmi },
];

console.log('After removing item patterns:');
removalPatterns.forEach((pattern) => {
  const before = cleanedBlock;
  cleanedBlock = cleanedBlock.replace(pattern.regex, '');
  if (before !== cleanedBlock) {
    console.log(`  ${pattern.name} removed:`, before.split('\n').filter(line => !cleanedBlock.includes(line)));
  }
});

cleanedBlock = cleanedBlock.replace(/\n{2,}/g, '\n').trim();
console.log('\nCleaned text for contact extraction:');
console.log(cleanedBlock);
console.log('\n---\n');

// Test phone extraction
const phoneLabels = ['hp', 'wa', 'telp', 'phone', 'mobile', 'tel', 'tlp', 'whatsapp', 'ph', 'telepon', 'telpon', 'no telp', 'no. hp', 'contact', 'no hp', 'no. telp'];
const phoneRegex = new RegExp(
  '(?:' + phoneLabels.join('|').replace(/\./g, '\\.') + ')\\b\\s*[:\\-]*\\s*([\\+\\(0-9][0-9\\s\\.\\-()]{4,}[0-9A-Z]*)|((?:\\+|00|08|62|021|\\([0-9]{2,}\\))[0-9\\s\\.\\-()]{5,}[0-9A-Z]*)',
  'i'
);

console.log('Testing phone extraction on cleaned text:');
const phoneMatch = cleanedBlock.match(phoneRegex);
if (phoneMatch) {
  console.log(`  Found: "${phoneMatch[0]}"`);
  console.log(`  Extracted: "${(phoneMatch[1] || phoneMatch[2]).trim()}"`);
} else {
  console.log('  No phone found!');
}

console.log('\n---\n');
console.log('Expected Result:');
console.log({
  recipient: {
    name: 'Budi',
    phone: '081234567890',
    addressRaw: 'Jl. Sudirman No. 1'
  },
  items: [
    { name: 'Pocky Matcha', qty: 2, unitPrice: 30000, totalPrice: 60000 },
    { name: 'Chitato', qty: 3, unitPrice: 15000, totalPrice: 45000 }
  ]
});
