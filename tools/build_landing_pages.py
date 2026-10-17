"""Builds the topic landing pages and the hub page.

Usage: python tools/build_landing_pages.py
Every page uses the real engine (engine.js) through landing.js, so a fix shown on a landing page is the
same fix the main tool makes. No external scripts or fonts.
"""
import html
import json
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
BASE = 'https://irisresearcher.github.io/csv-sanitizer/'  # change if the site moves
UPDATED = '2026-10-17'

PAGES = [
    dict(
        slug='fix-shopify-csv-quotes.html',
        title='Fix quotes in a Shopify product CSV before importing it',
        h1='Shopify product CSV broken by quotes in titles',
        desc='A product title like 24" Monitor or an HTML description with quotes can shift a Shopify CSV into the wrong columns. Repair it in your browser without uploading the file.',
        preset={'fixQuotes': True, 'fixMojibake': True},
        sample='Handle,Title,Body (HTML),Variant Price\n24-monitor,24" Gaming Monitor,"<p>144Hz "Fast IPS" panel</p>",299.99\nchair,Ergonomic "Executive" Chair,"<p>Supports 300 lbs</p>",199.50\n',
        body='''
<p>Product exports and hand-made product sheets often contain inch marks and quotes: <code>24" Monitor</code>, <code>1/2" drill bit</code>, or HTML like <code>&lt;p&gt;"Fast IPS" panel&lt;/p&gt;</code>. In a CSV file a double quote has a special meaning. If a quote inside a field is not written as two quotes (<code>""</code>), most importers read it as the start or end of a field, and the rest of the row slides into the wrong columns.</p>
<h2>What it looks like</h2>
<p>The title ends up in the description column, prices show up as text, or the import reports the wrong number of columns on some rows. Often only the rows with a quote in them are affected, which makes it easy to miss.</p>
<h2>Fixing it by hand</h2>
<p>For a few rows you can open the file in a text editor and double every quote that sits inside a field: <code>24"" Gaming Monitor</code>, then wrap that field in quotes. For hundreds of rows that is slow and easy to get wrong, which is what the tool below is for.</p>
<h2>What the tool does</h2>
<p>It reads the file, works out which quotes are field boundaries and which are part of the text, doubles the ones that are text, and gives you a clean CSV back. Changed cells are counted so you can check them. It does not change prices, SKUs or anything without a quote in it.</p>
<p>Check the result in a spreadsheet before importing. Quote repair is a best guess: a field that is ambiguous on its own (for example a quote right before a comma) may need a manual look.</p>
'''),
    dict(
        slug='fix-unescaped-quotes-rfc4180.html',
        title='Fix unescaped quotes in a CSV file (RFC 4180)',
        h1='Fix unescaped double quotes in a CSV file',
        desc='CSV files break when a quote inside a field is not doubled. Here is why, how to fix it by hand, and a tool that repairs it in your browser.',
        preset={'fixQuotes': True},
        sample='id,name,notes\n1,"Bob "The Builder" Smith",ok\n2,Alice,"said ""hello"" twice"\n3,Sam,12" pipe\n',
        body='''
<p>RFC 4180, the closest thing CSV has to a standard, says a field that contains a double quote must be wrapped in quotes, and each quote inside it must be doubled. So <code>He said "hi"</code> is written <code>"He said ""hi"""</code>. Plenty of exporters and scripts get this wrong.</p>
<h2>Why one quote breaks the whole row</h2>
<p>A parser that meets <code>"Bob "The Builder" Smith"</code> sees a quoted field that ends after <code>Bob </code>, then junk it does not expect. Some parsers stop with an error, some carry on and push the remaining text into the next columns, and some treat everything up to the next quote, possibly many rows later, as one field.</p>
<h2>Fixing it by hand</h2>
<ul>
<li>Find the quotes that sit inside a field rather than at its edges, and double them.</li>
<li>Make sure any field that now contains a quote, a comma or a line break is wrapped in quotes.</li>
<li>In code, read the file with a lenient parser and write it back with a proper CSV writer (Python's <code>csv</code> module with <code>quoting=csv.QUOTE_MINIMAL</code> does the writing side correctly).</li>
</ul>
<h2>What the tool does</h2>
<p>It looks at each quote and decides from its position whether it opens or closes a field or is part of the text, doubles the text ones, and re-writes the file with standard quoting. Valid files come back unchanged, including correctly doubled quotes and quoted fields with commas or line breaks inside. Ambiguous cases are a guess, so look over the cells it reports as repaired.</p>
'''),
    dict(
        slug='fix-excel-mojibake-utf8.html',
        title='Fix Ã© and â€™ in a CSV file (UTF-8 read as Windows-1252)',
        h1='Fix garbled characters like Ã© and â€™ in a CSV',
        desc='When a UTF-8 file is read as Windows-1252, é becomes Ã© and an apostrophe becomes â€™. Repair it in your browser without uploading the file.',
        preset={'fixMojibake': True, 'fixQuotes': False},
        sample='name,note\nCafÃ©,Itâ€™s fresh\nSociÃ©tÃ© GÃ©nÃ©rale,Price â‚¬20\nSÃO PAULO,already correct\n',
        body='''
<p>Characters like <code>Ã©</code>, <code>Ã¼</code> or <code>â€™</code> in a file are almost always the same accident: the text was saved as UTF-8 and then opened as if it were Windows-1252 (or Latin-1). Each accented letter is two or three bytes in UTF-8, and Windows-1252 shows each byte as its own character. This is often called mojibake.</p>
<h2>Common examples</h2>
<ul>
<li><code>é</code> shows as <code>Ã©</code>, <code>ü</code> as <code>Ã¼</code>, <code>ñ</code> as <code>Ã±</code></li>
<li>a curly apostrophe <code>’</code> shows as <code>â€™</code>, and <code>“ ”</code> as <code>â€œ â€</code></li>
<li><code>€</code> shows as <code>â‚¬</code>, <code>£</code> as <code>Â£</code></li>
</ul>
<h2>Stopping it in Excel</h2>
<p>If the file itself is fine and only Excel shows it wrong, import it instead of double-clicking it: Data, From Text/CSV, and choose UTF-8 as the file origin. Saving the file with a UTF-8 byte order mark (BOM) at the start also makes Excel read it as UTF-8. The tool below can add one when you download.</p>
<h2>When the garbage is already in the file</h2>
<p>If someone saved the file after it was misread, the broken characters are now real text and need converting back. The tool finds runs of characters that look like misread UTF-8, turns them back into their original bytes and decodes those properly. If a run does not decode as valid UTF-8, it is left alone, so correct text such as <code>SÃO PAULO</code> or <code>AÑO</code> is not touched. The sample includes one of those.</p>
'''),
    dict(
        slug='salesforce-csv-loader-quote-fix.html',
        title='Clean a CSV before loading it into Salesforce or a CRM',
        h1='Clean a CSV before a Salesforce or CRM import',
        desc='Unescaped quotes, garbled characters and uneven columns are common reasons a CRM import rejects rows. Repair the file in your browser first, without uploading it.',
        preset={'fixQuotes': True, 'fixMojibake': True, 'normalizeColumns': True},
        sample='Company,Contact,Email,Notes\nAcme Ltd,"Jane "JJ" Doe",jane@acme.example,Met at expo\nMÃ¼ller GmbH,Hans,hans@mueller.example,"Wants a "trial" licence"\nShort Row,Only two\n',
        body='''
<p>CRM import tools, Salesforce's Data Loader and Data Import Wizard among them, expect a well-formed CSV: one header row, the same number of columns on every row, and quotes written the standard way. Exports from spreadsheets, older systems or quick scripts often break one of those rules.</p>
<h2>Things that commonly go wrong</h2>
<ul>
<li>A note or company name with an unescaped quote in it shifts the rest of the row.</li>
<li>Accented names arrive garbled (<code>MÃ¼ller</code> instead of <code>Müller</code>) because the file was saved or opened with the wrong encoding.</li>
<li>Some rows have fewer columns than the header.</li>
</ul>
<h2>What the tool does</h2>
<p>It repairs the quotes, converts misread UTF-8 back to the right characters, pads short rows to the header's column count, and gives you a clean CSV. It does not know your CRM's field rules (required fields, picklist values, date formats), so those still need checking against the import template.</p>
<p>Because the file stays in your browser, you can clean customer data without sending it to another service first.</p>
'''),
    dict(
        slug='offline-pii-masker-csv.html',
        title='Mask emails, phone numbers and card numbers in a CSV',
        h1='Mask emails, phone numbers and card numbers in a CSV',
        desc='Hide personal details in a CSV before sharing it with a developer, a contractor or an AI tool. Masking runs in your browser; the file is not uploaded.',
        preset={'maskEmail': True, 'maskPhone': True, 'maskCreditCard': True, 'fixQuotes': True},
        sample='name,email,phone,card,order_no,isbn\nAlice,alice.j@example.com,+44 20 7946 0958,4111 1111 1111 1111,100234567,9780306406157\nBob,bob@example.org,(555) 234-5678,5500-0000-0000-0004,100234568,9780140449136\n',
        body='''
<p>Before a customer list goes to a developer, a test environment or a chat assistant, it is safer to hide the parts that identify people. This tool masks three kinds of value and keeps enough to stay useful: the first letter and domain of an email, and the last four digits of phone and card numbers.</p>
<h2>What gets masked</h2>
<ul>
<li><strong>Emails:</strong> <code>alice.j@example.com</code> becomes <code>a***@example.com</code>.</li>
<li><strong>Phone numbers:</strong> numbers written like phone numbers, with a <code>+</code>, brackets, or groups separated by spaces, dots or dashes. <code>+44 20 7946 0958</code> becomes <code>+** ** **** 0958</code>.</li>
<li><strong>Card numbers:</strong> 13 to 19 digits that pass the card checksum, or anything written in four groups of four. The last four digits are kept.</li>
</ul>
<h2>What is deliberately left alone</h2>
<p>Bare runs of digits such as order numbers, account numbers and ISBN barcodes, and dates. The sample includes an order number and an ISBN so you can see them come through unchanged.</p>
<h2>Limits</h2>
<p>Masking is pattern matching, not a guarantee. It does not find names, addresses, national ID numbers or free text that mentions a person. Look through the output before you share it, and remove whole columns you do not need.</p>
'''),
    dict(
        slug='offline-gdpr-csv-sanitizer.html',
        title='Clean a confidential CSV without uploading it',
        h1='Clean a confidential CSV without uploading it anywhere',
        desc='Repair quotes, fix garbled characters and mask personal details in a CSV entirely in your browser. The file is not sent to a server.',
        preset={'fixQuotes': True, 'fixMojibake': True, 'maskEmail': True},
        sample='customer,email,note\nJane Doe,jane@example.com,"Asked about "express" delivery"\nJosÃ© PÃ©rez,jose@example.com,VIP\n',
        body='''
<p>Many free CSV cleaners on the web upload your file to their server to process it. For a customer list, payroll export or anything under an NDA, that may not be allowed. This page does the work with JavaScript in your browser instead.</p>
<h2>How you can check that</h2>
<ul>
<li>Open your browser's developer tools (F12), go to the Network tab, then load a file and clean it. You will see the page's own files load once and nothing sent when you process your file.</li>
<li>Or load the page, switch off your internet connection, and use it offline.</li>
<li>The page has no analytics, tracking or third-party scripts.</li>
</ul>
<h2>A word on rules like GDPR</h2>
<p>Not uploading the file removes one risk, but it does not make a process compliant by itself. Whether you may handle the data at all, and what you may do with the cleaned file, is for you or your organisation to decide. This tool is not a legal or compliance certification.</p>
<h2>What it can do</h2>
<p>Repair broken quotes, fix garbled accented characters, trim spaces, drop blank rows, pad short rows, optionally remove exact duplicate rows, and mask emails, phone numbers and card numbers. Export as CSV, JSON, Markdown or SQL from the <a href="./">main tool</a>.</p>
'''),
]


