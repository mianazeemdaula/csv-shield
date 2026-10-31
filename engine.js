/**
 * ClientSide CSV Sanitizer & Formatter Engine v2.0
 * Zero external dependencies. 100% Client-Side.
 * Compatible with both Browser (window/self) and Node.js environments.
 * 
 * Features:
 * - RFC 4180 Heuristic Quote Auto-Repair
 * - Delimiter Auto-Detection (comma, semicolon, tab, pipe)
 * - Mojibake & Encoding Corruption Fixer (Windows-1252 to UTF-8)
 * - Visual Cell Diffing & Change Tracking (before/after tooltips)
 * - PII Masking (Email, Phone, Credit Card)
 * - Leading Zero Preservation for Excel (="01234")
 * - UTF-8 BOM Excel-Compatible Export
 * - Markdown, JSON, and SQL Multi-Format Exporters
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSVSanitizer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Auto-detect delimiter from sample lines
  function detectDelimiter(text) {
    if (typeof text !== 'string') return ',';
    let clean = text;
    if (clean.charCodeAt(0) === 0xFEFF) clean = clean.slice(1);
    const delimiters = [',', ';', '\t', '|'];
    const lines = clean.split(/\r?\n/).filter(line => line.trim().length > 0).slice(0, 15);
    
    if (lines.length === 0) return ',';

    const scores = {};
    for (const d of delimiters) {
      scores[d] = { counts: [], variance: 0, total: 0 };
      for (const line of lines) {
        let count = 0;
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === d && !inQuotes) count++;
        }
        scores[d].counts.push(count);
        scores[d].total += count;
      }

      const counts = scores[d].counts;
      const mean = scores[d].total / counts.length;
      if (mean === 0) {
        scores[d].variance = Infinity;
      } else {
        const sumSq = counts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
        scores[d].variance = sumSq / counts.length;
      }
    }

    let bestDelimiter = ',';
    let bestScore = -Infinity;

    for (const d of delimiters) {
      if (scores[d].total > 0) {
        const consistencyScore = (scores[d].total / lines.length) / (1 + scores[d].variance);
        if (consistencyScore > bestScore) {
          bestScore = consistencyScore;
          bestDelimiter = d;
        }
      }
    }

    return bestDelimiter;
  }

  // Mojibake repair.
  // Text that was UTF-8 but got read as Windows-1252 turns "é" into "Ã©" and "’" into "â€™".
  // We find runs that look like that, turn each character back into its Windows-1252 byte, and decode
  // those bytes as UTF-8. If the bytes are not valid UTF-8, the run was real text and is left alone
  // (so "SÃO PAULO" or "AÑO" are never touched).
  const CP1252_HIGH = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
    0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91,
    0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98,
    0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
  };
  // A lead character (Â-ô = UTF-8 lead bytes C2-F4) followed by one or more continuation characters
  // (bytes 80-BF as Windows-1252 shows them, plus the five bytes 81 8D 8F 90 9D that survive as C1 controls).
  const CONT = '\u0080-¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const MOJIBAKE_RUN = new RegExp('[Â-ô][' + CONT + ']+', 'g');
  let utf8Decoder = null;
  function decodeUtf8Strict(bytes) {
    if (!utf8Decoder) {
      if (typeof TextDecoder === 'undefined') return null;
      utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    }
    try { return utf8Decoder.decode(new Uint8Array(bytes)); } catch (e) { return null; }
  }
  function toCp1252Bytes(s) {
    const out = [];
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (cp < 0x100) out.push(cp);
      else if (CP1252_HIGH[cp] !== undefined) out.push(CP1252_HIGH[cp]);
      else return null;
    }
    return out;
  }
  function fixMojibake(text) {
    if (typeof text !== 'string' || !text) return text;
    return text.replace(MOJIBAKE_RUN, run => {
      const bytes = toCp1252Bytes(run);
      if (!bytes) return run;
      const decoded = decodeUtf8Strict(bytes);
      return decoded === null ? run : decoded;
    });
  }

  // Pre-process and repair unescaped quotes in a raw line or stream
  function repairUnescapedQuotes(line, delimiter) {
    if (!line.includes('"')) return line;

    const chars = line.split('');
    let inQuotedField = false;
    let fieldStartIndex = 0;
    const repaired = [];

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      const prev = i > 0 ? chars[i - 1] : null;
      const next = i < chars.length - 1 ? chars[i + 1] : null;

      if (c === '"') {
        const atFieldBoundaryStart = (i === fieldStartIndex || prev === delimiter || (prev === ' ' && (i === 1 || chars[i - 2] === delimiter)));
        const atFieldBoundaryEnd = (next === null || next === delimiter || next === '\r' || next === '\n' || (next === ' ' && chars[i + 2] === delimiter));

        if (!inQuotedField) {
          if (atFieldBoundaryStart) {
            inQuotedField = true;
            repaired.push(c);
          } else {
            repaired.push('""');
          }
        } else {
          if (atFieldBoundaryEnd) {
            inQuotedField = false;
            repaired.push(c);
          } else if (next === '"') {
            repaired.push('""');
            i++; // skip next quote
          } else {
            repaired.push('""');
          }
        }
      } else {
        if (!inQuotedField && c === delimiter) {
          fieldStartIndex = i + 1;
        }
        repaired.push(c);
      }
    }

    if (inQuotedField) {
      repaired.push('"');
    }

    return repaired.join('');
  }

  // Helper to detect if a quote before a delimiter was actually an internal quote in a phrase
  function isPseudoClosingQuote(src, i, delimiter) {
    let k = i + 1;
    while (k < src.length && (src[k] === ' ' || (src[k] === '\t' && delimiter !== '\t'))) k++;
    if (k >= src.length || src[k] !== delimiter) return false;
    
    // Find where the next token ends
    let nextStart = k + 1;
    let d = src.indexOf(delimiter, nextStart);
    let nl = src.indexOf('\n', nextStart);
    let endOfNext = (d !== -1 && (nl === -1 || d < nl)) ? d : (nl !== -1 ? nl : src.length);
    let nextToken = src.slice(nextStart, endOfNext).trim();
    
    // If the next token ends with a quote but doesn't start with a quote,
    // then the current quote was an internal quote and NOT the field closing quote!
    if (nextToken.endsWith('"') && !nextToken.startsWith('"')) {
      return true;
    }
    return false;
  }

  // Tokenize and parse a sanitized CSV string into a 2D array
  function parseCSV(text, delimiter, fixQuotes = true) {
    if (typeof text !== 'string') return { rows: [], repairedLinesCount: 0, repairedRowIndices: new Set() };

    let src = text;
    if (src.charCodeAt(0) === 0xFEFF) {
      src = src.slice(1);
    }

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    let cellStart = true;
    let repairedCount = 0;
    const repairedRowIndices = new Set();
    let currentRowIdx = 0;

    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      const next = i < src.length - 1 ? src[i + 1] : null;

      // CRLF or LF line breaks outside quotes -> end of record
      if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++; // skip \n in CRLF
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRowIdx++;
        currentRow = [];
        currentCell = '';
        cellStart = true;
        continue;
      }

      // Delimiter outside quotes -> end of field
      if (c === delimiter && !inQuotes) {
        currentRow.push(currentCell);
        currentCell = '';
        cellStart = true;
        continue;
      }

      // Backslash-escaped quote \" in JSON or database dumps
      if (fixQuotes && c === '\\' && next === '"') {
        currentCell += '"';
        i++; // skip quote
        repairedCount++;
        repairedRowIndices.add(currentRowIdx);
        cellStart = false;
        continue;
      }

      // Quote handling
      if (c === '"') {
        if (!inQuotes) {
          if (cellStart && currentCell.trim().length === 0) {
            inQuotes = true;
            cellStart = false;
            continue;
          } else {
            // Unescaped quote inside unquoted field (e.g. 24" Monitor)
            if (fixQuotes) {
              currentCell += '"';
              repairedCount++;
              repairedRowIndices.add(currentRowIdx);
              continue;
            } else {
              inQuotes = true;
              continue;
            }
          }
        } else {
          // In quotes: check RFC 4180 escaped quote ""
          if (next === '"') {
            currentCell += '"';
            i++; // skip next quote
            continue;
          }

          // Check if this quote is a true field closing quote
          let k = i + 1;
          while (k < src.length && (src[k] === ' ' || (src[k] === '\t' && delimiter !== '\t'))) {
            k++;
          }

          const isDelimiterOrNewline = (
            k === src.length ||
            src[k] === delimiter ||
            src[k] === '\r' ||
            src[k] === '\n'
          );

          let isClosing = isDelimiterOrNewline;
          if (isClosing && fixQuotes && src[k] === delimiter) {
            if (isPseudoClosingQuote(src, i, delimiter)) {
              isClosing = false;
            }
          }

          if (isClosing) {
            inQuotes = false;
            i = k - 1;
            continue;
          } else {
            // Internal unescaped quote inside quoted field
            if (fixQuotes) {
              currentCell += '"';
              repairedCount++;
              repairedRowIndices.add(currentRowIdx);
              continue;
            } else {
              inQuotes = false;
              continue;
            }
          }
        }
      }

      // Regular character
      currentCell += c;
      if (cellStart && (c !== ' ' && (c !== '\t' || delimiter === '\t'))) {
        cellStart = false;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0 || inQuotes) {
      if (inQuotes && fixQuotes) {
        repairedCount++;
        repairedRowIndices.add(currentRowIdx);
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    return { rows, repairedLinesCount: repairedCount, repairedRowIndices };
  }

  // PII Masking Utilities
  function maskEmail(val) {
    if (typeof val !== 'string') return val;
    return val.replace(/\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g, '$1***@$2');
  }

  function maskPhone(val) {
    if (typeof val !== 'string') return val;
    // A phone number here means 7-15 digits written with phone formatting: a leading +, brackets,
    // or groups separated by spaces, dots or dashes. A bare run of digits (ISBN, EAN, order or
    // account number) is not masked, and nor is anything that looks like a date.
    return val.replace(/(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?\d{2,5}(?:[\s.-]\d{2,5}){1,4}/g, m => {
      const digits = m.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) return m;
      if (/^\d{4}-\d{2}-\d{2}$/.test(m) || /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(m)) return m;
      const hasPhoneShape = /^\+/.test(m) || /\(/.test(m) || /[\s.-]/.test(m);
      if (!hasPhoneShape) return m;
      return m.replace(/\d(?=(?:\D*\d){4})/g, '*');
    });
  }

  function luhnValid(digits) {
    let sum = 0, alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits.charCodeAt(i) - 48;
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    return sum % 10 === 0;
  }

  function maskCreditCard(val) {
    if (typeof val !== 'string') return val;
    return val.replace(/\b\d(?:[ -]?\d){12,18}\b/g, m => {
      const digits = m.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return m;
      // Written as four groups of four (1234-5678-9012-3456 or with spaces): that is how cards are
      // shown, so mask it even if the checksum fails (typos and test numbers are still sensitive).
      const cardShape = /^\d{4}([ -])\d{4}\1\d{4}\1\d{4}$/.test(m);
      if (!cardShape && !luhnValid(digits)) return m;
      // ISBN-13 and EAN-13 barcodes start with 978/979 or are 13 digits without separators; skip those.
      if (digits.length === 13 && !/[ -]/.test(m)) return m;
      return m.replace(/\d(?=(?:\D*\d){4})/g, '*');
    });
  }

  // Check if string is a numeric value with a meaningful leading zero (e.g. 07030, 004821)
  function isLeadingZeroNumeric(val) {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    return /^0\d+$/.test(trimmed) && trimmed.length > 1;
  }

  // Master Sanitization Routine
  function process(rawText, options = {}) {
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    let cleanInput = (typeof rawText === 'string') ? rawText : String(rawText || '');
    if (cleanInput.charCodeAt(0) === 0xFEFF) {
      cleanInput = cleanInput.slice(1);
    }

    const opts = {
      delimiter: options.delimiter || 'auto',
      fixQuotes: options.fixQuotes !== false,
      fixMojibake: options.fixMojibake !== false,
      trimWhitespace: options.trimWhitespace !== false,
      deduplicate: !!options.deduplicate,
      removeEmptyRows: options.removeEmptyRows !== false,
      normalizeColumns: options.normalizeColumns !== false,
      preserveLeadingZeros: !!options.preserveLeadingZeros,
      maskEmail: !!options.maskEmail,
      maskPhone: !!options.maskPhone,
      maskCreditCard: !!options.maskCreditCard
    };

    const effectiveDelimiter = (opts.delimiter === 'auto') ? detectDelimiter(cleanInput) : opts.delimiter;
    
    // Parse raw rows without quote repair to provide baseline for cell diffing
    let baselineRows = [];
    try {
      const rawRes = parseCSV(cleanInput, effectiveDelimiter, false);
      baselineRows = rawRes.rows;
    } catch (_) {
      baselineRows = [];
    }

    const { rows: rawRows, repairedLinesCount, repairedRowIndices } = parseCSV(cleanInput, effectiveDelimiter, opts.fixQuotes);

    let cleanRows = [];
    const cleanRowNumbers = []; // 1-based row number in the input (header = 1) for each kept row
    const removedDuplicates = []; // { inputRow, sameAsInputRow, cells }
    let emptyRowsRemoved = 0;
    let duplicatesRemoved = 0;
    let piiMaskedCount = 0;
    let mojibakeFixedCount = 0;
    let zerosPreservedCount = 0;

    // Remove empty rows
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const isBlank = row.every(cell => !cell || cell.trim().length === 0);
      if (opts.removeEmptyRows && isBlank) {
        emptyRowsRemoved++;
        continue;
      }
      cleanRows.push(row);
      cleanRowNumbers.push(i + 1);
    }

    if (cleanRows.length === 0) {
      return {
        headers: [],
        rows: [],
        stats: {
          totalRowsInput: rawRows.length,
          totalRowsOutput: 0,
          repairedRows: 0,
          duplicatesRemoved: 0,
          emptyRowsRemoved,
          piiMaskedCount: 0,
          mojibakeFixedCount: 0,
          zerosPreservedCount: 0,
          delimiter: effectiveDelimiter,
          durationMs: 0,
          cellModifications: {},
          removedDuplicates: []
        }
      };
    }

    const headers = cleanRows[0].map(h => opts.trimWhitespace ? h.trim() : h);
    const targetCols = headers.length;
    const dataRows = cleanRows.slice(1);

    const processedData = [];
    const seenHashes = new Map(); // row hash -> input row number of its first occurrence
    const cellModifications = {}; // key: `${rowIndex}:${colIndex}` -> { type, original, fixed }

    for (let r = 0; r < dataRows.length; r++) {
      let row = dataRows[r];
      const outputRowIdx = processedData.length; // 0-indexed data row index

      // 1. Trim whitespace
      if (opts.trimWhitespace) {
        row = row.map(cell => cell.trim());
      }

      // 2. Normalize column count
      if (opts.normalizeColumns) {
        if (row.length < targetCols) {
          while (row.length < targetCols) row.push('');
        } else if (row.length > targetCols) {
          const extra = row.slice(targetCols - 1).join(', ');
          row = row.slice(0, targetCols - 1);
          row.push(extra);
        }
      }

      // 3. Process each cell for Mojibake, Leading Zeros, and PII
      const updatedRow = [];
      for (let c = 0; c < row.length; c++) {
        let cellVal = row[c];
        const initialCellVal = cellVal;
        let modType = null;
        let originalValue = cellVal;

        // Check if row had quote repair
        if (opts.fixQuotes && repairedRowIndices && repairedRowIndices.has(r + 1)) {
          // If this cell contains quotes or had unescaped quotes
          if (cellVal.includes('"')) {
            modType = 'repaired';
          }
        }

        // Mojibake Repair
        if (opts.fixMojibake) {
          const cleanMoji = fixMojibake(cellVal);
          if (cleanMoji !== cellVal) {
            mojibakeFixedCount++;
            originalValue = cellVal;
            cellVal = cleanMoji;
            modType = 'mojibake';
          }
        }

        // Leading Zero Preservation for Excel
        if (opts.preserveLeadingZeros && isLeadingZeroNumeric(cellVal)) {
          zerosPreservedCount++;
          if (!modType) {
            originalValue = cellVal;
            modType = 'zeros';
          }
        }

        // PII Masking
        if (opts.maskEmail) {
          const masked = maskEmail(cellVal);
          if (masked !== cellVal) {
            piiMaskedCount++;
            originalValue = cellVal;
            cellVal = masked;
            modType = 'masked';
          }
        }
        if (opts.maskPhone) {
          const masked = maskPhone(cellVal);
          if (masked !== cellVal) {
            piiMaskedCount++;
            originalValue = cellVal;
            cellVal = masked;
            modType = 'masked';
          }
        }
        if (opts.maskCreditCard) {
          const masked = maskCreditCard(cellVal);
          if (masked !== cellVal) {
            piiMaskedCount++;
            originalValue = cellVal;
            cellVal = masked;
            modType = 'masked';
          }
        }

        if (modType) {
          cellModifications[`${outputRowIdx}:${c}`] = {
            type: modType,
            original: originalValue,
            fixed: cellVal
          };
        }

        updatedRow.push(cellVal);
      }

      // 4. Deduplication
      if (opts.deduplicate) {
        const rowHash = JSON.stringify(updatedRow);
        const inputRow = cleanRowNumbers[r + 1];
        if (seenHashes.has(rowHash)) {
          duplicatesRemoved++;
          removedDuplicates.push({ inputRow, sameAsInputRow: seenHashes.get(rowHash), cells: updatedRow });
          for (let c = 0; c < updatedRow.length; c++) delete cellModifications[`${outputRowIdx}:${c}`];
          continue;
        }
        seenHashes.set(rowHash, inputRow);
      }

      processedData.push(updatedRow);
    }

    const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const durationMs = Math.round((endTime - startTime) * 100) / 100;

    return {
      headers,
      rows: processedData,
      stats: {
        totalRowsInput: rawRows.length,
        totalRowsOutput: processedData.length + 1,
        repairedRows: repairedLinesCount,
        duplicatesRemoved,
        emptyRowsRemoved,
        piiMaskedCount,
        mojibakeFixedCount,
        zerosPreservedCount,
        delimiter: effectiveDelimiter,
        durationMs,
        cellModifications,
        removedDuplicates
      }
    };
  }

  // Exporters
  function toCSV(headers, rows, delimiter = ',', includeBOM = false, preserveLeadingZeros = false) {
    function escapeCell(val) {
      if (val === null || val === undefined) return '';
      let str = String(val);

      // If preserve leading zeros is active and cell is leading-zero numeric, format as Excel text formula
      if (preserveLeadingZeros && isLeadingZeroNumeric(str)) {
        return `="${str}"`;
      }

      if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    const lines = [];
    lines.push(headers.map(escapeCell).join(delimiter));
    for (const row of rows) {
      lines.push(row.map(escapeCell).join(delimiter));
    }
    const body = lines.join('\r\n');
    return includeBOM ? ('\uFEFF' + body) : body;
  }

  function toJSON(headers, rows, pretty = true) {
    const uniqueHeaders = [];
    const counts = {};
    (headers || []).forEach((h, idx) => {
      const base = (h && String(h).trim()) ? String(h).trim() : `col_${idx + 1}`;
      if (counts[base] === undefined) {
        counts[base] = 0;
        uniqueHeaders.push(base);
      } else {
        counts[base]++;
        uniqueHeaders.push(`${base}_${counts[base]}`);
      }
    });

    const list = rows.map(row => {
      const obj = {};
      uniqueHeaders.forEach((h, idx) => {
        obj[h] = row[idx] !== undefined ? row[idx] : null;
      });
      return obj;
    });
    return pretty ? JSON.stringify(list, null, 2) : JSON.stringify(list);
  }

  function toMarkdown(headers, rows, maxRows = 200) {
    if (!headers || headers.length === 0) return '';
    const headerLine = '| ' + headers.map(h => (h || '').replace(/\|/g, '\\|')).join(' | ') + ' |';
    const separatorLine = '| ' + headers.map(() => '---').join(' | ') + ' |';
    const rowLines = rows.slice(0, maxRows).map(row => {
      return '| ' + row.map(c => String(c || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')).join(' | ') + ' |';
    });
    return [headerLine, separatorLine, ...rowLines].join('\n');
  }

  function toSQL(tableName, headers, rows) {
    const safeTable = (tableName || 'sanitized_data').replace(/[^a-zA-Z0-9_]/g, '_');
    const cols = (headers || []).map(h => '`' + String(h || 'col').replace(/`/g, '') + '`').join(', ');
    
    const statements = rows.map(row => {
      const vals = row.map(val => {
        if (val === null || val === undefined || val === '') return 'NULL';
        const strVal = String(val).trim();
        // Keep as string if leading-zero numeric (e.g. 008492) or large numeric string (>15 digits)
        if (isLeadingZeroNumeric(strVal) || strVal.length > 15) {
          return `'${strVal.replace(/'/g, "''")}'`;
        }
        if (!isNaN(strVal) && /^-?\d+(\.\d+)?$/.test(strVal)) {
          return Number(strVal);
        }
        const escaped = String(val).replace(/'/g, "''");
        return `'${escaped}'`;
      }).join(', ');
      return `INSERT INTO ${safeTable} (${cols}) VALUES (${vals});`;
    });

    return statements.join('\n');
  }

  return {
    detectDelimiter,
    fixMojibake,
    repairUnescapedQuotes,
    parseCSV,
    process,
    toCSV,
    toJSON,
    toMarkdown,
    toSQL
  };
});
