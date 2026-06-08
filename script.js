const steps = ["upload", "review", "setting", "export"];
let uploadedRows = [];
let activeReviewData = [];
let activeAttentionItems = [];
let activeSalaryData = [];
let activeStaffData = [];
let activeReviewNameFilter = "Semua Staff";
let editingStaffName = null;
let editingExportRowId = null;
let toastTimer = null;
let targetBonusConfig = {
  pool: 2000000,
  mode: "attendance",
};
let manualPayrollAddition = {
  amount: 0,
  note: "",
};
const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const workRuleGroups = ["Hari Biasa", "Jumat"];
let activeWorkRules = createDefaultWorkRules();

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

activeReviewData = [];
activeAttentionItems = [
  {
    id: "empty-state",
    rowId: null,
    name: "Belum ada file",
    note: "Upload file absensi untuk melihat data yang perlu diperhatikan.",
    type: "info",
  },
];
activeSalaryData = [];
activeStaffData = [];

function createDefaultWorkRules() {
  return {
    "Hari Biasa": { shift1In: "12:00", shift1Out: "18:30", shift2In: "16:00", shift2Out: "23:00", tolerance: 10, active: true },
    Jumat: { shift1In: "14:00", shift1Out: "18:30", shift2In: "17:00", shift2Out: "23:00", tolerance: 10, active: true },
  };
}