def page(p):
    e = html.escape
    canonical = BASE + p['slug']
    others = ''.join('<li><a href="%s">%s</a></li>' % (q['slug'], e(q['h1'])) for q in PAGES if q is not p)
    ld = {
        "@context": "https://schema.org", "@type": "WebPage", "name": p['title'], "url": canonical,
        "description": p['desc'], "dateModified": UPDATED, "isPartOf": {"@type": "WebSite", "name": "CSV Shield", "url": BASE}
    }
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(p['title'])} | CSV Shield</title>
<meta name="description" content="{e(p['desc'])}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{e(p['title'])}">
<meta property="og:description" content="{e(p['desc'])}">
<meta property="og:image" content="{BASE}og-image.png">
<link rel="stylesheet" href="landing.css">
<script type="application/ld+json">{json.dumps(ld)}</script>
</head>
<body>
<header class="lp-top"><div class="lp-wrap lp-bar"><a class="lp-brand" href="./">CSV Shield</a><a href="./">Open the full tool</a></div></header>
<main class="lp-wrap">
<h1>{e(p['h1'])}</h1>
<p class="lp-lead">{e(p['desc'])}</p>
<section class="lp-tool" data-preset='{e(json.dumps(p['preset']))}'>
  <div class="lp-row">
    <label class="lp-file">Choose a CSV file <input type="file" accept=".csv,.tsv,.txt,text/csv" class="lp-input-file"></label>
    <button type="button" class="lp-btn lp-sample">Use the example</button>
  </div>
  <textarea class="lp-text" rows="7" spellcheck="false" placeholder="...or paste CSV text here"></textarea>
  <textarea class="lp-sample-data" hidden>{e(p['sample'])}</textarea>
  <div class="lp-row">
    <button type="button" class="lp-btn lp-primary lp-run">Clean it</button>
    <label class="lp-check"><input type="checkbox" class="lp-bom" checked> Add UTF-8 BOM for Excel</label>
    <button type="button" class="lp-btn lp-download" hidden>Download clean CSV</button>
  </div>
  <p class="lp-stats" aria-live="polite"></p>
  <div class="lp-preview"></div>
