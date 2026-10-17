// Small widget for the topic pages. Uses the same engine as the main tool (engine.js).
(function () {
  document.querySelectorAll('.lp-tool').forEach(function (box) {
    var preset = {};
    try { preset = JSON.parse(box.getAttribute('data-preset') || '{}'); } catch (e) { preset = {}; }
    var text = box.querySelector('.lp-text');
    var stats = box.querySelector('.lp-stats');
    var preview = box.querySelector('.lp-preview');
    var download = box.querySelector('.lp-download');
    var bom = box.querySelector('.lp-bom');
    var result = null;

    box.querySelector('.lp-sample').addEventListener('click', function () {
      text.value = box.querySelector('.lp-sample-data').value;
      run();
    });
    box.querySelector('.lp-input-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { text.value = reader.result; run(); };
      reader.readAsText(file);
    });
    box.querySelector('.lp-run').addEventListener('click', run);

    function run() {
      if (!text.value.trim()) { stats.textContent = 'Paste some CSV text or choose a file first.'; return; }
      result = CSVSanitizer.process(text.value, preset);
      var s = result.stats;
      var parts = [result.rows.length + ' rows'];
      if (s.repairedRows) parts.push(s.repairedRows + ' quote repairs');
      if (s.mojibakeFixedCount) parts.push(s.mojibakeFixedCount + ' cells with fixed characters');
      if (s.piiMaskedCount) parts.push(s.piiMaskedCount + ' values masked');
      if (s.duplicatesRemoved) parts.push(s.duplicatesRemoved + ' duplicates removed');
      if (s.emptyRowsRemoved) parts.push(s.emptyRowsRemoved + ' blank rows removed');
      stats.textContent = 'Done: ' + parts.join(', ') + '. Changed cells are highlighted below.';
      render();
      download.hidden = false;
    }

    function render() {
      var mods = result.stats.cellModifications || {};
      var table = document.createElement('table');
      var head = table.insertRow();
      result.headers.forEach(function (h) { var th = document.createElement('th'); th.textContent = h; head.appendChild(th); });
      result.rows.slice(0, 20).forEach(function (row, r) {
        var tr = table.insertRow();
        row.forEach(function (cell, c) {
          var td = tr.insertCell();
          td.textContent = cell;
          var m = mods[r + ':' + c];
          if (m) { td.className = 'lp-changed'; td.title = m.type === 'repaired' ? 'The quotes in this cell were repaired' : 'Was: ' + m.original; }
        });
      });
      preview.textContent = '';
      preview.appendChild(table);
      if (result.rows.length > 20) {
        var more = document.createElement('p');
        more.textContent = 'Showing the first 20 of ' + result.rows.length + ' rows. The download has all of them.';
        preview.appendChild(more);
      }
    }

    download.addEventListener('click', function () {
      if (!result) return;
      var csv = CSVSanitizer.toCSV(result.headers, result.rows, ',', bom.checked);
      var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'cleaned.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  });
})();