function setStep(nextStep) {
  const activeIndex = steps.indexOf(nextStep);

  document.querySelectorAll("[data-step]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.step === nextStep);
  });

  document.querySelectorAll("[data-step-target]").forEach((button) => {
    const stepIndex = steps.indexOf(button.dataset.stepTarget);
    button.classList.toggle("is-active", button.dataset.stepTarget === nextStep);
    button.classList.toggle("is-done", stepIndex < activeIndex);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const region = document.getElementById("toastRegion");
  if (!region) return;
  region.innerHTML = "";
  window.clearTimeout(toastTimer);
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  region.appendChild(toast);
  toastTimer = window.setTimeout(() => toast.remove(), 3200);
}

function statusBadge(status) {
  const className =
    status === "Aman"
      ? "badge-safe"
      : status === "Terlambat"
        ? "badge-late"
      : status === "Perlu Review" ||
          status === "Diabaikan" ||
          status.includes("Tidak Scan Masuk") ||
          status.includes("Tidak Scan Pulang") ||
          status === "Tidak Absen"
        ? "badge-warning"
        : "badge-error";

  return `<span class="badge ${className}">${status}</span>`;
}

function renderReview() {
  const rows = getFilteredReviewRows();
  document.getElementById("reviewRows").innerHTML = rows.length
    ? rows
    .map(
      (row) => `
        <tr>
          <td>${row.name}</td>
          <td>${row.date}</td>
          <td>${row.scan}</td>
          <td>${row.in}</td>
          <td>${row.out}</td>
          <td>${row.shift}</td>
          <td>${row.workday}</td>
          <td>${row.overtime}</td>
          <td>${statusBadge(row.status)}</td>
        </tr>
      `,
    )
    .join("")
    : `<tr><td colspan="9">Tidak ada data untuk filter nama ini.</td></tr>`;
  renderMetrics();
}

function getFilteredReviewRows() {
  if (activeReviewNameFilter === "Semua Staff") return activeReviewData;
  return activeReviewData.filter((row) => row.name === activeReviewNameFilter);
}

function renderAttention() {
  const actionableItems = activeAttentionItems.filter((item) => item.rowId !== null);
  document.getElementById("attentionCount").textContent = `${actionableItems.length} item`;
  document.getElementById("attentionList").innerHTML = activeAttentionItems
    .map((item) => renderAttentionItem(item))
    .join("");
}

function renderAttentionItem(item) {
  const row = activeReviewData.find((reviewRow) => reviewRow.id === item.rowId);
  const recommendation = item.recommendation
    ? `<span class="recommendation"><b>Rekomendasi:</b> ${item.recommendation}</span>`
    : "";
  const actions = item.rowId === null
    ? ""
    : `
      <div class="attention-actions">
        <button class="mini-btn" data-review-action="accept" data-row-id="${item.rowId}" type="button">
          Terima Saran
        </button>
        <button class="mini-btn" data-review-action="edit" data-row-id="${item.rowId}" type="button">
          Edit Manual
        </button>
        <button class="mini-btn" data-review-action="ignore" data-row-id="${item.rowId}" type="button">
          Abaikan
        </button>
      </div>
    `;
  const editForm = item.isEditing && row ? renderManualEditForm(row) : "";

  return `
    <div class="attention-item ${item.isEditing ? "is-editing" : ""}">
      <strong>${item.name}</strong>
      <span class="condition"><b>Kondisi:</b> ${item.note}</span>
      ${recommendation}
      ${actions}
      ${editForm}
    </div>
  `;
}

function renderManualEditForm(row, options = {}) {
  const formAttr = options.formType === "export"
    ? `data-export-form="${row.id}"`
    : `data-manual-form="${row.id}"`;
  const cancelAttr = options.formType === "export"
    ? `data-export-cancel="${row.id}"`
    : `data-manual-cancel="${row.id}"`;
  return `
    <form class="manual-edit-form ${options.formType === "export" ? "is-export-edit" : ""}" ${formAttr}>
      <label>
        Masuk
        <select name="inMode" data-scan-mode="in">
          <option value="scan" ${row.in !== "-" ? "selected" : ""}>Pakai Jam Scan</option>
          <option value="none" ${row.in === "-" ? "selected" : ""}>Tanpa Scan</option>
        </select>
        <input name="in" value="${row.in === "-" ? "" : row.in}" placeholder="11:00" />
      </label>
      <label>
        Pulang
        <select name="outMode" data-scan-mode="out">
          <option value="scan" ${row.out !== "-" ? "selected" : ""}>Pakai Jam Scan</option>
          <option value="none" ${row.out === "-" ? "selected" : ""}>Tanpa Scan</option>
        </select>
        <input name="out" value="${row.out === "-" ? "" : row.out}" placeholder="23:00" />
      </label>
      <label>
        Shift
        <select name="shift">
          <option ${row.shift === "Shift 1" ? "selected" : ""}>Shift 1</option>
          <option ${row.shift === "Shift 2" ? "selected" : ""}>Shift 2</option>
          <option ${row.shift === "Shift 1 + Shift 2" ? "selected" : ""}>Shift 1 + Shift 2</option>
          <option ${row.shift === "Shift terdeteksi" ? "selected" : ""}>Shift terdeteksi</option>
        </select>
      </label>
      <div class="auto-result">
        <span>Hari Kerja</span>
        <strong data-auto-workday>${row.workday}</strong>
      </div>
      <div class="auto-result">
        <span>Lembur</span>
        <strong data-auto-overtime>${row.overtime}</strong>
      </div>
      <div class="manual-edit-actions">
        <button class="mini-btn is-selected" data-manual-save="${row.id}" type="submit">Simpan Koreksi</button>
        <button class="mini-btn" ${cancelAttr} type="button">Batal</button>
      </div>
    </form>
  `;
}

function renderStaff() {
  document.getElementById("staffRows").innerHTML = activeStaffData.length
    ? activeStaffData
    .map(
      ([name, base, meal, extra, debt]) =>
        editingStaffName === name
          ? `
        <tr class="staff-edit-row">
          <td><input data-staff-field="name" value="${name}" /></td>
          <td><input class="money-input" data-staff-field="base" inputmode="numeric" value="${formatCurrencyInput(base)}" /></td>
          <td><input class="money-input" data-staff-field="meal" inputmode="numeric" value="${formatCurrencyInput(meal)}" /></td>
          <td><input class="money-input" data-staff-field="extra" inputmode="numeric" value="${formatCurrencyInput(extra)}" /></td>
          <td><input class="money-input" data-staff-field="debt" inputmode="numeric" value="${formatCurrencyInput(debt)}" /></td>
          <td>
            <button class="mini-btn is-selected" data-staff-action="save" data-staff="${name}" type="button">Simpan</button>
            <button class="mini-btn" data-staff-action="cancel" data-staff="${name}" type="button">Batal</button>
          </td>
        </tr>
      `
          : `
        <tr>
          <td>${name}</td>
          <td>${currency.format(base)}</td>
          <td>${currency.format(meal)}</td>
          <td>${currency.format(extra)}</td>
          <td>${currency.format(debt)}</td>
          <td>
            <button class="mini-btn" data-staff-action="edit" data-staff="${name}" type="button">Edit</button>
            <button class="mini-btn" data-staff-action="delete" data-staff="${name}" type="button">Hapus</button>
          </td>
        </tr>
      `,
    )
    .join("")
    : `<tr><td colspan="6">Belum ada staff. Upload file absensi untuk mengambil nama staff.</td></tr>`;
}

function renderSchedule() {
  const scheduleRows = document.getElementById("scheduleRows");
  if (!scheduleRows) return;
  scheduleRows.innerHTML = workRuleGroups
    .map((group) => {
      const rule = activeWorkRules[group];
      const shiftOne = rule.active && rule.shift1In ? `${rule.shift1In} - ${rule.shift1Out}` : "-";
      const shiftTwo = rule.active && rule.shift2In ? `${rule.shift2In} - ${rule.shift2Out}` : "-";
      const status = rule.active ? "Aktif" : "Libur";
      const tolerance = rule.active ? `${rule.tolerance} menit` : "-";
      return `
        <tr>
          <td>${group}</td>
          <td>${shiftOne}</td>
          <td>${shiftTwo}</td>
          <td>${statusBadge(status === "Aktif" ? "Aman" : "Tidak Lengkap").replace(
            status === "Aktif" ? "Aman" : "Tidak Lengkap",
            status,
          )}</td>
          <td>${tolerance}</td>
        </tr>
      `;
    })
    .join("");
}

function getSelectedStaff() {
  const selected = document.getElementById("staffFilter")?.value || "Semua Staff";
  return selected === "Semua Staff" ? null : selected;
}

function getFilteredReviewData() {
  const selectedStaff = getSelectedStaff();
  return selectedStaff ? activeReviewData.filter((row) => row.name === selectedStaff) : activeReviewData;
}

function getFilteredSalaryData() {
  const selectedStaff = getSelectedStaff();
  return selectedStaff ? activeSalaryData.filter(([name]) => name === selectedStaff) : activeSalaryData;
}

function renderExport() {
  const filteredReview = getFilteredReviewData();
  const filteredSalary = getFilteredSalaryData();

  document.getElementById("attendanceRows").innerHTML = filteredReview.length
    ? filteredReview
    .map(
      (row) => `
        <tr>
          <td>${row.name}</td>
          <td>${row.date}</td>
          <td>${row.in}</td>
          <td>${row.out}</td>
          <td>${row.shift}</td>
          <td class="attendance-status-cell">${statusBadge(row.status)}</td>
          <td>${row.overtime}</td>
          <td>
            <button class="mini-btn" data-attendance-edit="${row.id}" type="button">Edit</button>
          </td>
        </tr>
        ${editingExportRowId === row.id ? `
          <tr class="attendance-edit-row">
            <td colspan="8">${renderManualEditForm(row, { formType: "export" })}</td>
          </tr>
        ` : ""}
      `,
    )
    .join("")
    : `<tr><td colspan="8">Belum ada laporan kehadiran.</td></tr>`;

  document.getElementById("salaryRows").innerHTML = filteredSalary.length
    ? filteredSalary
    .map(([name, workday, overtime, base, meal, targetBonus, bonus, debt]) => {
      const total = calculateSalaryTotal({ base, meal, targetBonus, bonus, debt, workday, overtime });
      return `
        <tr>
          <td>${name}</td>
          <td>${workday}</td>
          <td>${overtime}</td>
          <td>${currency.format(base)}</td>
          <td>${currency.format(meal)}</td>
          <td>${currency.format(targetBonus)}</td>
          <td>${currency.format(bonus)}</td>
          <td>${currency.format(debt)}</td>
          <td><strong>${currency.format(total)}</strong></td>
        </tr>
      `;
    })
    .join("")
    : `<tr><td colspan="9">Belum ada rekap gaji.</td></tr>`;

  const totals = filteredSalary.reduce(
    (summary, [, workday, overtime, base, meal, targetBonus, bonus, debt]) => {
      summary.staff += 1;
      summary.workday += workday;
      summary.overtime += overtime;
      summary.salary += calculateSalaryTotal({ base, meal, targetBonus, bonus, debt, workday, overtime });
      return summary;
    },
    { staff: 0, workday: 0, overtime: 0, salary: 0 },
  );
  const finalSalary = totals.salary + manualPayrollAddition.amount;
  renderManualPayrollPreview();

  document.querySelector(".preview-summary").innerHTML = `
    <span>${totals.staff} staff</span>
    <span>${totals.workday} hari kerja</span>
    <span>${totals.overtime} lembur</span>
    <strong>${currency.format(finalSalary)}</strong>
  `;
}

function renderMetrics() {
  const rows = getFilteredReviewRows();
  const total = rows.length;
  const safe = rows.filter((row) => row.status === "Aman" || row.status === "Terlambat").length;
  const needsReview = rows.filter((row) => row.status === "Perlu Review" || row.status === "Tidak Lengkap").length;
  const metrics = document.querySelectorAll(".metric strong");

  if (metrics[0]) metrics[0].textContent = total;
  if (metrics[1]) metrics[1].textContent = safe;
  if (metrics[2]) metrics[2].textContent = needsReview;
}

function initUpload() {
  const input = document.getElementById("fileInput");
  const fileName = document.getElementById("fileName");
  const dropzone = document.getElementById("dropzone");
  const reset = document.getElementById("resetFile");

  input.addEventListener("change", () => {
    fileName.textContent = input.files[0]?.name || "Belum ada file dipilih";
    if (input.files[0]) {
      handleUploadedFile(input.files[0]);
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    const droppedFile = event.dataTransfer.files[0];
    fileName.textContent = droppedFile?.name || "Belum ada file dipilih";
    if (droppedFile) {
      handleUploadedFile(droppedFile);
    }
  });

  reset.addEventListener("click", () => {
    input.value = "";
    fileName.textContent = "Belum ada file dipilih";
    uploadedRows = [];
    activeReviewData = [];
    activeReviewNameFilter = "Semua Staff";
    activeAttentionItems = [
      {
        id: "empty-state",
        rowId: null,
        name: "Belum ada file",
        note: "Upload file absensi untuk melihat data yang perlu diperhatikan.",
        type: "info",
      },
    ];
    activeSalaryData = [];
    activeStaffData = [];
    renderReview();
    renderAttention();
    renderStaff();
    renderStaffFilter();
    renderExport();
    showToast("Pilihan file sudah direset.");
  });
}

function initWorkRules() {
  renderWorkRulesRows();
  const applyButton = document.getElementById("applyWorkRules");
  if (!applyButton) return;

  applyButton.addEventListener("click", () => {
    activeWorkRules = readWorkRulesFromForm();

    if (uploadedRows.length) {
      rebuildFromUploadedRows();
      renderSchedule();
      showToast("Acuan waktu kerja diterapkan. Data upload diproses ulang dengan aturan terbaru.");
      return;
    }

    renderSchedule();
    showToast("Acuan waktu kerja tersimpan. Upload file untuk mulai memproses data.");
  });
}

function readWorkRulesFromForm() {
  return workRuleGroups.reduce((rules, group) => {
    rules[group] = {
      shift1In: document.querySelector(`[data-rule="${group}-shift1In"]`)?.value || "",
      shift1Out: document.querySelector(`[data-rule="${group}-shift1Out"]`)?.value || "",
      shift2In: document.querySelector(`[data-rule="${group}-shift2In"]`)?.value || "",
      shift2Out: document.querySelector(`[data-rule="${group}-shift2Out"]`)?.value || "",
      tolerance: Number(document.querySelector(`[data-rule="${group}-tolerance"]`)?.value || 10),
      active: Boolean(
        document.querySelector(`[data-rule="${group}-shift1In"]`)?.value ||
          document.querySelector(`[data-rule="${group}-shift2In"]`)?.value,
      ),
    };
    return rules;
  }, {});
}

function renderWorkRulesRows() {
  const container = document.getElementById("workRulesRows");
  if (!container) return;

  container.innerHTML = workRuleGroups
    .map((group) => {
      const rule = activeWorkRules[group];
      return `
        <div class="work-rules-row">
          <span class="work-rules-day">${group}</span>
          <input data-rule="${group}-shift1In" type="time" value="${rule.shift1In}" />
          <input data-rule="${group}-shift1Out" type="time" value="${rule.shift1Out}" />
          <input data-rule="${group}-shift2In" type="time" value="${rule.shift2In}" />
          <input data-rule="${group}-shift2Out" type="time" value="${rule.shift2Out}" />
          <input data-rule="${group}-tolerance" type="number" min="0" max="120" value="${rule.tolerance}" />
        </div>
      `;
    })
    .join("");
}

function detectDelimiter(line) {
  const delimiters = [",", ";", "\t"];
  return delimiters
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseCsvLine(line, delimiter = ",") {
  const cells = [];
  let value = "";
  let isQuoted = false;

  for (const char of line) {
    if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === delimiter && !isQuoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  cells.push(value.trim());
  return cells;
}

async function handleUploadedFile(file) {
  try {
    const rows = await readUploadedRows(file);
    loadRows(rows, file.name);
  } catch (error) {
    showToast(error.message || "File belum bisa diproses.");
  }
}

async function readUploadedRows(file) {
  if (/\.(csv|txt|tsv)$/i.test(file.name)) {
    return parseTableText(await file.text());
  }

  if (/\.(xls|xlsx|xlsm)$/i.test(file.name)) {
    if (!window.XLSX) {
      throw new Error("Parser Excel belum termuat. Refresh halaman lalu coba lagi.");
    }

    const workbook = XLSX.read(await file.arrayBuffer(), {
      cellDates: true,
      type: "array",
    });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false,
    });

    return parseMatrixRows(matrix);
  }

  throw new Error("Format belum didukung. Gunakan .xls, .xlsx, .csv, .tsv, atau .txt.");
}

function loadRows(parsedRows, sourceName) {
  if (!parsedRows.length) {
    showToast("File belum terbaca. Pastikan ada kolom Nama dan Waktu/Jam.");
    return;
  }

  uploadedRows = parsedRows;
  activeWorkRules = readWorkRulesFromForm();
  activeReviewData = convertUploadedRows(uploadedRows);
  activeReviewNameFilter = "Semua Staff";
  activeAttentionItems = buildAttentionFromUpload(activeReviewData);
  activeStaffData = buildStaffFromReview(activeReviewData);
  activeSalaryData = buildSalaryFromReview(activeReviewData);
  renderReview();
  renderAttention();
  renderStaff();
  renderReviewNameFilter();
  renderStaffFilter();
  renderBonusPreview();
  renderExport();
  showToast(`${parsedRows.length} baris dari ${sourceName} berhasil diproses.`);
}

function rebuildFromUploadedRows() {
  activeReviewData = convertUploadedRows(uploadedRows);
  activeReviewNameFilter = "Semua Staff";
  activeAttentionItems = buildAttentionFromUpload(activeReviewData);
  activeStaffData = buildStaffFromReview(activeReviewData);
  activeSalaryData = buildSalaryFromReview(activeReviewData);
  renderReview();
  renderAttention();
  renderStaff();
  renderReviewNameFilter();
  renderStaffFilter();
  renderBonusPreview();
  renderExport();
}

function parseTableText(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const [headerLine, ...dataLines] = lines;
  const delimiter = detectDelimiter(headerLine);
  return parseMatrixRows([parseCsvLine(headerLine, delimiter), ...dataLines.map((line) => parseCsvLine(line, delimiter))]);
}

function parseMatrixRows(matrix) {
  const normalizedRows = matrix
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some(Boolean));

  const headerRowIndex = normalizedRows.findIndex((row) => {
    const joined = row.join(" ").toLowerCase();
    return /nama|name|staff|karyawan/.test(joined) && /waktu|time|tanggal|jam/.test(joined);
  });

  if (headerRowIndex < 0) return [];

  const headers = normalizedRows[headerRowIndex].map((header) => header.toLowerCase());
  const dataRows = normalizedRows.slice(headerRowIndex + 1);
  const findIndex = (keywords) => headers.findIndex((header) => keywords.some((keyword) => header.includes(keyword)));
  const nameIndex = findIndex(["nama", "name", "staff", "karyawan"]);
  const dateIndex = findIndex(["tanggal", "date"]);
  const timeIndex = findIndex(["waktu", "time", "jam"]);
  const statusIndex = findIndex(["status", "scan", "tipe", "masuk", "keluar"]);
  const noteIndex = findIndex(["pengecualian", "exception", "catatan", "note"]);

  if (nameIndex < 0 || (dateIndex < 0 && timeIndex < 0)) return [];

  return dataRows
    .map((cells) => {
      const dateValue = dateIndex >= 0 ? cells[dateIndex] : "";
      const timeValue = timeIndex >= 0 ? cells[timeIndex] : "";
      return {
        name: cells[nameIndex] || "-",
        time: mergeDateTime(dateValue, timeValue),
        status: statusIndex >= 0 ? cells[statusIndex] || "-" : "-",
        note: noteIndex >= 0 ? cells[noteIndex] || "-" : "-",
      };
    })
    .filter((row) => row.name !== "-" && row.time !== "-");
}

function mergeDateTime(dateValue, timeValue) {
  const date = String(dateValue || "").trim();
  const time = String(timeValue || "").trim();

  if (!date && !time) return "-";
  if (!date) return time;
  if (!time || date.includes(time)) return date;
  return `${date} ${time}`.trim();
}

function buildSalaryFromReview(rows) {
  const summary = rows.reduce((result, row) => {
    result[row.name] ||= { workday: 0, overtime: 0 };
    result[row.name].workday += isPayrollWorkday(row) ? 1 : 0;
    result[row.name].overtime += row.overtime;
    return result;
  }, {});
  const targetShares = calculateTargetBonusShares(summary);

  return Object.entries(summary).map(([name, value]) => {
    const staff = activeStaffData.find(([staffName]) => staffName === name);
    const monthlyBase = staff?.[1] || 0;
    const paidDays = value.workday + value.overtime;
    const base = calculateProratedBase(monthlyBase, paidDays);
    const mealPerDay = staff?.[2] || 15000;
    const extra = staff?.[3] || 0;
    const debt = staff?.[4] || 0;
    const meal = paidDays * mealPerDay;
    return [name, value.workday, value.overtime, base, meal, targetShares[name] || 0, extra, debt];
  });
}

function buildStaffFromReview(rows) {
  const names = [...new Set(rows.map((row) => row.name).filter(Boolean))];
  return names.map((name) => activeStaffData.find(([staffName]) => staffName === name) || [name, 0, 15000, 0, 0]);
}

function isPayrollWorkday(row) {
  if (!row || row.status === "Tidak Absen") return false;
  return Boolean((row.in && row.in !== "-") || (row.out && row.out !== "-") || (row.scan && row.scan !== "-"));
}

function calculateSalaryTotal(values) {
  return (values.base || 0) + (values.meal || 0) + (values.targetBonus || 0) + (values.bonus || 0) - (values.debt || 0);
}

function calculateProratedBase(monthlyBase, workday) {
  return Math.round((Number(monthlyBase) || 0) / 30 * (Number(workday) || 0));
}

function renderManualPayrollPreview() {
  const preview = document.getElementById("manualPayrollPreview");
  if (!preview) return;

  if (!manualPayrollAddition.amount && !manualPayrollAddition.note) {
    preview.textContent = "Tambahan manual belum diisi.";
    return;
  }

  const note = manualPayrollAddition.note || "Tanpa keterangan";
  preview.textContent = `Tambahan manual: ${currency.format(manualPayrollAddition.amount)} - ${note}`;
}

function syncManualPayrollAdditionFromForm() {
  const amountInput = document.getElementById("manualPayrollAmount");
  const noteInput = document.getElementById("manualPayrollNote");
  manualPayrollAddition = {
    amount: parseCurrencyInput(amountInput?.value || "0"),
    note: (noteInput?.value || "").trim(),
  };
}

function calculateTargetBonusShares(summary) {
  const names = Object.keys(summary);
  if (!names.length || !targetBonusConfig.pool) return {};

  const totalAttendance = names.reduce((sum, name) => sum + (summary[name]?.workday || 0), 0);
  const equalShare = Math.round(targetBonusConfig.pool / names.length);

  return names.reduce((shares, name) => {
    const weight = targetBonusConfig.mode === "equal"
      ? 1 / names.length
      : totalAttendance
        ? (summary[name]?.workday || 0) / totalAttendance
        : 1 / names.length;
    shares[name] = targetBonusConfig.mode === "equal" ? equalShare : Math.round(targetBonusConfig.pool * weight);
    return shares;
  }, {});
}

function renderStaffFilter() {
  const filter = document.getElementById("staffFilter");
  if (!filter) return;

  const names = [...new Set(activeReviewData.map((row) => row.name))];
  filter.innerHTML = [
    `<option>Semua Staff</option>`,
    ...names.map((name) => `<option>${name}</option>`),
  ].join("");
}

function renderReviewNameFilter() {
  const filter = document.getElementById("reviewNameFilter");
  if (!filter) return;

  const names = [...new Set(activeReviewData.map((row) => row.name))];
  filter.innerHTML = [
    `<option>Semua Staff</option>`,
    ...names.map((name) => `<option>${name}</option>`),
  ].join("");
  filter.value = names.includes(activeReviewNameFilter) ? activeReviewNameFilter : "Semua Staff";
}

function convertUploadedRows(rows) {
  const grouped = rows.reduce((groups, row) => {
    const date = row.time.split(" ")[0] || "-";
    const key = `${row.name}-${date}`;
    groups[key] ||= { name: row.name, date, scans: [] };
    groups[key].scans.push(row);
    return groups;
  }, {});

  return Object.values(grouped).map((group, index) => {
    const times = group.scans
      .map((scan) => scan.time.split(" ").pop())
      .filter(Boolean)
      .sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    const hasIn = group.scans.some((scan) => /masuk|in/i.test(scan.status));
    const hasOut = group.scans.some((scan) => /keluar|pulang|out/i.test(scan.status));
    const complete = hasIn && hasOut && times.length >= 2;
    const inferredShift = inferShiftFromTimes(times, group.date);
    const doubleShift = complete && inferredShift === "Shift 1 + Shift 2";
    const issue = analyzeIssue(group, { hasIn, hasOut, times, complete });
    const attendanceStatus = complete ? getAttendanceStatus(times[0], inferredShift, group.date) : "Perlu Review";

    return {
      id: `row-${index + 1}`,
      name: group.name,
      date: group.date,
      scan: times.join(", "),
      in: times[0] || "-",
      out: times[times.length - 1] || "-",
      shift: inferredShift,
      workday: complete ? (doubleShift ? 2 : 1) : 0,
      overtime: doubleShift ? 1 : 0,
      status: attendanceStatus,
      issue: issue.condition,
      recommendation: issue.recommendation,
      suggestion: issue.suggestion,
    };
  });
}

function analyzeIssue(group, context) {
  const { hasIn, hasOut, times, complete } = context;
  const inCount = group.scans.filter((scan) => /masuk|in/i.test(scan.status)).length;
  const outCount = group.scans.filter((scan) => /keluar|pulang|out/i.test(scan.status)).length;
  const statusText = group.scans.map((scan) => scan.status).join(", ");
  const uniqueTimes = [...new Set(times)];
  const firstTime = times[0] || "-";
  const lastTime = times.at(-1) || firstTime;

  if (complete) {
    return {
      condition: "",
      recommendation: "",
      suggestion: null,
    };
  }
  if (inCount > 1 && outCount === 0) {
    const possiblePair = inferPairFromRepeatedStatus(times, group.date);
    if (possiblePair) {
      const suggestion = buildConservativeSuggestion("ambiguous-pair", {
        in: possiblePair.in,
        out: possiblePair.out,
        date: group.date,
      });
      return {
        condition: `Terdapat ${inCount} scan masuk (${times.join(", ")}), tetapi jam pertama dan terakhir membentuk pola masuk-pulang ${suggestion.shift}.`,
        recommendation: `Gunakan ${suggestion.in} sebagai jam masuk dan ${suggestion.out} sebagai jam pulang karena keduanya ada di file. Jika jam masuk lebih awal dari acuan, tetap dihitung hadir tepat waktu.`,
        suggestion,
      };
    }

    const suggestion = buildConservativeSuggestion("missing-out", { in: firstTime, date: group.date });
    const isSameTime = uniqueTimes.length === 1;
    return {
      condition: isSameTime
        ? `Terdapat ${inCount} scan masuk di jam yang sama (${firstTime}). Ini kemungkinan scan dobel, bukan 2 shift.`
        : `Terdapat ${inCount} scan masuk tanpa scan pulang (${times.join(", ")}).`,
      recommendation: `Catat hadir 1 hari dengan keterangan Tidak Scan Pulang. Jam pulang tidak diisi otomatis dan tidak mengurangi hari kerja.`,
      suggestion,
    };
  }
  if (outCount > 1 && inCount === 0) {
    const possiblePair = inferPairFromRepeatedStatus(times, group.date);
    if (possiblePair) {
      const suggestion = buildConservativeSuggestion("ambiguous-pair", {
        in: possiblePair.in,
        out: possiblePair.out,
        date: group.date,
      });
      return {
        condition: `Terdapat ${outCount} scan keluar (${times.join(", ")}), tetapi jam pertama dan terakhir membentuk pola masuk-pulang ${suggestion.shift}.`,
        recommendation: `Gunakan ${suggestion.in} sebagai jam masuk dan ${suggestion.out} sebagai jam pulang karena keduanya ada di file. Jika jam masuk lebih awal dari acuan, tetap dihitung hadir tepat waktu.`,
        suggestion,
      };
    }

    const suggestion = buildConservativeSuggestion("missing-in", { out: lastTime, date: group.date });
    return {
      condition: `Terdapat ${outCount} scan keluar tanpa scan masuk (${times.join(", ")}).`,
      recommendation: `Catat hadir 1 hari dengan status Terlambat, Tidak Scan Masuk karena tidak ada bukti staff datang tepat waktu.`,
      suggestion,
    };
  }
  if (!hasIn && hasOut) {
    const suggestion = buildConservativeSuggestion("missing-in", { out: lastTime, date: group.date });
    return {
      condition: `Semua scan terbaca sebagai keluar/pulang (${statusText}). Kemungkinan scan masuk tidak tercatat atau status jam pertama tertukar.`,
      recommendation: `Catat hadir 1 hari dengan status Terlambat, Tidak Scan Masuk sampai ada bukti koreksi. Jam masuk tidak boleh diperkirakan otomatis.`,
      suggestion,
    };
  }
  if (hasIn && !hasOut) {
    const suggestion = buildConservativeSuggestion("missing-out", { in: firstTime, date: group.date });
    return {
      condition: `Ada scan masuk (${firstTime}), tetapi tidak ada scan pulang. Kemungkinan staff lupa scan pulang.`,
      recommendation: `Catat hadir 1 hari dengan keterangan Tidak Scan Pulang. Jam pulang tidak diisi otomatis dan tidak mengurangi hari kerja.`,
      suggestion,
    };
  }
  if (times.length === 1) {
    const suggestion = buildConservativeSuggestion("single-scan", { in: firstTime, date: group.date });
    return {
      condition: `Hanya ada 1 jam scan (${firstTime}). Belum cukup untuk memastikan masuk dan pulang.`,
      recommendation: `Tandai Perlu Review. Pilih Edit Manual jika ada bukti pendukung; sistem tidak mengisi jam pasangannya otomatis.`,
      suggestion,
    };
  }
  if (times.length >= 2) {
    const suggestion = buildConservativeSuggestion("ambiguous-pair", { in: times[0], out: times.at(-1), date: group.date });
    return {
      condition: `Ada ${times.length} jam scan (${times.join(", ")}), tetapi status masuk/pulang tidak jelas.`,
      recommendation: `Gunakan jam pertama sebagai masuk dan jam terakhir sebagai pulang hanya karena keduanya ada di file. Jika status mesin tertukar, gunakan Edit Manual.`,
      suggestion,
    };
  }
  return {
    condition: "Tidak ada jam scan yang bisa dibaca untuk tanggal ini.",
    recommendation: "Catat sebagai Tidak Absen atau Edit Manual hanya jika ada bukti pendukung.",
    suggestion: null,
  };
}

function buildConservativeSuggestion(type, values) {
  const shift = inferShiftFromTimes([values.in, values.out].filter(Boolean), values.date);
  const completePair = Boolean(values.in && values.out);
  const hasAnyScan = Boolean(values.in || values.out);
  const completeStatus = completePair ? getAttendanceStatus(values.in, shift, values.date) : "Perlu Review";

  return {
    in: values.in || "-",
    out: values.out || "-",
    shift,
    workday: completePair ? (shift === "Shift 1 + Shift 2" ? 2 : 1) : hasAnyScan ? 1 : 0,
    overtime: completePair && shift === "Shift 1 + Shift 2" ? 1 : 0,
    status:
      type === "missing-in"
        ? "Terlambat, Tidak Scan Masuk"
        : type === "missing-out"
          ? getMissingOutStatus(values.in, shift, values.date)
          : type === "ambiguous-pair"
            ? completeStatus
            : "Perlu Review",
  };
}

function getMissingOutStatus(inTime, shift, date) {
  return getAttendanceStatus(inTime, shift, date) === "Terlambat"
    ? "Terlambat, Tidak Scan Pulang"
    : "Tidak Scan Pulang";
}

function getAttendanceStatus(inTime, shift, date) {
  if (!inTime || inTime === "-") return "Terlambat, Tidak Scan Masuk";
  const bounds = getShiftBounds(shift, date);
  const scheduledIn = parseTimeToMinutes(bounds.in);
  const actualIn = parseTimeToMinutes(inTime);
  if (scheduledIn < 0 || actualIn < 0) return "Aman";
  const tolerance = getRuleForDate(date).tolerance;
  return actualIn > scheduledIn + tolerance ? "Terlambat" : "Aman";
}

function inferPairFromRepeatedStatus(times, date) {
  const uniqueTimes = [...new Set(times)];
  if (uniqueTimes.length < 2) return null;

  const first = uniqueTimes[0];
  const last = uniqueTimes.at(-1);
  const match = findBestShiftMatch(first, last, date);
  const tolerance = Math.max(getRuleForDate(date).tolerance, 15);

  if (match.shift !== "Shift terdeteksi" && match.score <= tolerance * 6) {
    return { in: first, out: last, shift: match.shift };
  }

  return null;
}

function detectShiftFromTime(minutes, kind, date) {
  if (minutes < 0) return "Shift terdeteksi";
  const rule = getRuleForDate(date);
  const shift1Out = parseTimeToMinutes(rule.shift1Out);
  const shift2In = parseTimeToMinutes(rule.shift2In);
  const shift2Out = normalizeEndMinutes(parseTimeToMinutes(rule.shift2In), parseTimeToMinutes(rule.shift2Out));
  const comparableMinutes = kind === "out" && minutes < shift2In ? minutes + 1440 : minutes;
  const tolerance = rule.tolerance;

  if (kind === "out") {
    return comparableMinutes <= shift1Out + tolerance ? "Shift 1" : "Shift 2";
  }
  return comparableMinutes < shift2In - tolerance || comparableMinutes > shift2Out + tolerance ? "Shift 1" : "Shift 2";
}

function getShiftBounds(shift, date) {
  const rule = getRuleForDate(date);
  if (shift === "Shift 1") return { in: rule.shift1In, out: rule.shift1Out };
  if (shift === "Shift 2") return { in: rule.shift2In, out: rule.shift2Out };
  if (shift === "Shift 1 + Shift 2") return { in: rule.shift1In, out: rule.shift2Out };
  return { in: rule.shift1In || rule.shift2In || "-", out: rule.shift2Out || rule.shift1Out || "-" };
}

function getRuleForDate(date) {
  const dayName = getDayNameFromDate(date);
  const group = dayName === "Jumat" ? "Jumat" : "Hari Biasa";
  const fallback = activeWorkRules["Hari Biasa"] || Object.values(activeWorkRules).find((rule) => rule.active);
  return activeWorkRules[group]?.active ? activeWorkRules[group] : fallback;
}

function getDayNameFromDate(value) {
  const text = String(value || "").trim();
  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    return dayNames[new Date(year, month, day).getDay()];
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "Senin" : dayNames[parsed.getDay()];
}

function inferShiftFromTimes(times, date) {
  if (!times.length) return "Shift terdeteksi";
  if (times.length === 1) return detectShiftFromTime(parseTimeToMinutes(times[0]), "in", date);

  const match = findBestShiftMatch(times[0], times.at(-1), date);
  return match.shift;
}

function findBestShiftMatch(firstTime, lastTime, date) {
  const rule = getRuleForDate(date);
  const first = parseTimeToMinutes(firstTime);
  let last = parseTimeToMinutes(lastTime);
  if (first < 0 || last < 0) return { shift: "Shift terdeteksi", score: Number.MAX_SAFE_INTEGER };

  const shift1In = parseTimeToMinutes(rule.shift1In);
  const shift1Out = parseTimeToMinutes(rule.shift1Out);
  const shift2In = parseTimeToMinutes(rule.shift2In);
  const shift2Out = normalizeEndMinutes(shift2In, parseTimeToMinutes(rule.shift2Out));
  const tolerance = rule.tolerance;
  if (last < first) last += 1440;

  if (first <= shift1In + tolerance && last >= shift2Out - tolerance) {
    return { shift: "Shift 1 + Shift 2", score: 0 };
  }

  const candidates = [
    { shift: "Shift 1", in: shift1In, out: shift1Out },
    { shift: "Shift 2", in: shift2In, out: shift2Out },
    { shift: "Shift 1 + Shift 2", in: shift1In, out: shift2Out },
  ].map((candidate) => ({
    shift: candidate.shift,
    score: scoreShiftPair(first, last, candidate.in, candidate.out, tolerance),
  }));

  return candidates.sort((a, b) => a.score - b.score)[0] || { shift: "Shift terdeteksi", score: Number.MAX_SAFE_INTEGER };
}

function scoreShiftPair(first, last, scheduledIn, scheduledOut, tolerance) {
  const earlyArrivalPenalty = Math.max(0, first - scheduledIn - tolerance);
  const earlyLeavePenalty = Math.max(0, scheduledOut - last - tolerance);
  const lateLeavePenalty = Math.max(0, last - scheduledOut - 90);
  return earlyArrivalPenalty + earlyLeavePenalty + lateLeavePenalty;
}

function parseTimeToMinutes(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeEndMinutes(startMinutes, endMinutes) {
  if (startMinutes < 0 || endMinutes < 0) return endMinutes;
  return endMinutes <= startMinutes ? endMinutes + 1440 : endMinutes;
}

function buildAttentionFromUpload(rows) {
  const items = rows
    .filter((row) => !["Aman", "Terlambat"].includes(row.status))
    .map((row) => ({
      id: `attention-${row.id}`,
      rowId: row.id,
      name: row.name,
      note: `${row.date}: ${row.issue || "Scan masuk/pulang belum lengkap."}`,
      recommendation: row.recommendation,
      type: "review",
    }));

  return items.length
    ? items
    : [
        {
          id: "all-clear",
          rowId: null,
          name: "Sistem",
          note: "Tidak ada data bermasalah dari file yang diupload.",
          type: "info",
        },
      ];
}

function downloadReport(type) {
  syncManualPayrollAdditionFromForm();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const filteredReview = getFilteredReviewData();
  const filteredSalary = getFilteredSalaryData();
  const selectedMonth = document.getElementById("monthFilter")?.value || "April 2026";
  const isAttendance = type === "attendance-jpg";
  const isSalary = type === "salary-jpg";
  const format = type.endsWith("jpg") ? "image/jpeg" : "image/png";
  const extension = type.endsWith("jpg") ? "jpg" : "png";
  const title = isAttendance
    ? "Laporan Kehadiran"
    : isSalary
      ? "Rekap Gaji"
      : "Laporan Kehadiran & Rekap Gaji";

  const reportTitle = isAttendance
    ? "Laporan Kehadiran Bulanan"
    : isSalary
      ? "Laporan Payroll Bulanan"
      : "Laporan Payroll Bulanan";
  const totals = filteredSalary.reduce(
    (summary, [, workday, overtime, base, meal, targetBonus, bonus, debt]) => {
      summary.staff += 1;
      summary.workday += workday;
      summary.overtime += overtime;
      summary.targetBonus += targetBonus;
      summary.bonus += bonus;
      summary.gross += base + meal + targetBonus + bonus;
      summary.debt += debt;
      return summary;
    },
    { staff: 0, workday: 0, overtime: 0, targetBonus: 0, bonus: 0, gross: 0, debt: 0 },
  );
  totals.gross += manualPayrollAddition.amount;
  totals.salary = totals.gross - totals.debt;
  const truncate = (value, max = 18) => {
    const text = String(value ?? "-");
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
  };
  const roundRect = (x, y, width, height, radius = 22) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };
  const drawCard = (x, y, width, height, radius = 22) => {
    ctx.save();
    ctx.shadowColor = "rgba(148, 24, 84, 0.09)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    roundRect(x, y, width, height, radius);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#f2dbe7";
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  const makePurpleGradient = (x, y, width, height) => {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "#7c3aed");
    gradient.addColorStop(0.55, "#6d28d9");
    gradient.addColorStop(1, "#4c1d95");
    return gradient;
  };
  const drawSectionHeader = (x, y, width, titleText) => {
    roundRect(x + 18, y + 18, width - 36, 44, 16);
    ctx.fillStyle = "#fbf1ff";
    ctx.fill();
    ctx.fillStyle = "#6d28d9";
    ctx.font = "800 18px Inter, Arial, sans-serif";
    ctx.fillText(titleText, x + 38, y + 47);
  };
  const statusColor = (status) => {
    if (status === "Aman") return "#059669";
    if (status === "Terlambat") return "#b45309";
    if (status.includes("Tidak Scan Pulang") || status.includes("Tidak Scan Masuk")) return "#d97706";
    return "#dc2626";
  };
  const drawTable = ({ title: tableTitle, x, y, width, columns, rows, rowHeight = 34 }) => {
    const tableHeight = 82 + 38 + rows.length * rowHeight + 18;
    drawCard(x, y, width, tableHeight, 24);
    drawSectionHeader(x, y, width, tableTitle);
    const top = y + 76;
    roundRect(x + 14, top, width - 28, 38, 10);
    ctx.fillStyle = "#f7f9fc";
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.font = "800 12px Inter, Arial, sans-serif";
    columns.forEach((column) => ctx.fillText(column.label, x + 22 + column.left, top + 25));
    rows.forEach((row, index) => {
      const rowY = top + 38 + index * rowHeight;
      ctx.fillStyle = index % 2 ? "#fcfdff" : "#ffffff";
      ctx.fillRect(x + 14, rowY, width - 28, rowHeight);
      ctx.fillStyle = "#111827";
      ctx.font = "600 12px Inter, Arial, sans-serif";
      columns.forEach((column) => {
        ctx.fillStyle = column.key === "status" ? statusColor(row[column.key]) : "#111827";
        ctx.fillText(truncate(row[column.key], column.max), x + 22 + column.left, rowY + 24);
      });
    });
    return tableHeight;
  };

  const attendanceRows = filteredReview.map((row) => ({
    name: row.name,
    date: row.date,
    in: row.in,
    out: row.out,
    shift: row.shift,
    status: row.status,
  }));
  const attendanceSummary = {
    workday: filteredSalary.reduce((sum, [, workday]) => sum + workday, 0),
    overtime: filteredSalary.reduce((sum, [, , overtime]) => sum + overtime, 0),
    offday: Math.max(0, 30 - filteredReview.filter((row) => isPayrollWorkday(row)).length),
    late: filteredReview.filter((row) => row.status.includes("Terlambat")).length,
  };
  const receiptRows = filteredSalary.map(([name, workday, overtime, base, meal, targetBonus, bonus, debt]) => {
    const items = [
      ["Gaji pokok", base],
      ["Konsumsi", meal],
      ["Bonus target", targetBonus],
      ["Bonus harian", bonus],
      [manualPayrollAddition.note || "Insentif Stock Manager", manualPayrollAddition.amount],
    ].filter(([, amount]) => amount);
    const subtotal = items.reduce((sum, [, amount]) => sum + amount, 0);
    const total = subtotal - debt;
    return {
      name,
      workday,
      overtime,
      debt,
      items,
      subtotal,
      total,
      paidDays: workday + overtime,
    };
  });
  const attendanceHeightEstimate = 72 + 38 + attendanceRows.length * 34 + 18;
  const summaryHeight = 118;
  const receiptHeightEstimate = 74 + receiptRows.reduce((height, row) => height + (row.items.length + 3) * 32 + 18, 0) + 84;
  const canvasHeight = 250 + attendanceHeightEstimate + 24 + summaryHeight + 34 + receiptHeightEstimate + 60;

  const exportScale = 4;
  const canvasWidth = 780;
  const canvasLogicalHeight = Math.max(canvasHeight, 900);
  canvas.width = canvasWidth * exportScale;
  canvas.height = canvasLogicalHeight * exportScale;
  ctx.scale(exportScale, exportScale);
  ctx.fillStyle = "#fae6f0";
  ctx.fillRect(0, 0, canvasWidth, canvasLogicalHeight);
  roundRect(24, 30, 720, 164, 30);
  ctx.fillStyle = makePurpleGradient(24, 30, 720, 164);
  ctx.fill();
  roundRect(46, 52, 34, 34, 12);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 34px Inter, Arial, sans-serif";
  ctx.fillText(reportTitle, 96, 80);
  ctx.font = "600 18px Inter, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.fillText(`${selectedMonth} | Smart Attendance Converter`, 48, 122);
  roundRect(48, 138, 650, 34, 12);
  ctx.fillStyle = "rgba(76, 29, 149, 0.38)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 14px Inter, Arial, sans-serif";
  const staffNames = filteredSalary.map(([name]) => name).filter(Boolean);
  const staffLabel = staffNames.length === 1 ? staffNames[0] : `${staffNames.length || 0} staff`;
  ctx.fillText(`Staff ${staffLabel}`, 70, 160);

  const attendanceHeight = drawTable({
    title: isSalary ? "Preview Kehadiran Pendukung" : "Laporan Kehadiran",
    x: 34,
    y: 220,
    width: 700,
    columns: [
      { key: "name", label: "NAMA", left: 18, max: 18 },
      { key: "date", label: "TANGGAL", left: 110, max: 12 },
      { key: "in", label: "MASUK", left: 230, max: 8 },
      { key: "out", label: "PULANG", left: 326, max: 8 },
      { key: "shift", label: "SHIFT", left: 432, max: 18 },
      { key: "status", label: "STATUS", left: 560, max: 32 },
    ],
    rows: isSalary ? attendanceRows : attendanceRows,
  });

  const summaryY = 220 + attendanceHeight + 22;
  drawCard(34, summaryY, 700, summaryHeight, 24);
  [
    ["Hari kerja", attendanceSummary.workday, "#ecfdf5", "#059669"],
    ["Lembur", attendanceSummary.overtime, "#eff6ff", "#2563eb"],
    ["Libur", attendanceSummary.offday, "#fefce8", "#ca8a04"],
    ["Terlambat", attendanceSummary.late, "#fff1f2", "#e11d48"],
  ].forEach(([label, value, bgColor, accentColor], index) => {
    const boxX = 54 + index * 166;
    roundRect(boxX, summaryY + 18, 146, 82, 18);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = accentColor;
    ctx.font = "700 11px Inter, Arial, sans-serif";
    ctx.fillText(label.toUpperCase(), boxX + 73, summaryY + 42);
    ctx.fillStyle = "#111827";
    ctx.font = "800 26px Inter, Arial, sans-serif";
    ctx.fillText(String(value), boxX + 73, summaryY + 78);
    ctx.textAlign = "left";
  });

  const receiptY = summaryY + summaryHeight + 34;
  drawCard(34, receiptY, 700, receiptHeightEstimate, 24);
  drawSectionHeader(34, receiptY, 700, "Rekap Gaji");

  let currentY = receiptY + 78;
  receiptRows.forEach((row) => {
    row.items.forEach(([label, amount]) => {
      ctx.fillStyle = "#334155";
      ctx.font = "600 15px Inter, Arial, sans-serif";
      ctx.fillText(label, 70, currentY);
      ctx.fillStyle = amount < 0 ? "#dc2626" : "#111827";
      ctx.font = "700 15px Inter, Arial, sans-serif";
      ctx.fillText(currency.format(amount), 540, currentY);
      currentY += 32;
    });

    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(70, currentY - 12);
    ctx.lineTo(704, currentY - 12);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = "800 17px Inter, Arial, sans-serif";
    ctx.fillText("Subtotal", 70, currentY + 12);
    ctx.fillText(currency.format(row.subtotal), 540, currentY + 12);
    currentY += 38;

    if (row.debt) {
      ctx.fillStyle = "#334155";
      ctx.font = "600 15px Inter, Arial, sans-serif";
      ctx.fillText("Bon / potongan", 70, currentY);
      ctx.fillStyle = "#dc2626";
      ctx.font = "700 15px Inter, Arial, sans-serif";
      ctx.fillText(`-${currency.format(row.debt)}`, 540, currentY);
      currentY += 32;
    }
  });

  roundRect(56, currentY, 640, 58, 10);
  ctx.fillStyle = makePurpleGradient(56, currentY, 640, 58);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 20px Inter, Arial, sans-serif";
  ctx.fillText("Total Payroll", 78, currentY + 37);
  ctx.fillText(currency.format(totals.salary), 540, currentY + 37);

  const link = document.createElement("a");
  link.download = `${type}-${selectedMonth.toLowerCase().replaceAll(" ", "-")}.${extension}`;
  link.href = canvas.toDataURL(format, 0.92);
  link.click();
  showToast(`${title} berhasil dibuat sebagai ${extension.toUpperCase()}.`);
}

function initActions() {
  document.addEventListener("click", (event) => {
    const reviewButton = event.target.closest("[data-review-action]");
    const cancelManualButton = event.target.closest("[data-manual-cancel]");
    const attendanceEditButton = event.target.closest("[data-attendance-edit]");
    const attendanceCancelButton = event.target.closest("[data-export-cancel]");
    const staffButton = event.target.closest("[data-staff-action]");
    const actionButton = event.target.closest("[data-action]");
    const exportButton = event.target.closest("[data-export]");

    if (reviewButton) {
      handleReviewAction(reviewButton.dataset.reviewAction, reviewButton.dataset.rowId);
    }

    if (cancelManualButton) {
      closeManualEditor(cancelManualButton.dataset.manualCancel);
    }

    if (attendanceEditButton) {
      editingExportRowId = attendanceEditButton.dataset.attendanceEdit;
      renderExport();
      showToast("Form edit baris laporan dibuka.");
    }

    if (attendanceCancelButton) {
      editingExportRowId = null;
      renderExport();
    }

    if (staffButton) {
      handleStaffAction(staffButton.dataset.staffAction, staffButton.dataset.staff, staffButton);
    }

    if (actionButton?.dataset.action === "add-staff") {
      addStaffRow();
    }

    if (actionButton?.dataset.action === "save-setting") {
      showToast("Setting staff, waktu, dan gaji tersimpan untuk sesi prototype.");
    }

    if (exportButton) {
      downloadReport(exportButton.dataset.export);
    }
  });

  document.getElementById("staffFilter")?.addEventListener("change", () => {
    renderExport();
    showToast("Preview export diperbarui berdasarkan staff terpilih.");
  });

  document.getElementById("monthFilter")?.addEventListener("change", () => {
    renderExport();
    showToast("Preview export diperbarui berdasarkan bulan terpilih.");
  });

  document.getElementById("reviewNameFilter")?.addEventListener("change", (event) => {
    activeReviewNameFilter = event.target.value;
    renderReview();
    showToast(`Tabel Review difilter: ${activeReviewNameFilter}.`);
  });

  ["manualPayrollAmount", "manualPayrollNote"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      syncManualPayrollAdditionFromForm();
      renderManualPayrollPreview();
      renderExport();
      showToast("Tambahan manual payroll diperbarui.");
    });
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-manual-form]");
    const exportForm = event.target.closest("[data-export-form]");
    if (!form && !exportForm) return;

    event.preventDefault();
    if (form) {
      saveManualEdit(form.dataset.manualForm, new FormData(form));
    } else {
      saveAttendanceEdit(exportForm.dataset.exportForm, new FormData(exportForm));
    }
  });

  document.addEventListener("change", (event) => {
    const form = event.target.closest("[data-manual-form], [data-export-form]");
    if (!form) return;

    updateManualAutoResult(form);
    toggleScanInput(form, "in");
    toggleScanInput(form, "out");
  });

  document.getElementById("applyTargetBonus")?.addEventListener("click", () => {
    targetBonusConfig = {
      pool: parseCurrencyInput(document.getElementById("targetBonusPool")?.value || "0"),
      mode: document.getElementById("bonusMode")?.value || "attendance",
    };
    activeSalaryData = buildSalaryFromReview(activeReviewData);
    renderStaff();
    renderBonusPreview();
    renderExport();
    showToast("Bonus capai target ditambahkan ke Rekap Gaji.");
  });

  document.addEventListener("blur", (event) => {
    if (!event.target.classList?.contains("money-input")) return;
    event.target.value = formatCurrencyInput(parseCurrencyInput(event.target.value));
  }, true);

  document.addEventListener("focus", (event) => {
    if (!event.target.classList?.contains("money-input")) return;
    event.target.value = String(parseCurrencyInput(event.target.value) || "");
    event.target.select();
  }, true);
}

