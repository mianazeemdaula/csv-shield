/**
 * CSV Shield v2.0 - Interactive Application Controller
 * Zero external dependencies. 100% Client-Side.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tabFile = document.getElementById('tab-file');
  const tabPaste = document.getElementById('tab-paste');
  const viewFile = document.getElementById('view-file');
  const viewPaste = document.getElementById('view-paste');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const fileNameDisplay = document.getElementById('file-name-display');
  const pasteInput = document.getElementById('paste-input');

  const selectSamplePreset = document.getElementById('select-sample-preset');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnClear = document.getElementById('btn-clear');
  const btnSanitize = document.getElementById('btn-sanitize');

  // Options
  const selectDelimiter = document.getElementById('select-delimiter');
  const chkQuotes = document.getElementById('chk-quotes');
  const chkMojibake = document.getElementById('chk-mojibake');
  const chkZeros = document.getElementById('chk-zeros');
  const chkWhitespace = document.getElementById('chk-whitespace');
  const chkDedupe = document.getElementById('chk-dedupe');
  const chkEmpty = document.getElementById('chk-empty');
  const chkNormalize = document.getElementById('chk-normalize');
  const chkMaskEmail = document.getElementById('chk-mask-email');
  const chkMaskPhone = document.getElementById('chk-mask-phone');
  const chkMaskCard = document.getElementById('chk-mask-card');

  // Results Section
  const resultsSection = document.getElementById('results-section');
  const statInputRows = document.getElementById('stat-input-rows');
  const statOutputRows = document.getElementById('stat-output-rows');
  const statRepaired = document.getElementById('stat-repaired');
  const statMojibake = document.getElementById('stat-mojibake');
  const statZeros = document.getElementById('stat-zeros');
  const statDeduped = document.getElementById('stat-deduped');
  const statPii = document.getElementById('stat-pii');
  const statTime = document.getElementById('stat-time');

  // Table Preview
  const tableHead = document.getElementById('table-head');
  const tableBody = document.getElementById('table-body');
  const filterInput = document.getElementById('filter-input');
  const paginationInfo = document.getElementById('pagination-info');
  const selectPageSize = document.getElementById('select-page-size');
  const btnPagePrev = document.getElementById('btn-page-prev');
  const btnPageNext = document.getElementById('btn-page-next');
  const pageIndicator = document.getElementById('page-indicator');

  // Export Buttons
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportExcel = document.getElementById('btn-export-excel');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExportMd = document.getElementById('btn-export-md');
  const btnExportSql = document.getElementById('btn-export-sql');
  const btnCopy = document.getElementById('btn-copy');
  const copyBtnText = document.getElementById('copy-btn-text');

  // Modals
  const btnShowInspector = document.getElementById('btn-show-inspector');
  const inspectorModal = document.getElementById('inspector-modal');
  const btnCloseInspector = document.getElementById('btn-close-inspector');

  const btnProModal = document.getElementById('btn-pro-modal');
  const proModal = document.getElementById('pro-modal');
  const btnClosePro = document.getElementById('btn-close-pro');

  // Application State
  let rawText = '';
  let activeTab = 'file';
  let lastProcessedData = null;
  let activeFileName = 'sanitized_data';
  let currentPage = 1;
  let pageSize = 50;

  // Sample Corrupted Data with Quotes, Mojibake, Leading Zeros, Duplicates, and PII
  const SAMPLE_CORRUPTED_CSV = `id,customer_name,email,phone,notes,amount,transaction_date
0014,Alice Johnson,alice.j@enterprise.com,+1 (555) 234-5678,Standard quarterly subscription renewal,99.00,2026-01-15
0029,Bob "The Builder" Smith,bob.smith@construct.io,555-987-6543,"Ordered "heavy duty" drill bits for CafÃ© job; itâ€™s expedited",450.50,2026-01-16
0014,Alice Johnson,alice.j@enterprise.com,+1 (555) 234-5678,Standard quarterly subscription renewal,99.00,2026-01-15
07030,Charlie Davis,charlie.d@gmail.com,1-800-555-0199,"Requires urgent follow-up on invoice #892 - ZIP code 07030",120.00,2026-01-18

0082,Diana Prince,diana@themyscira.gov,+1-555-321-7654,"Urgent shipment: "Golden Lasso" accessories â€” card 4532-8901-2345-6789 on file",1500.00,2026-01-20
 0095 , Evan Wright , evan@wright.org , (555) 888-2233 , "Consulting session â€“ 2 hours" , 300.00 , 2026-01-22 `;

  const SAMPLE_SHOPIFY_CSV = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Grams,Variant Inventory Qty,Variant Price,Variant Compare At Price
gaming-monitor-24,24" Ultra-Fast 144Hz Gaming Monitor,"<p>Featuring a 24" Fast-IPS display with 1ms response time and "Zero-Lag" synchronization.</p>",ApexDisplays,Monitors,"Electronics, Gaming",true,Size,24-inch,008492,4500,35,299.99,349.99
ergonomic-desk-chair,Ergonomic "Executive" Mesh Chair,"<p>Designed for all-day comfort. Features "AirFlow" mesh and 3D adjustable armrests.</p>",ErgoPro,Chairs,"Office, Furniture",true,Color,Matte Black,001048,15000,12,199.50,249.00
artisan-coffee-maker,12-Cup "Barista Reserve" Drip Coffee Maker,"<p>Brew rich coffee with our patented "Thermal-Lock" carafe and 24-hr timer.</p>",CaféKitchen,Appliances,"Kitchen, Coffee",true,Finish,Brushed Stainless,070392,3200,50,89.95,119.95
heavy-duty-drill-bits,Titanium 1/2" & 1/4" Hex Shank Drill Bit Set,"<p>Includes 29 pieces with "Split-Point" tips for drilling through stainless steel.</p>",CraftPro,Tools,"Hardware, DIY",true,Set,29-Piece,000492,1800,120,45.00,59.99
organic-tea-selection,"Morning "Sunrise" Herbal Tea Variety Pack (60 Bags)","<p>100% USDA Organic herbs with notes of Chamomile & Hibiscus.</p>",HerbHaven,Groceries,"Organic, Beverage",true,Count,60 Bags,005820,400,200,18.50,22.00`;

  const SAMPLE_SALESFORCE_CSV = `Lead_ID,First_Name,Last_Name,Company,Email,Phone,Mailing_Address,Annual_Revenue,Lead_Status,Internal_Notes
00Q5g000001,Marcus,Aurelius,"Stoic Logistics, Inc.",marcus@stoiclogistics.com,+1 (415) 555-0143,"100 Market St, Suite 400, San Francisco, CA 94105",2500000,Qualified - Working,"CEO requested urgent POC: "Enterprise Fleet Automation" by end of Q1; billing card 4111-2222-3333-4444 on file"
00Q5g000002,Helena,"Troy" Vance,"Spartan Defense & Aerospace",helena.vance@spartandefense.org,+1-202-555-0188,"750 Pennsylvania Ave NW, Washington, DC 20006",18500000,Contacted,"Discussing multi-year DoD compliance contract. "Strict" offline data residency required."
00Q5g000003,Jean-Luc,Picard,"Starlight Exploration Ltd",j.picard@starlight.eu,+33 1 42 68 55 00,"12 Rue de la Paix, 75002 Paris, France",4200000,New - Unassigned,"Exported with European accents: Résumé & audit dossier attached for review."
00Q5g000004,Amara,Kowalski,"Apex FinTech Labs",amara.k@apexfintech.io,(212) 555-0199,"350 5th Ave, Floor 58, New York, NY 10118",9500000,Negotiation,"Met at Finovate 2026. Needs "White-Glove" migration from legacy Oracle DB before April."
00Q5g000005,Devon,O'Connor,"Emerald BioScience",devon@emeraldbio.ie,+353 1 496 0000,"Grand Canal Dock, Dublin 2, Ireland",6100000,Qualified - Working,"Irish GDPR compliance officer flagged cloud spreadsheets; requested in-browser sanitizer tool."`;

  const SAMPLE_FINANCE_CSV = `Account_No,Entity_Name,Tax_ID,Currency,Amount,Transaction_Type,Description,Auditor_Remarks
00010482,CafÃ© du Monde SAS,FR928471092,EUR,14520.00,Credit,"Q4 franchise royalty payment â€” verified by CFO","Reconciled against BNP Paribas statement â€“ clean"
00029410,MÃ¼ller & Schmidt GmbH,DE812398711,EUR,8940.50,Debit,"Machinery maintenance invoice #49281: "Precision CNC" components","Requires original VAT invoice from DÃ¼sseldorf office"
00030582,SociÃ©tÃ© GÃ©nÃ©rale Logistics,FR102938475,EUR,32500.00,Credit,"Cross-border freight haulage across â‚¬ zone","Approved by audit partner on 2026-01-14"
00041920,Barclays International UK,GB992817264,GBP,18250.75,Wire,"Consulting fee for â€œProject Horizonâ€  strategy","Wire reference: 9481-2819-4820-1928"
00059281,JosÃ© Silva & Filhos Lda,PT501928374,EUR,6720.00,Debit,"Raw material purchase from Porto factory","Original dispatch note signed by JosÃ© Silva"`;

  // Tab Switching
  tabFile.addEventListener('click', () => {
    activeTab = 'file';
    tabFile.classList.add('active');
    tabPaste.classList.remove('active');
    viewFile.classList.add('active');
    viewPaste.classList.remove('active');
  });

  tabPaste.addEventListener('click', () => {
    activeTab = 'paste';
    tabPaste.classList.add('active');
    tabFile.classList.remove('active');
    viewPaste.classList.add('active');
    viewFile.classList.remove('active');
  });

  // Dropzone Events
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    activeFileName = file.name.replace(/\.[^/.]+$/, '');
    fileNameDisplay.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
    const reader = new FileReader();
    reader.onload = (e) => {
      rawText = e.target.result;
    };
    reader.readAsText(file);
  }

  // Load Sample Data based on selected preset
  btnLoadSample.addEventListener('click', () => {
    const preset = selectSamplePreset ? selectSamplePreset.value : 'corrupted';
    let chosenText = SAMPLE_CORRUPTED_CSV;
    let label = 'corrupted_sample.csv (7 rows)';

    if (preset === 'shopify') {
      chosenText = SAMPLE_SHOPIFY_CSV;
      label = 'shopify_products.csv (5 products with inch quotes & HTML)';
      activeFileName = 'shopify_catalog';
    } else if (preset === 'salesforce') {
      chosenText = SAMPLE_SALESFORCE_CSV;
      label = 'salesforce_leads.csv (5 CRM leads with PII & notes)';
      activeFileName = 'salesforce_leads';
    } else if (preset === 'finance') {
      chosenText = SAMPLE_FINANCE_CSV;
      label = 'financial_audit.csv (5 ledger rows with European mojibake)';
      activeFileName = 'financial_audit';
    } else if (preset === 'stress') {
      label = 'stress_test_1000_rows.csv (1,000+ real-world stress rows)';
      activeFileName = 'stress_benchmark';
      fetch('./test_data/stress_test_1000_rows.csv')
        .then(r => r.ok ? r.text() : Promise.reject())
        .then(txt => {
          rawText = txt;
          pasteInput.value = txt;
          fileNameDisplay.textContent = 'Loaded: ' + label;
          tabPaste.click();
        })
        .catch(() => {
          rawText = SAMPLE_CORRUPTED_CSV;
          pasteInput.value = SAMPLE_CORRUPTED_CSV;
          fileNameDisplay.textContent = 'Loaded: corrupted_sample.csv (7 rows)';
          tabPaste.click();
        });
      return;
    } else {
      activeFileName = 'corrupted_sample';
    }

    rawText = chosenText;
    pasteInput.value = chosenText;
    fileNameDisplay.textContent = 'Loaded: ' + label;
    tabPaste.click();
  });

  // Clear
  btnClear.addEventListener('click', () => {
    rawText = '';
    pasteInput.value = '';
    fileInput.value = '';
    fileNameDisplay.textContent = '';
    resultsSection.style.display = 'none';
    lastProcessedData = null;
  });

  // Sanitize Execution
  btnSanitize.addEventListener('click', () => {
    const textToProcess = activeTab === 'paste' ? pasteInput.value : rawText;

    if (!textToProcess || textToProcess.trim().length === 0) {
      alert('Please select a file or paste CSV text first.');
      return;
    }

    const options = {
      delimiter: selectDelimiter.value,
      fixQuotes: chkQuotes.checked,
      fixMojibake: chkMojibake.checked,
      preserveLeadingZeros: chkZeros.checked,
      trimWhitespace: chkWhitespace.checked,
      deduplicate: chkDedupe.checked,
      removeEmptyRows: chkEmpty.checked,
      normalizeColumns: chkNormalize.checked,
      maskEmail: chkMaskEmail.checked,
      maskPhone: chkMaskPhone.checked,
      maskCreditCard: chkMaskCard.checked
    };

    const result = CSVSanitizer.process(textToProcess, options);
    lastProcessedData = result;

    renderResults(result);
  });

  // Render Results & Metrics
  function renderResults(result) {
    resultsSection.style.display = 'block';

    statInputRows.textContent = result.stats.totalRowsInput;
    statOutputRows.textContent = result.rows.length;
    statRepaired.textContent = result.stats.repairedRows;
    statMojibake.textContent = result.stats.mojibakeFixedCount || 0;
    statZeros.textContent = result.stats.zerosPreservedCount || 0;
    statDeduped.textContent = result.stats.duplicatesRemoved;
    statPii.textContent = result.stats.piiMaskedCount;
    statTime.textContent = `${result.stats.durationMs} ms`;

    currentPage = 1;
    renderTable(result.headers, result.rows);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Render Table with Visual Diff Highlighting and Dynamic Pagination
  function renderTable(headers, rows, filterText = '') {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (!headers || headers.length === 0) {
      if (paginationInfo) paginationInfo.textContent = 'Showing 0 of 0 rows';
      if (pageIndicator) pageIndicator.textContent = 'Page 1 of 1';
      if (btnPagePrev) btnPagePrev.disabled = true;
      if (btnPageNext) btnPageNext.disabled = true;
      return;
    }

    // Header Row
    const trHead = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      trHead.appendChild(th);
    });
    tableHead.appendChild(trHead);

    // Filter Rows with original index tracking
    let indexedRows = rows.map((r, idx) => ({ row: r, originalIndex: idx }));
    if (filterText.trim().length > 0) {
      const q = filterText.toLowerCase();
      indexedRows = indexedRows.filter(item => item.row.some(cell => String(cell).toLowerCase().includes(q)));
    }

    const totalFiltered = indexedRows.length;
    const limit = (pageSize === 'all' || pageSize === Infinity) ? Math.max(1, totalFiltered) : Math.max(1, parseInt(pageSize, 10) || 50);
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * limit;
    const endIdx = (pageSize === 'all' || pageSize === Infinity) ? totalFiltered : Math.min(startIdx + limit, totalFiltered);
    const displayItems = indexedRows.slice(startIdx, endIdx);
    const mods = (lastProcessedData && lastProcessedData.stats && lastProcessedData.stats.cellModifications) ? lastProcessedData.stats.cellModifications : {};

    displayItems.forEach(item => {
      const tr = document.createElement('tr');
      const rIdx = item.originalIndex;

      item.row.forEach((cell, cIdx) => {
        const td = document.createElement('td');
        td.textContent = cell;

        const modKey = `${rIdx}:${cIdx}`;
        if (mods[modKey]) {
          const mod = mods[modKey];
          td.classList.add('cell-diff', `cell-diff-${mod.type}`);

          let tip = '';
          if (mod.type === 'repaired') tip = `Quote Repaired: "${mod.original}" → "${mod.fixed}"`;
          else if (mod.type === 'mojibake') tip = `Mojibake Fixed: "${mod.original}" → "${mod.fixed}"`;
          else if (mod.type === 'masked') tip = `PII Anonymized: "${mod.original}" → "${mod.fixed}"`;
          else if (mod.type === 'zeros') tip = `Leading Zero Retained: "${mod.original}"`;

          td.setAttribute('data-tooltip', tip);
        }

        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });

    if (totalFiltered === 0) {
      if (paginationInfo) paginationInfo.textContent = 'Showing 0 of 0 rows';
    } else {
      if (paginationInfo) paginationInfo.textContent = `Showing rows ${startIdx + 1} - ${endIdx} of ${totalFiltered}${totalFiltered !== rows.length ? ` (filtered from ${rows.length})` : ''}`;
    }

    if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    if (btnPagePrev) btnPagePrev.disabled = (currentPage <= 1);
    if (btnPageNext) btnPageNext.disabled = (currentPage >= totalPages);
  }

  // Filter Input Listener
  filterInput.addEventListener('input', (e) => {
    currentPage = 1;
    if (lastProcessedData) {
      renderTable(lastProcessedData.headers, lastProcessedData.rows, e.target.value);
    }
  });

  // Pagination Event Listeners
  if (btnPagePrev) {
    btnPagePrev.addEventListener('click', () => {
      if (currentPage > 1 && lastProcessedData) {
        currentPage--;
        renderTable(lastProcessedData.headers, lastProcessedData.rows, filterInput.value);
      }
    });
  }

  if (btnPageNext) {
    btnPageNext.addEventListener('click', () => {
      if (lastProcessedData) {
        currentPage++;
        renderTable(lastProcessedData.headers, lastProcessedData.rows, filterInput.value);
      }
    });
  }

  if (selectPageSize) {
    selectPageSize.addEventListener('change', (e) => {
      pageSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
      currentPage = 1;
      if (lastProcessedData) {
        renderTable(lastProcessedData.headers, lastProcessedData.rows, filterInput.value);
      }
    });
  }

  // Exporters Helper
  function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Standard CSV Export
  btnExportCsv.addEventListener('click', () => {
    if (!lastProcessedData) return;
    const csv = CSVSanitizer.toCSV(
      lastProcessedData.headers,
      lastProcessedData.rows,
      lastProcessedData.stats.delimiter,
      false,
      chkZeros.checked
    );
    triggerDownload(csv, `${activeFileName}_clean.csv`, 'text/csv;charset=utf-8;');
  });

  // Excel UTF-8 BOM CSV Export
  btnExportExcel.addEventListener('click', () => {
    if (!lastProcessedData) return;
    const csv = CSVSanitizer.toCSV(
      lastProcessedData.headers,
      lastProcessedData.rows,
      lastProcessedData.stats.delimiter,
      true, // BOM included
      chkZeros.checked
    );
    triggerDownload(csv, `${activeFileName}_excel_clean.csv`, 'text/csv;charset=utf-8;');
  });

  btnExportJson.addEventListener('click', () => {
    if (!lastProcessedData) return;
    const json = CSVSanitizer.toJSON(lastProcessedData.headers, lastProcessedData.rows);
    triggerDownload(json, `${activeFileName}_clean.json`, 'application/json;charset=utf-8;');
  });

  btnExportMd.addEventListener('click', () => {
    if (!lastProcessedData) return;
    const md = CSVSanitizer.toMarkdown(lastProcessedData.headers, lastProcessedData.rows);
    triggerDownload(md, `${activeFileName}_clean.md`, 'text/markdown;charset=utf-8;');
  });

  btnExportSql.addEventListener('click', () => {
    if (!lastProcessedData) return;
    const sql = CSVSanitizer.toSQL(activeFileName, lastProcessedData.headers, lastProcessedData.rows);
    triggerDownload(sql, `${activeFileName}_clean.sql`, 'text/plain;charset=utf-8;');
  });

  btnCopy.addEventListener('click', () => {
    if (!lastProcessedData) return;
    const csv = CSVSanitizer.toCSV(
      lastProcessedData.headers,
      lastProcessedData.rows,
      lastProcessedData.stats.delimiter,
      false,
      chkZeros.checked
    );
    navigator.clipboard.writeText(csv).then(() => {
      copyBtnText.textContent = 'Copied!';
      setTimeout(() => {
        copyBtnText.textContent = 'Copy CSV';
      }, 2000);
    });
  });

  // Inspector Modal
  btnShowInspector.addEventListener('click', () => {
    inspectorModal.style.display = 'flex';
  });
  btnCloseInspector.addEventListener('click', () => {
    inspectorModal.style.display = 'none';
  });

  // Pro Modal
  btnProModal.addEventListener('click', () => {
    proModal.style.display = 'flex';
  });
  btnClosePro.addEventListener('click', () => {
    proModal.style.display = 'none';
  });

  // Close modals on background click
  window.addEventListener('click', (e) => {
    if (e.target === inspectorModal) inspectorModal.style.display = 'none';
    if (e.target === proModal) proModal.style.display = 'none';
  });
});
