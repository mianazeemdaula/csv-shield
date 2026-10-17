const fs = require('fs');
const path = require('path');
const CSVSanitizer = require('../engine');

console.log('🧪 Starting Automated Tests for CSVSanitizer Engine...\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// Test 1: Delimiter Detection
const sampleComma = 'id,name,role\n1,john,admin\n2,mary,dev';
const sampleSemicolon = 'id;name;price\n1;drill;20\n2;hammer;15';
const sampleTab = 'id\tproduct\tqty\n10\tapples\t5\n11\toranges\t8';

assert(CSVSanitizer.detectDelimiter(sampleComma) === ',', 'Detects comma delimiter');
assert(CSVSanitizer.detectDelimiter(sampleSemicolon) === ';', 'Detects semicolon delimiter');
assert(CSVSanitizer.detectDelimiter(sampleTab) === '\t', 'Detects tab delimiter');

// Test 2: Unescaped Quotes Repair
const brokenQuote = '2,Bob "The Builder" Smith,bob@test.com,"Purchased "deluxe" item",50';
const repaired = CSVSanitizer.repairUnescapedQuotes(brokenQuote, ',');
assert(repaired.includes('""The Builder""') || repaired.includes('""deluxe""'), 'Correctly doubles internal quotes for RFC 4180');

// Test 3: Full Process on Corrupted Sample File
const samplePath = path.join(__dirname, '../test_data/corrupted_sample.csv');
const rawContent = fs.readFileSync(samplePath, 'utf8');

const result = CSVSanitizer.process(rawContent, {
  delimiter: 'auto',
  fixQuotes: true,
  trimWhitespace: true,
  deduplicate: true,
  removeEmptyRows: true,
  maskEmail: true,
  maskPhone: true,
  maskCreditCard: true
});

assert(result.headers.length === 7, `Correct headers count (got ${result.headers.length}, expected 7)`);
assert(result.stats.repairedRows > 0, `Repaired corrupted quote rows (repaired: ${result.stats.repairedRows})`);
assert(result.stats.duplicatesRemoved === 1, `Removed duplicate row (removed: ${result.stats.duplicatesRemoved})`);
assert(result.stats.emptyRowsRemoved >= 1, `Filtered blank row (filtered: ${result.stats.emptyRowsRemoved})`);
assert(result.stats.piiMaskedCount > 0, `Masked sensitive PII tokens (masked: ${result.stats.piiMaskedCount})`);

// Check that masked rows contain masked patterns
const allDataString = JSON.stringify(result.rows);
assert(allDataString.includes('***@'), 'Emails are masked');
assert(allDataString.includes('***-'), 'Phone numbers are masked');
assert(allDataString.includes('****-****-****-'), 'Credit card numbers are masked');

// Test 4: Exporters
const csvOut = CSVSanitizer.toCSV(result.headers, result.rows);
assert(csvOut.includes('id,customer_name,email'), 'Exports valid clean CSV');

const jsonOut = CSVSanitizer.toJSON(result.headers, result.rows);
const parsedJSON = JSON.parse(jsonOut);
assert(Array.isArray(parsedJSON) && parsedJSON.length === result.rows.length, 'Exports valid JSON array');

const mdOut = CSVSanitizer.toMarkdown(result.headers, result.rows);
assert(mdOut.includes('| id | customer_name |') && mdOut.includes('| --- |'), 'Exports valid Markdown table');

const sqlOut = CSVSanitizer.toSQL('customers', result.headers, result.rows);
assert(sqlOut.includes('INSERT INTO customers') && sqlOut.includes('VALUES'), 'Exports valid SQL statements');
assert(sqlOut.includes("'0014'") || sqlOut.includes("'07030'"), 'SQL Exporter retains leading zeros as quoted strings');

// Test 4b: Duplicate headers in JSON & Pipe escaping in Markdown
const dupJSON = JSON.parse(CSVSanitizer.toJSON(['date', 'amount', 'date'], [['2026-01-01', '100', '2026-01-02']]));
assert(dupJSON[0].date === '2026-01-01' && dupJSON[0].date_1 === '2026-01-02', 'JSON Exporter resolves duplicate headers without data loss');

const pipeMD = CSVSanitizer.toMarkdown(['Col1', 'Col2'], [['A | B', 'Normal']]);
assert(pipeMD.includes('A \\| B'), 'Markdown Exporter escapes literal pipes in cell contents');

// Test 5 (v2.0): Mojibake Repair
const corruptedMojibake = 'id,product,desc\n1,CafÃ©,Itâ€™s Bobâ€œs tool';
const mojiResult = CSVSanitizer.process(corruptedMojibake, { fixMojibake: true });
assert(mojiResult.rows[0][1] === 'Café', `Repaired accent mojibake (got: ${mojiResult.rows[0][1]})`);
assert(mojiResult.rows[0][2].includes("It's"), `Repaired apostrophe mojibake (got: ${mojiResult.rows[0][2]})`);
assert(mojiResult.stats.mojibakeFixedCount >= 2, `Tracked mojibake repair count (${mojiResult.stats.mojibakeFixedCount})`);

// Test 6 (v2.0): Excel UTF-8 BOM Export
const bomCSV = CSVSanitizer.toCSV(['col1'], [['value']], ',', true);
assert(bomCSV.charCodeAt(0) === 0xFEFF, 'Exports CSV with UTF-8 BOM mark');

// Test 7 (v2.0): Leading Zero Preservation
const zeroData = 'code,zip\n0014,07030';
const zeroResult = CSVSanitizer.process(zeroData, { preserveLeadingZeros: true });
assert(zeroResult.stats.zerosPreservedCount === 2, `Tracked leading zero tokens (${zeroResult.stats.zerosPreservedCount})`);
const zeroCSV = CSVSanitizer.toCSV(zeroResult.headers, zeroResult.rows, ',', false, true);
assert(zeroCSV.includes('="0014"') && zeroCSV.includes('="07030"'), 'Formats leading zeroes as Excel text formula');

// Test 8 (v2.0): Cell Diffing Tracking
assert(typeof result.stats.cellModifications === 'object', 'Outputs cellModifications map');
assert(Object.keys(result.stats.cellModifications).length > 0, 'Cell modifications correctly tracked for visual diff');

// Test 9: Real-World Shopify Products Catalog Benchmark
const shopifyPath = path.join(__dirname, '../test_data/shopify_products_corrupted.csv');
if (fs.existsSync(shopifyPath)) {
  const shopifyRaw = fs.readFileSync(shopifyPath, 'utf8');
  const shopifyRes = CSVSanitizer.process(shopifyRaw, {
    fixQuotes: true,
    preserveLeadingZeros: true,
    fixMojibake: true
  });
  assert(shopifyRes.headers.length === 14, `Shopify: headers count matches 14 (got ${shopifyRes.headers.length})`);
  assert(shopifyRes.rows.length === 5, `Shopify: exactly 5 product records parsed (got ${shopifyRes.rows.length})`);
  assert(shopifyRes.stats.zerosPreservedCount >= 4, `Shopify: SKU leading zeros tracked (${shopifyRes.stats.zerosPreservedCount})`);
}

// Test 10: Real-World Salesforce CRM Leads Benchmark
const sfPath = path.join(__dirname, '../test_data/salesforce_crm_corrupted.csv');
if (fs.existsSync(sfPath)) {
  const sfRaw = fs.readFileSync(sfPath, 'utf8');
  const sfRes = CSVSanitizer.process(sfRaw, {
    fixQuotes: true,
    maskEmail: true,
    maskPhone: true,
    maskCreditCard: true,
    fixMojibake: true
  });
  assert(sfRes.headers.length === 10, `Salesforce: headers count matches 10 (got ${sfRes.headers.length})`);
  assert(sfRes.rows.length === 5, `Salesforce: exactly 5 CRM leads parsed (got ${sfRes.rows.length})`);
  const sfString = JSON.stringify(sfRes.rows);
  assert(sfString.includes('****-****-****-'), 'Salesforce: Credit card token sanitized');
  assert(sfString.includes('***@'), 'Salesforce: Lead emails masked');
}

// Test 11: Real-World Financial Audit Mojibake Benchmark
const finPath = path.join(__dirname, '../test_data/financial_audit_mojibake.csv');
if (fs.existsSync(finPath)) {
  const finRaw = fs.readFileSync(finPath, 'utf8');
  const finRes = CSVSanitizer.process(finRaw, {
    fixQuotes: true,
    fixMojibake: true,
    preserveLeadingZeros: true
  });
  assert(finRes.rows.length === 5, `Finance: exactly 5 ledger rows parsed (got ${finRes.rows.length})`);
  const finString = JSON.stringify(finRes.rows);
  assert(finString.includes('Café du Monde') && finString.includes('Müller & Schmidt') && finString.includes('Société Générale') && finString.includes('José Silva'), 'Finance: All European mojibake names healed to Unicode');
  assert(finRes.stats.zerosPreservedCount >= 5, `Finance: Bank account leading zeros preserved (${finRes.stats.zerosPreservedCount})`);
}

// Test 12: Real-World Multiline & Complex Quoting Edge Cases
const edgeCases = [
  {
    name: 'BOM Header Strip',
    input: '\uFEFFid,name,role\n1,Alice,Admin\n2,Bob,User',
    check: (res) => res.headers[0] === 'id' && res.rows.length === 2
  },
  {
    name: 'Multiline quoted field with newlines inside quotes',
    input: 'id,title,description\n1,"Item 1","Line 1\nLine 2\nLine 3"\n2,"Item 2","Single line"',
    check: (res) => res.rows.length === 2 && res.rows[0][2] === 'Line 1\nLine 2\nLine 3'
  },
  {
    name: 'Multiline quoted field with embedded unescaped quotes inside',
    input: 'id,description,status\n101,"Line 1 with 24" monitor\nLine 2 with "Pro" features",active\n102,"Normal",done',
    check: (res) => res.rows.length === 2 && res.rows[0][1].includes('24" monitor')
  },
  {
    name: 'Backslash-escaped quotes (MySQL/JSON export: \\")',
    input: 'id,payload\n1,"{\\"name\\": \\"Widget\\", \\"size\\": \\"Large\\"}"\n2,"{\\"name\\": \\"Gadget\\"}"',
    check: (res) => res.rows.length === 2 && res.rows[0][1].includes('"name": "Widget"')
  },
  {
    name: 'Semicolon delimiter with commas inside text',
    input: 'ID;Full Name;Location\n1;Doe, John;New York, NY\n2;Smith, Jane;London, UK',
    check: (res) => res.stats.delimiter === ';' && res.rows[0][1] === 'Doe, John'
  },
  {
    name: 'Tab delimited with quotes and spaces',
    input: 'sku\tname\tprice\n00123\t"Widget 12\\""\t19.99\n00456\tGadget\t29.99',
    check: (res) => res.stats.delimiter === '\t' && res.rows.length === 2 && res.rows[0][1] === 'Widget 12"'
  },
  {
    name: 'Trailing empty lines and Windows CRLF',
    input: "id,val\r\n1,one\r\n2,two\r\n\r\n\r\n",
    check: (res) => res.rows.length === 2
  },
  {
    name: 'Leading and trailing spaces around quoted fields',
    input: 'id, title , price \n 1 , " 24\\" Gaming Monitor " , 299.99 ',
    check: (res) => res.headers[1] === 'title' && res.rows[0][0] === '1'
  }
];

for (const ec of edgeCases) {
  const ecRes = CSVSanitizer.process(ec.input, { fixQuotes: true, trimWhitespace: true, removeEmptyRows: true });
  assert(ec.check(ecRes), `Edge Case: ${ec.name}`);
}

// Test 13: 1,000-Row Real-World Stress Test Dataset
const stressPath = path.join(__dirname, '../test_data/stress_test_1000_rows.csv');
if (fs.existsSync(stressPath)) {
  const stressRaw = fs.readFileSync(stressPath, 'utf8');
  const stressRes = CSVSanitizer.process(stressRaw, {
    delimiter: 'auto',
    fixQuotes: true,
    fixMojibake: true,
    trimWhitespace: true,
    deduplicate: true,
    removeEmptyRows: true,
    preserveLeadingZeros: true,
    maskEmail: true,
    maskPhone: true,
    maskCreditCard: true
  });
  assert(stressRes.rows.length === 1000, `Stress: exactly 1000 clean data rows parsed (got ${stressRes.rows.length})`);
  assert(stressRes.stats.duplicatesRemoved === 2, `Stress: exactly 2 duplicate rows removed (got ${stressRes.stats.duplicatesRemoved})`);
  assert(stressRes.stats.emptyRowsRemoved === 2, `Stress: exactly 2 empty rows filtered (got ${stressRes.stats.emptyRowsRemoved})`);
  assert(stressRes.stats.piiMaskedCount >= 3000, `Stress: 3,000+ PII tokens masked (got ${stressRes.stats.piiMaskedCount})`);
  assert(stressRes.stats.zerosPreservedCount >= 1000, `Stress: 1,000+ leading zeros preserved (got ${stressRes.stats.zerosPreservedCount})`);
}

console.log(`\n==========================================`);
console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
console.log(`==========================================\n`);

if (failed > 0) {
  process.exit(1);
}