function renderBonusPreview() {
  const container = document.getElementById("bonusPreview");
  if (!container) return;

  if (!activeSalaryData.length) {
    container.textContent = "Upload data dan klik Terapkan Bonus untuk melihat pembagian.";
    return;
  }

  container.innerHTML = activeSalaryData
    .map(([name, , , , , targetBonus]) => `<span>${name}: <strong>${currency.format(targetBonus)}</strong></span>`)
    .join("");
}

function handleStaffAction(action, staffName, button) {
  if (action === "edit") {
    editingStaffName = staffName;
    renderStaff();
    showToast(`Mode edit untuk ${staffName} dibuka.`);
    return;
  }

  if (action === "cancel") {
    editingStaffName = null;
    renderStaff();
    return;
  }

  if (action === "save") {
    saveStaffRow(staffName, button.closest("tr"));
    return;
  }

  if (action === "delete") {
    deleteStaffRow(staffName);
  }
}

function addStaffRow() {
  const baseName = `Staff ${activeStaffData.length + 1}`;
  let name = baseName;
  let counter = activeStaffData.length + 1;

  while (activeStaffData.some(([staffName]) => staffName === name)) {
    counter += 1;
    name = `Staff ${counter}`;
  }

  activeStaffData.push([name, 0, 15000, 0, 0]);
  editingStaffName = name;
  activeSalaryData = buildSalaryFromReview(activeReviewData);
  renderStaff();
  renderStaffFilter();
  renderBonusPreview();
  renderExport();
  showToast("Staff baru ditambahkan. Lengkapi datanya lalu klik Simpan.");
}

