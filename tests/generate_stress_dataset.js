const fs = require('fs');
const path = require('path');

const firstNames = ['José', 'Müller', 'François', 'Søren', 'Björn', 'Chloë', 'Noël', 'Renée', 'Stéphane', 'Zoë'];
const lastNames = ['Smith', 'O\'Connor', 'García', 'Müller', 'D\'Angelo', 'Kowalski', 'López', 'van der Berg'];
const products = [
  '24" Gaming Monitor 144Hz',
  '32" Curved "Pro" 4K Display',
  'Titanium 1/2" & 1/4" Hex Shank Drill Bits',
  '12-Cup "Barista Reserve" Coffee Maker',
  'Ergonomic "Executive" Mesh Office Chair',
  '15.6" Ultra-Slim "AirFlow" Laptop',
  'Stainless Steel 8" Chef\'s Knife',
  'Heavy-Duty 10" Table Saw Blade'
];
const categories = ['Electronics', 'Hardware, Tools', 'Home & Kitchen', 'Office, Furniture', 'Computers'];

const rows = ['ID,Customer Name,Email,Phone,Credit Card,Product Title,Category,SKU,Unit Price,Quantity,Notes'];

for (let i = 1; i <= 1000; i++) {
  const fName = firstNames[i % firstNames.length];
  const lName = lastNames[i % lastNames.length];
  const fullName = `${fName} ${lName}`;
  const email = `user.${i}_${fName.toLowerCase().replace(/[^a-z]/g, '')}@example-corp.com`;
  const phone = `+1 (555) ${String(100 + (i % 900))}-${String(1000 + (i % 9000))}`;
  const card = `4111-2222-3333-${String(1000 + (i % 9000))}`;
  const prod = products[i % products.length];
  const cat = categories[i % categories.length];
  const sku = `00${String(10000 + i)}`;
  const price = (19.99 + (i % 500) * 1.5).toFixed(2);
  const qty = (i % 10) + 1;
  
  // Mix in corrupted quotes, mojibake, or multiline descriptions every few rows
  let notes = `Standard delivery to ${fName}'s address.`;
  if (i % 5 === 0) {
    notes = `<p>Customer requested "White-Glove" delivery with 24" clearance.</p>`;
  } else if (i % 7 === 0) {
    notes = `Account ledger balance â‚¬${price}. Paid via CrÃ©dit Agricole.`;
  } else if (i % 11 === 0) {
    notes = `Line 1: Special "VIP" discount applied.\nLine 2: Verified by Manager "Bob".`;
  }

  // Corrupted quote in product title without outer quotes or with inch marks
  let formattedProd = prod;
  if (i % 4 === 0) {
    formattedProd = `"${prod}"`; // standard quoted
  } else if (i % 3 === 0) {
    formattedProd = `<p>Featuring ${prod} with "Ultra-Durable" casing.</p>`;
  }

  const row = `${i},"${fullName}",${email},${phone},${card},"${formattedProd}","${cat}",${sku},${price},${qty},"${notes}"`;
  rows.push(row);

  // Add occasional blank or duplicate row
  if (i === 150 || i === 450) {
    rows.push('   '); // blank row
  }
  if (i === 200 || i === 600) {
    rows.push(row); // duplicate row
  }
}

const outputPath = path.join(__dirname, '../test_data/stress_test_1000_rows.csv');
fs.writeFileSync(outputPath, rows.join('\r\n'), 'utf8');
console.log(`Generated 1,000+ row stress test dataset: ${outputPath} (${rows.length} lines total).`);
