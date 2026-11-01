const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function session(period = "2026-10") {
  const context = vm.createContext({
    Intl, Date, console,
    document: { getElementById: () => ({ value: period }) },
  });
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  vm.runInContext(script.split('document.querySelectorAll("[data-next], [data-step-target]")')[0], context);
  const run = (code) => vm.runInContext(code, context);
  run(`
    activeStaffData = [["A", 1200000, 10000, 300000, 100000], ["B", 1500000, 15000, 450000, 0]];
    activeReviewData = [
      ...Array.from({length: 20}, (_, i) => ({name: "A", date: (i + 1) + "/10/2026", in: "12:00", overtime: i < 2 ? 1 : 0, status: "Aman"})),
      ...Array.from({length: 10}, (_, i) => ({name: "B", date: (i + 1) + "/10/2026", in: "12:00", overtime: 0, status: "Aman"})),
      {name: "A", date: "01/11/2026", in: "12:00", overtime: 0, status: "Aman"}
    ];
    targetBonusConfig = {pool: 320000, mode: "attendance"};
  `);
  return (code) => JSON.parse(JSON.stringify(run(code)));
}

test("libur follows calendar month and attendance from the selected period", () => {
  const run = session();
  const [a, b] = run("buildSalaryFromReview(activeReviewData)");
  assert.equal(a[1], 20);
  assert.equal(a[8], 11);
  assert.equal(b[8], 21);
  assert.equal(a[3], 880000);
  assert.equal(a[5], 220000);
  const november = session("2026-11");
  assert.equal(november("buildSalaryFromReview(activeReviewData)")[0][8], 29);
  assert.equal(session("2024-02")("getPeriodDayCount()"), 29);
});

test("saved attendance adjustments recalculate salary, meals, prorata and every target share", () => {
  const run = session();
  run('payrollOverrides.set(payrollOverrideKey("A"), {workday: 15, offday: 16, overtime: 5, late: 6}); true');
  const [a, b] = run("buildSalaryFromReview(activeReviewData)");
  assert.deepEqual(a.slice(1), [15, 5, 800000, 200000, 213333, 160000, 100000, 16, 6]);
  assert.equal(b[5], 106667);
  assert.equal(run('calculateSalaryTotal({base: 800000, meal: 200000, targetBonus: 213333, bonus: 160000, debt: 100000})'), 1273333);
  run('activeStaffData[0][1] = 1500000; true');
  assert.equal(run("buildSalaryFromReview(activeReviewData)")[0][3], 1000000);
  assert.equal(run('payrollOverrides.get(payrollOverrideKey("A")).workday'), 15);
});

test("equal and excluded bonus participants remain correct after adjustment", () => {
  const run = session();
  run('targetBonusConfig.mode = "equal"; payrollOverrides.set(payrollOverrideKey("A"), {workday: 1, offday: 30, overtime: 0, late: 0}); true');
  assert.deepEqual(run("buildSalaryFromReview(activeReviewData).map(row => row[5])"), [160000, 160000]);
  run('excludedTargetBonusNames.add("A"); true');
  assert.deepEqual(run("buildSalaryFromReview(activeReviewData).map(row => row[5])"), [0, 320000]);
});

test("adjustments stay isolated by month and reset restores source totals", () => {
  const run = session();
  run('payrollOverrides.set("2026-11|A", {workday: 1, offday: 29, overtime: 0, late: 0}); true');
  assert.equal(run("buildSalaryFromReview(activeReviewData)")[0][1], 20);
  run('payrollOverrides.set(payrollOverrideKey("A"), {workday: 15, offday: 16, overtime: 0, late: 0}); true');
  assert.equal(run("buildSalaryFromReview(activeReviewData)")[0][1], 15);
  run('payrollOverrides.delete(payrollOverrideKey("A")); true');
  assert.equal(run("buildSalaryFromReview(activeReviewData)")[0][1], 20);
});

test("multiple saved additions and the current draft are included exactly once", () => {
  const run = session();
  run(`manualPayrollAdditions = [{amount: 1250000, note: "Insentif"}, {amount: 250000, note: "PJ"}];
    manualPayrollAddition = {amount: 50000, note: "Transport"}; true`);
  assert.equal(run("getManualPayrollTotal()"), 1550000);
  assert.equal(run("getManualPayrollItems().length"), 3);
  assert.equal(run("manualPayrollAdditions.length"), 2);
  run("manualPayrollAdditions.splice(1, 1); true");
  assert.equal(run("getManualPayrollTotal()"), 1300000);
  assert.equal(run("getManualPayrollItems()[1].note"), "Transport");
});

test("reset removes all saved additions and the current draft", () => {
  const run = session();
  run(`manualPayrollAdditions = [{amount: 1250000, note: "Insentif"}, {amount: 250000, note: "PJ"}];
    manualPayrollAddition = {amount: 50000, note: "Transport"};
    clearManualPayrollAdditions(); true`);
  assert.equal(run("getManualPayrollTotal()"), 0);
  assert.deepEqual(run("getManualPayrollItems()"), []);
  assert.deepEqual(run("manualPayrollAddition"), {amount: 0, note: ""});
});

test("manual final amounts are used directly without attendance or lateness deductions", () => {
  const run = session();
  const row = run(`buildManualSalary({name:"Manual", calculation:"direct", workday:null, overtime:null, offday:null, late:null, base:1500000, bonus:400000, meal:300000, debt:100000})`);
  assert.deepEqual(row, ["Manual", null, null, 1500000, 300000, 0, 400000, 100000, null, null]);
  assert.equal(run(`buildManualSalary({name:"Manual", calculation:"direct", workday:20, overtime:2, offday:11, late:6, base:1500000, bonus:400000, meal:300000, debt:0})[6]`), 400000);
});

test("manual prorata uses workdays plus overtime and the late multiplier", () => {
  const run = session();
  const row = run(`buildManualSalary({name:"Manual", calculation:"prorata", workday:29, overtime:4, offday:2, late:6, base:1200000, bonus:400000, meal:10000, debt:100000})`);
  assert.equal(row[3], 1320000);
  assert.equal(row[4], 330000);
  assert.equal(row[6], 352000);
});

test("manual day chips omit blanks while preserving an explicitly entered zero", () => {
  const run = session();
  run(`reportSource = "manual"; manualReport = {workday:null,overtime:null,offday:null,late:null}; true`);
  assert.deepEqual(run("getReportSummaryChips({})"), []);
  run(`manualReport = {workday:27,overtime:3,offday:null,late:0}; true`);
  assert.deepEqual(run("getReportSummaryChips({}).map(([label,value])=>[label,value])"), [["Total hari hadir",30],["Lembur",3],["Terlambat",0]]);
});