function saveStaffRow(originalName, rowElement) {
  const readField = (field) => rowElement.querySelector(`[data-staff-field="${field}"]`)?.value || "";
  const nextName = readField("name").trim() || originalName;
  const nextData = [
    nextName,
    parseCurrencyInput(readField("base")),
    parseCurrencyInput(readField("meal")),
    parseCurrencyInput(readField("extra")),
    parseCurrencyInput(readField("debt")),
  ];

  activeStaffData = activeStaffData.map((staff) => (staff[0] === originalName ? nextData : staff));
  activeReviewData = activeReviewData.map((item) => (item.name === originalName ? { ...item, name: nextName } : item));
  activeAttentionItems = activeAttentionItems.map((item) => (item.name === originalName ? { ...item, name: nextName } : item));
  editingStaffName = null;
  activeSalaryData = buildSalaryFromReview(activeReviewData);
  renderStaff();
  renderReview();
  renderAttention();
  renderReviewNameFilter();
  renderStaffFilter();
  renderBonusPreview();
  renderExport();
  showToast(`Data ${nextName} disimpan.`);
}

function deleteStaffRow(staffName) {
  const confirmed = window.confirm(`Hapus ${staffName} dari Data Staff? Data absensi di Review tidak ikut dihapus.`);
  if (!confirmed) return;

  activeStaffData = activeStaffData.filter(([name]) => name !== staffName);
  activeSalaryData = buildSalaryFromReview(activeReviewData);
  renderStaff();
  renderStaffFilter();
  renderBonusPreview();
  renderExport();
  showToast(`${staffName} dihapus dari Data Staff.`);
}

