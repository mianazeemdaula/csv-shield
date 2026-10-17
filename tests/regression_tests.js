// Independent checks of CSV Shield's engine: does it leave valid data alone, and are its repairs right?
// Usage: node tests/regression_tests.js
const E = require(process.argv[2] || require('path').join(__dirname, '..', 'engine.js'));
let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n   got:  ' + JSON.stringify(got) + '\n   want: ' + JSON.stringify(want)));
}
// Run with the tool's DEFAULT options, the way a user who just drops a file in gets it.
const run = (csv, o = {}) => E.process(csv, o);
const rowsOf = (csv, o) => { const r = run(csv, o); return [r.headers, ...r.rows]; };

// 1. Valid RFC 4180 files must come back unchanged
check('escaped quotes stay as data', rowsOf('a,b\n1,"He said ""hi"""\n'), [['a', 'b'], ['1', 'He said "hi"']]);
check('comma inside quoted field', rowsOf('name,price\n"Smith, John","1,234.50"\n'), [['name', 'price'], ['Smith, John', '1,234.50']]);
check('multiline quoted field', rowsOf('id,addr\n1,"10 High St\nLeeds"\n'), [['id', 'addr'], ['1', '10 High St\nLeeds']]);
check('empty quoted field', rowsOf('a,b,c\n1,"",3\n'), [['a', 'b', 'c'], ['1', '', '3']]);
check('quoted field that is just a quote', rowsOf('a,b\n1,""""\n'), [['a', 'b'], ['1', '"']]);
check('field ending in escaped quote', rowsOf('a,b\n1,"12"""\n'), [['a', 'b'], ['1', '12"']]);

// 2. The repairs it advertises
check('unquoted inch mark', rowsOf('sku,title,price\nA1,24" Monitor,199\n'), [['sku', 'title', 'price'], ['A1', '24" Monitor', '199']]);
check('unescaped quotes inside quoted field', rowsOf('id,name,email\n2,"Bob "The Builder" Smith",b@x.com\n'), [['id', 'name', 'email'], ['2', 'Bob "The Builder" Smith', 'b@x.com']]);

// 3. Things a default run should NOT change
check('two identical order lines are both kept (real data, not duplicates)', run('order,item,qty\n7,Pen,1\n7,Pen,1\n').rows.length, 2);
check('leading/trailing spaces kept when not asked to trim', rowsOf('a,b\n1,  x  \n', { trimWhitespace: false }), [['a', 'b'], ['1', '  x  ']]);
check('Portuguese SÃO PAULO not "fixed"', rowsOf('city\nSÃO PAULO\n'), [['city'], ['SÃO PAULO']]);
check('Spanish AÑO not touched', rowsOf('w\nAÑO\n'), [['w'], ['AÑO']]);
check('genuine "Â£" mojibake is fixed', rowsOf('p\nÂ£5\n'), [['p'], ['£5']]);
check('genuine "â€™" mojibake is fixed', rowsOf('t\nIâ€™m\n'), [['t'], ['I’m']]);
check('zip code text not altered by default', rowsOf('zip\n07030\n'), [['zip'], ['07030']]);

// 4. Masking (only when switched on) must not eat non-PII
const m = { maskEmail: true, maskPhone: true, maskCreditCard: true };
check('date not masked as phone', rowsOf('d\n2026-10-17\n', m), [['d'], ['2026-10-17']]);
check('order number not masked as phone', rowsOf('order\n100234567\n', m), [['order'], ['100234567']]);
check('price not masked', rowsOf('p\n1234.56\n', m), [['p'], ['1234.56']]);
check('ISBN-13 not masked as card', rowsOf('isbn\n9780306406157\n', m), [['isbn'], ['9780306406157']]);
check('email masked', run('e\nalice@example.com\n', m).rows[0][0] !== 'alice@example.com', true);

// 5. Export round trip
const r = run('a,b\n1,"x, ""y"""\n');
check('CSV export re-parses to the same data', rowsOf(E.toCSV(r.headers, r.rows)), [['a', 'b'], ['1', 'x, "y"']]);
check('SQL export escapes single quotes', /'O''Brien'/.test(E.toSQL('t', ['n'], [["O'Brien"]])), true);

// 6. Delimiter detection on a European file with decimal commas
check('semicolon file with decimal commas', run('name;price\nPen;1,50\nCup;2,75\n').stats.delimiter, ';');

console.log(`\n${pass} passed, ${fail} failed`);