</section>
{p['body']}
<h2>More fixes</h2>
<ul>{others}<li><a href="./">The full tool: all options, JSON/Markdown/SQL export</a></li></ul>
</main>
<footer class="lp-foot"><div class="lp-wrap">
<p>CSV Shield runs in your browser. Files are not uploaded. Open source, MIT licence.</p>
<p>Page updated {UPDATED}.</p>
</div></footer>
<script src="engine.js"></script>
<script src="landing.js"></script>
</body>
</html>
'''


def hub():
    e = html.escape
    items = ''.join('<li><a href="%s"><strong>%s</strong></a><br>%s</li>' % (p['slug'], e(p['h1']), e(p['desc'])) for p in PAGES)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CSV problems and how to fix them | CSV Shield</title>
<meta name="description" content="Guides for common CSV problems: unescaped quotes, garbled characters, CRM import errors and masking personal data, each with a tool that runs in your browser.">
<link rel="canonical" href="{BASE}seo-hub.html">
<link rel="stylesheet" href="landing.css">
</head>
<body>
<header class="lp-top"><div class="lp-wrap lp-bar"><a class="lp-brand" href="./">CSV Shield</a><a href="./">Open the full tool</a></div></header>
<main class="lp-wrap">
<h1>CSV problems and how to fix them</h1>
<p class="lp-lead">Each guide explains one common problem, how to fix it by hand, and has a working tool that runs in your browser.</p>
<ul class="lp-hub">{items}</ul>
</main>
<footer class="lp-foot"><div class="lp-wrap"><p>CSV Shield runs in your browser. Files are not uploaded.</p></div></footer>
</body>
</html>
'''


def sitemap():
    urls = [BASE, BASE + 'seo-hub.html'] + [BASE + p['slug'] for p in PAGES]
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
        f'  <url><loc>{u}</loc><lastmod>{UPDATED}</lastmod></url>\n' for u in urls) + '</urlset>\n'


for p in PAGES:
    open(os.path.join(ROOT, p['slug']), 'w', encoding='utf-8', newline='\n').write(page(p))
open(os.path.join(ROOT, 'seo-hub.html'), 'w', encoding='utf-8', newline='\n').write(hub())
open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8', newline='\n').write(sitemap())
print('built', len(PAGES), 'landing pages, hub and sitemap')