function parseCurrencyInput(value) {
  return Number(String(value || "").replace(/[^\d]/g, "")) || 0;
}

function formatCurrencyInput(value) {
  return currency.format(Number(value) || 0);
}

function handleReviewAction(action, rowId) {
  if (action === "accept") {
    acceptSuggestion(rowId);
    return;
  }

  if (action === "edit") {
    openManualEditor(rowId);
    return;
  }

  if (action === "ignore") {
    ignoreIssue(rowId);
  }
}

function acceptSuggestion(rowId) {
  const row = activeReviewData.find((item) => item.id === rowId);
  if (!row) return;

  if (!row.suggestion) {
    showToast("Item ini belum punya saran otomatis. Gunakan Edit Manual.");
    openManualEditor(rowId);
    return;
  }

  row.in = row.suggestion.in;
  row.out = row.suggestion.out;
  row.shift = row.suggestion.shift;
  row.workday = row.suggestion.workday;
  row.overtime = row.suggestion.overtime;
  row.status = row.suggestion.status;
  removeAttentionItem(rowId);
  refreshDerivedViews();
  showToast(`Saran untuk ${row.name} diterima sebagai ${row.status}.`);
}

function openManualEditor(rowId) {
  activeAttentionItems = activeAttentionItems.map((item) => ({
    ...item,
    isEditing: item.rowId === rowId,
  }));
  renderAttention();
  showToast("Form edit manual dibuka. Isi jam/shift lalu klik Simpan Koreksi.");
}

