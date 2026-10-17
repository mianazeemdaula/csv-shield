# CSV Shield — Client-Side CSV Sanitizer & Privacy Formatter

> **100% In-Browser, Air-Gapped CSV Repair, Deduplication, and PII Masking.**  
> Zero server uploads. Zero external telemetry. Works completely offline.

---

## ⚡ What Problem It Solves

Operations leads, accountants, Shopify/e-commerce store owners, and freelance data analysts deal daily with corrupted spreadsheet exports:
1. **Broken Quotes & Displaced Rows**: Unescaped quotation marks in product descriptions or notes (e.g. `2,"Bob "The Builder" Smith",...`) corrupt RFC 4180 parsing and crash Excel.
2. **Privacy Violations**: Company data policies and GDPR forbid uploading customer lists or financial ledgers to third-party cloud AI tools.
3. **Mismatched Delimiters & Empty Lines**: Exports mixing commas, semicolons, and tabs lead to manual hours in text editors.

**CSV Shield fixes all of this in under 50 milliseconds directly in the user's browser.**

---

## ✨ Core Features

- **Automatic Delimiter Detection**: Sniffs out `,`, `;`, `\t`, and `|` with zero configuration.
- **RFC 4180 Quote Auto-Repair**: Heuristically detects unescaped interior quotes and doubles them (`""`) to maintain valid tabular structure.
- **1-Click PII Masking**:
  - Emails: `alice.j@enterprise.com` → `a***@enterprise.com`
  - Phones: `(555) 234-5678` → `(***) ***-5678`
  - Credit Cards: `4532-8901-2345-6789` → `****-****-****-6789`
- **Deduplication & Normalization**: Strips exact duplicates and pads missing columns to match header definitions.
- **Multi-Format Export**: One-click download as **Clean CSV**, **JSON array**, **Markdown table**, or **SQL `INSERT` statements**.
- **Real-Time Network Activity Inspector**: Proves zero bytes leave the browser.
- **Built-in Monetization Hook**: High-converting Pro modal offering a $15 one-time lifetime license.

---

## 🚀 How to Run Locally

### Option 1: Direct File Open (Zero Install)
Double-click `index.html` in your file explorer, or open it in Chrome / Edge / Firefox.

### Option 2: Local HTTP Server
Using Python (pre-installed):
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

---

## 🧪 Automated Testing

An automated regression test suite is included in `tests/run_tests.js`.

To run the tests:
```bash
node tests/run_tests.js
```

All 16 assertions test:
- Delimiter detection (comma, semicolon, tab).
- Quote repair heuristics.
- Deduplication and blank row stripping.
- PII masking precision.
- Valid CSV, JSON, Markdown, and SQL generation.

---

## 🌐 How to Put It Online for Free

### Method 1: GitHub Pages (Recommended — 2 Minutes)
1. Create a free repository on GitHub: `csv-shield`.
2. Push this folder to `main`:
   ```bash
   git remote add origin https://github.com/your-username/csv-shield.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → Build and deployment → Source → Deploy from branch (`main` / root)**.
4. Your tool is live at `https://your-username.github.io/csv-shield/` at $0 cost forever.

### Method 2: Cloudflare Pages / Vercel (Drag-and-Drop)
1. Go to [Cloudflare Pages](https://pages.cloudflare.com) or [Vercel](https://vercel.com).
2. Drag and drop this folder directly into the web dashboard.
3. Instant deployment with free global CDN and SSL.

---

## 💰 Monetization Setup (Lemon Squeezy)

Lemon Squeezy officially supports direct bank wire payouts to Pakistani bank accounts (IBAN/SWIFT) and Payoneer.

1. Create a free account at [Lemon Squeezy](https://www.lemonsqueezy.com).
2. Create a product: **CSV Shield Pro** at **$15.00 (One-time)**.
3. Copy your checkout URL.
4. Replace the placeholder in `index.html`:
   ```html
   <a id="btn-checkout-link" href="https://yourstore.lemonsqueezy.com/checkout/buy/YOUR_PRODUCT_ID" ...>
   ```

---

## 🎯 Next 3 Steps to Get Your First User

1. **Reddit r/webdev & r/excel "Show & Tell"**: Post a 10-second GIF demonstrating a corrupted Shopify export being repaired with one click, highlighting: *"Built an open-source, 100% client-side CSV fixer because my company banned uploading client data to cloud tools."*
2. **Product Hunt Launch**: Submit as a free developer tool with the taglines: *"100% In-Browser CSV Sanitizer & Formatter • Zero Cloud Uploads"*.
3. **Targeted Outreach to Shopify / E-Commerce Discord & Facebook Groups**: Offer the free tool to store owners struggling with CSV import errors when migrating between platforms.

---

## 💵 How to Get Your First Sale

1. Offer the web tool 100% free for single files under 10MB.
2. In the Pro modal, offer the **Batch Multi-File Processing** + **Custom Regex Rules** for a $15 one-time fee.
3. Reach out directly to 5 virtual assistants or data entry freelancers on Upwork/LinkedIn who post about "cleaning client CSVs" and give them a 50% discount code.
