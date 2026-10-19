/**
 * RUEC AI Newsletter — reader forms → Google Sheet
 *
 * Setup (once):
 *  1. Open the Google Sheet → Extensions → Apps Script → replace everything with this file → Save.
 *  2. Set SHARED_SECRET below (the same value goes into Vercel as FORMS_SHARED_SECRET).
 *  3. (Only for a brand-new, empty sheet) select the function "setup" → Run → allow access.
 *     It builds the tabs, colors, dropdowns and filters. The team sheet is already styled, so skip this.
 *  4. Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy.
 *     Copy the Web app URL → it goes into Vercel as FORMS_WEBHOOK_URL.
 */
const SHARED_SECRET = 'change-me-to-a-long-random-string';

const NAVY = '#0F2D96';
const TINT = '#EEF2FA';
const STATUS = [ // value, background, text
  ['New', '#FFF1C2', '#7A5B00'],
  ['Reviewing', '#DCEBFA', '#0F2D96'],
  ['Added to issue', '#DDF3E4', '#1E6B3A'],
  ['Not a fit', '#ECECEC', '#6B6B6B'],
];
// Tab per form. Each column: [header, width px, field from the form, kind]
const TABS = {
  event: {
    name: 'Events',
    columns: [
      ['Status', 130, 'status'],
      ['Received', 140, 'received_at', 'datetime'],
      ['Event name', 260, 'event_name', 'wrap'],
      ['Date', 120, 'event_date', 'date'],
      ['Time', 70, 'event_time'],
      ['Location', 220, 'location', 'wrap'],
      ['Official link', 260, 'link'],
      ['Price', 85, 'price'],
      ['Who is it for', 260, 'audience', 'wrap'],
      ['Submitted by', 150, 'submitter_name'],
      ['Contact', 190, 'contact'],
    ],
  },
  share: {
    name: 'Ideas',
    columns: [
      ['Status', 130, 'status'],
      ['Received', 140, 'received_at', 'datetime'],
      ['Type', 110, 'kind'],
      ['Title', 260, 'title', 'wrap'],
      ['Details', 420, 'details', 'wrap'],
      ['Link', 230, 'link'],
      ['Submitted by', 150, 'submitter_name'],
      ['Contact', 190, 'contact'],
      ['OK to publish name', 150, 'consent'],
    ],
  },
};