function closeManualEditor(rowId) {
  activeAttentionItems = activeAttentionItems.map((item) => ({
    ...item,
    isEditing: item.rowId === rowId ? false : item.isEditing,
  }));
  renderAttention();
}

function saveManualEdit(rowId, formData) {
  const row = activeReviewData.find((item) => item.id === rowId);
  if (!row) return;

  applyAttendanceCorrection(row, formData);

  removeAttentionItem(rowId);
  refreshDerivedViews();
  showToast(`Koreksi manual untuk ${row.name} disimpan.`);
}

function saveAttendanceEdit(rowId, formData) {
  const row = activeReviewData.find((item) => item.id === rowId);
  if (!row) return;

  applyAttendanceCorrection(row, formData);
  editingExportRowId = null;
  removeAttentionItem(rowId);
  refreshDerivedViews();
  showToast(`Baris laporan ${row.name} tanggal ${row.date} diperbarui.`);
}

function applyAttendanceCorrection(row, formData) {
  row.in = formData.get("inMode") === "none" ? "-" : formData.get("in") || "-";
  row.out = formData.get("outMode") === "none" ? "-" : formData.get("out") || "-";
  row.shift = formData.get("shift") || "Shift terdeteksi";
  const calculated = calculateWorkResult(row.shift, row.in, row.out, row.date);
  row.workday = calculated.workday;
  row.overtime = calculated.overtime;
  row.status = calculated.status;
}

