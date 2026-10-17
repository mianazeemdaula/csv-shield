---
title: Why Excel Breaks Client CSVs (And How I Fixed It With 100% Client-Side JS)
published: true
tags: javascript, webdev, opensource, productivity
cover_image: https://raw.githubusercontent.com/irisresearcher/csv-sanitizer/main/og-image.png
canonical_url: https://irisresearcher.github.io/csv-sanitizer/
---

# Why Excel Breaks Client CSVs (And How I Fixed It With 100% Client-Side JS)

If you have ever imported a CSV export from Shopify, WooCommerce, or Salesforce into Excel and watched half your columns slide 3 rows down into oblivion, you know the pain:

> **The Unescaped Quote Nightmare.** A product description contains `24" Smart Monitor`, the CSV exporter fails to double-quote it (`""`), and Excel treats that quote as the start of a multi-line string. Every row after that is ruined.

To make matters worse, most online CSV cleaners require you to upload your files to their remote servers. If you are handling customer PII, corporate accounting spreadsheets, or client databases under NDA, **uploading client data to random web tools violates GDPR, HIPAA, and company policy.**

I needed a tool that could auto-repair broken CSVs instantly—with **absolute guarantee that zero bytes ever touch an external server.**

So I built **CSV Shield**.

* **Live Web App:** [https://irisresearcher.github.io/csv-sanitizer/](https://irisresearcher.github.io/csv-sanitizer/)
* **GitHub Repository:** [https://github.com/irisresearcher/csv-sanitizer](https://github.com/irisresearcher/csv-sanitizer)

---

## The 4 CSV Nightmares & How We Healed Them

### 1. The Mid-Field Unescaped Quote (RFC 4180)
Under RFC 4180, quotes inside a field MUST be escaped by doubling them (`"24"" Monitor"`). When exporters emit unescaped quotes mid-string, naive parsers fail.

We implemented a streaming state machine with lookahead heuristics:
```javascript
// Detect unbalanced quotes within an expected column boundary
function healUnescapedQuotes(rawLine, delimiter = ',') {
  let insideQuote = false;
  let healed = '';
  for (let i = 0; i < rawLine.length; i++) {
    const char = rawLine[i];
    if (char === '"') {
      const isNextQuote = rawLine[i + 1] === '"';
      const isBoundary = (i === 0 || rawLine[i - 1] === delimiter) || 
                         (i === rawLine.length - 1 || rawLine[i + 1] === delimiter);
      if (!insideQuote && !isBoundary) {
        healed += '""'; // Automatically escape rogue internal quote
        continue;
      }
      insideQuote = !insideQuote;
    }
    healed += char;
  }
  return healed;
}
```

### 2. UTF-8 BOM Corruption (Garbled Characters in Excel)
When Windows Excel opens UTF-8 CSVs without a Byte Order Mark (BOM), characters like `€`, `£`, or accented names appear as `Ã¢‚¬`.
CSV Shield automatically prepends the UTF-8 BOM (`\uFEFF`) on export so Excel opens accented text and currency symbols flawlessly without manual "Text Import Wizard" prompts.

### 3. PII Anonymization (Client-Side Masking)
Before sharing customer data with test environments or third-party contractors, you need to redact sensitive columns:
* **Email:** `j***@domain.com`
* **Phone Numbers:** `+1 (***) ***-1234`
* **Names:** Deterministic salt hashing or realistic pseudonym replacement.
All hashing runs in memory using Web Crypto API (`crypto.subtle.digest('SHA-256')`).

### 4. 100% Zero-Cloud Isolation (Web Workers)
CSV Shield runs parsing, sanitization, and conversions completely in dedicated browser Web Workers.
* No API calls
* No analytics tracking
* No telemetry
* Fully usable offline (Progressive Web App cacheable)

---

## Multi-Format Export
Once repaired and sanitized, you can export your data into:
1. **Clean RFC 4180 CSV** (Excel-safe BOM)
2. **Minified / Pretty JSON**
3. **GitHub Flavored Markdown Tables**
4. **SQL `INSERT INTO` Batches** (with automatic type inference for `VARCHAR`, `INT`, and `BOOLEAN`)

---

## Try It & Contribute

CSV Shield is completely free and open-source under the MIT license:
* 🌐 **Try it in your browser:** [https://irisresearcher.github.io/csv-sanitizer/](https://irisresearcher.github.io/csv-sanitizer/)
* ⭐ **Star / Fork on GitHub:** [https://github.com/irisresearcher/csv-sanitizer](https://github.com/irisresearcher/csv-sanitizer)

What is the weirdest or most painful CSV formatting edge case you have run into? Drop a comment below and let's add automated heuristics for it!