/** Run once from the editor: builds and styles every tab. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Jerusalem');
  Object.values(TABS).forEach((tab) => styleTab_(ss, tab));
  buildGuide_(ss);
  const blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('גיליון1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  ss.setActiveSheet(ss.getSheetByName(TABS.event.name));
}

function styleTab_(ss, tab) {
  const sh = ss.getSheetByName(tab.name) || ss.insertSheet(tab.name);
  const cols = tab.columns;
  const n = cols.length;
  const maxRows = Math.max(sh.getMaxRows(), 1000);
  if (sh.getMaxRows() < maxRows) sh.insertRowsAfter(sh.getMaxRows(), maxRows - sh.getMaxRows());
  if (sh.getMaxColumns() > n) sh.deleteColumns(n + 1, sh.getMaxColumns() - n);
  sh.setRightToLeft(false);

  // Header
  const header = sh.getRange(1, 1, 1, n);
  header.setValues([cols.map((c) => c[0])])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground(NAVY)
    .setFontSize(11).setVerticalAlignment('middle').setHorizontalAlignment('left');
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(2);

  // Body
  const body = sh.getRange(2, 1, maxRows - 1, n);
  body.setFontSize(10).setVerticalAlignment('top').setFontFamily('Arial');
  cols.forEach((c, i) => {
    sh.setColumnWidth(i + 1, c[1]);
    const col = sh.getRange(2, i + 1, maxRows - 1, 1);
    if (c[3] === 'datetime') col.setNumberFormat('yyyy-mm-dd hh:mm');
    if (c[3] === 'date') col.setNumberFormat('ddd dd mmm yyyy');
    col.setWrap(c[3] === 'wrap');
  });
  sh.getRange(2, 1, maxRows - 1, 1).setFontWeight('bold');

  // Zebra stripes (extend to new rows automatically)
  sh.getBandings().forEach((b) => b.remove());
  sh.getRange(1, 1, maxRows, n).applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false)
    .setHeaderRowColor(NAVY).setFirstRowColor('#FFFFFF').setSecondRowColor(TINT);

  // Status dropdown + colored chips
  const statusRange = sh.getRange(2, 1, maxRows - 1, 1);
  statusRange.setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS.map((s) => s[0]), true).setAllowInvalid(false).build());
  const rules = STATUS.map(([v, bg, fg]) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(v).setBackground(bg).setFontColor(fg).setRanges([statusRange]).build());
  if (tab === TABS.event) {
    const price = sh.getRange(2, 8, maxRows - 1, 1);
    rules.push(
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Free').setBackground('#DDF3E4').setFontColor('#1E6B3A').setBold(true).setRanges([price]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Paid').setBackground('#FDE7D7').setFontColor('#9A4A12').setBold(true).setRanges([price]).build(),
    );
  }
  sh.setConditionalFormatRules(rules);

  // Filter arrows on the header
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, maxRows, n).createFilter();
}

function buildGuide_(ss) {
  const sh = ss.getSheetByName('How it works') || ss.insertSheet('How it works');
  sh.clear();
  const rows = [
    ['Newsletter form submissions', ''],
    ['', ''],
    ['Where rows come from', 'Every time a reader sends a form on the newsletter site, a new row appears here automatically.'],
    ['Events tab', 'From the "Submit an event" page: ruec-ai-newsletter.vercel.app/submit-event/'],
    ['Ideas tab', 'From the "Share with us" page: ruec-ai-newsletter.vercel.app/share/ (use cases, tools, guide ideas, feedback).'],
    ['', ''],
    ['Status column', 'Pick from the dropdown to track each row:'],
    ['New', 'Just arrived, nobody has looked at it yet (set automatically).'],
    ['Reviewing', 'Someone on the team is checking it.'],
    ['Added to issue', 'It made it into a newsletter issue.'],
    ['Not a fit', "Not using it (e.g. no official or Luma link, or another university's event)."],
    ['', ''],
    ['Event rules', 'We only publish events with an official page or a Luma page, and no events of other universities.'],
    ['Tips', 'Use the filter arrows in the header row to show only "New" or sort by date. Do not rename tabs or headers — the form writes by column order.'],
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows).setVerticalAlignment('top').setFontSize(11);
  sh.getRange(1, 1, rows.length, 1).setFontWeight('bold').setFontColor(NAVY);
  sh.getRange(1, 2, rows.length, 1).setWrap(true);
  sh.getRange('A1').setFontSize(16);
  sh.setColumnWidth(1, 190);
  sh.setColumnWidth(2, 640);
  STATUS.forEach(([v, bg, fg], i) => sh.getRange(8 + i, 1).setBackground(bg).setFontColor(fg));
  sh.setHiddenGridlines(true);
}

/** Receives a submission from the site (api/submit.js) and appends it as a row. */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.secret !== SHARED_SECRET) return out_({ ok: false, error: 'forbidden' });
  const tab = TABS[data.form];
  if (!tab) return out_({ ok: false, error: 'unknown_form' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(tab.name) || (styleTab_(ss, tab), ss.getSheetByName(tab.name));
    const row = tab.columns.map(([, , field, kind]) => {
      if (field === 'status') return 'New';
      if (field === 'received_at') return new Date();
      if (field === 'consent') return data.consent === 'yes' ? 'Yes' : 'No';
      const v = data[field] || '';
      if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [y, m, d] = v.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; // no formula injection
    });
    sh.appendRow(row);
    // appendRow resets date cells to the default format; re-apply ours on the new row.
    const r = sh.getLastRow();
    tab.columns.forEach(([, , , kind], i) => {
      if (kind === 'datetime') sh.getRange(r, i + 1).setNumberFormat('yyyy-mm-dd hh:mm');
      if (kind === 'date') sh.getRange(r, i + 1).setNumberFormat('ddd dd mmm yyyy');
    });
  } finally {
    lock.releaseLock();
  }
  return out_({ ok: true });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