function calculateWorkResult(shift, inTime, outTime, date = "") {
  const hasIn = inTime && inTime !== "-";
  const hasOut = outTime && outTime !== "-";

  if (!hasIn && !hasOut) {
    return { workday: 0, overtime: 0, status: "Tidak Absen" };
  }

  if (!hasIn) {
    return { workday: 1, overtime: 0, status: "Terlambat, Tidak Scan Masuk" };
  }

  if (!hasOut) {
    return { workday: 1, overtime: 0, status: getMissingOutStatus(inTime, shift, date) };
  }

  if (shift === "Shift 1 + Shift 2") {
    return { workday: 2, overtime: 1, status: getAttendanceStatus(inTime, shift, date) };
  }

  return { workday: 1, overtime: 0, status: getAttendanceStatus(inTime, shift, date) };
}

function updateManualAutoResult(form) {
  const formData = new FormData(form);
  const inTime = formData.get("inMode") === "none" ? "-" : formData.get("in") || "-";
  const outTime = formData.get("outMode") === "none" ? "-" : formData.get("out") || "-";
  const result = calculateWorkResult(formData.get("shift"), inTime, outTime, row.date);
  form.querySelector("[data-auto-workday]").textContent = result.workday;
  form.querySelector("[data-auto-overtime]").textContent = result.overtime;
}

function toggleScanInput(form, type) {
  const mode = form.querySelector(`[name="${type}Mode"]`);
  const input = form.querySelector(`[name="${type}"]`);
  if (!mode || !input) return;

  input.disabled = mode.value === "none";
  if (mode.value === "none") input.value = "";
}

function ignoreIssue(rowId) {
  const row = activeReviewData.find((item) => item.id === rowId);
  if (!row) return;

  row.status = "Diabaikan";
  removeAttentionItem(rowId);
  refreshDerivedViews();
  showToast(`Masalah pada ${row.name} diabaikan dan tidak muncul lagi di daftar perhatian.`);
}

function removeAttentionItem(rowId) {
  activeAttentionItems = activeAttentionItems.filter((item) => item.rowId !== rowId);

  if (!activeAttentionItems.length) {
    activeAttentionItems = [
      {
        id: "all-clear",
        rowId: null,
        name: "Sistem",
        note: "Semua item perhatian sudah ditangani.",
        type: "info",
      },
    ];
  }
}

function refreshDerivedViews() {
  activeSalaryData = buildSalaryFromReview(activeReviewData);
  renderReview();
  renderAttention();
  renderReviewNameFilter();
  renderStaffFilter();
  renderBonusPreview();
  renderExport();
}

document.querySelectorAll("[data-next], [data-step-target]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.next === "review" && !uploadedRows.length) {
      showToast("Upload file absensi terlebih dahulu agar data dapat diproses.");
      return;
    }

    setStep(button.dataset.next || button.dataset.stepTarget);
    if (button.dataset.next === "review") {
      showToast("Data upload diproses. Nama staff mengikuti file yang diupload.");
    }
  });
});

renderReview();
renderAttention();
renderStaff();
renderSchedule();
renderReviewNameFilter();
renderStaffFilter();
renderBonusPreview();
renderExport();
initUpload();
initWorkRules();
initActions();
