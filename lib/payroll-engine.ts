import { employees, companies, payrolls, addPayroll } from '@/lib/mock-data';
import { Payroll, Deduction, Addition } from '@/types';

export interface GOSIRate {
  id: string;
  label: string;
  labelAr: string;
  employee: number;
  employer: number;
  note: string;
  noteAr: string;
  saudiOnly?: boolean;
}

export const GOSI_RATES: GOSIRate[] = [
  {
    id: 'old_age',
    label: 'Old-age, disability & death insurance',
    labelAr: 'تأمين الشيخوخة والعجز والوفاة',
    employee: 0.09,
    employer: 0.09,
    note: '2024 rate',
    noteAr: 'نسبة 2024',
  },
  {
    id: 'work_hazards',
    label: 'Work hazards insurance',
    labelAr: 'تأمين أخطار العمل',
    employee: 0,
    employer: 0.02,
    note: 'Occupational hazards only',
    noteAr: 'أخطار العمل فقط',
  },
  {
    id: 'sanad',
    label: 'Unemployment (SANED)',
    labelAr: 'التعطل عن العمل (ساند)',
    employee: 0.0075,
    employer: 0.0075,
    note: 'Saudi nationals only',
    noteAr: 'للسعوديين فقط',
    saudiOnly: true,
  },
];

export const GOSI_WAGE_CAP = 45000;

export interface GOSIBreakdown {
  applicableWage: number;
  isSaudi: boolean;
  rows: {
    id: string;
    label: string;
    labelAr: string;
    note: string;
    noteAr: string;
    employeeShare: number;
    employerShare: number;
  }[];
  totalEmployee: number;
  totalEmployer: number;
  total: number;
}

export function calculateGOSI(wage: number, isSaudi = true): GOSIBreakdown {
  const applicable = Math.min(Math.max(wage, 0), GOSI_WAGE_CAP);

  const rows = GOSI_RATES.filter((r) => (r.saudiOnly ? isSaudi : true)).map((r) => ({
    id: r.id,
    label: r.label,
    labelAr: r.labelAr,
    note: r.note,
    noteAr: r.noteAr,
    employeeShare: Math.round(applicable * r.employee),
    employerShare: Math.round(applicable * r.employer),
  }));

  const totalEmployee = rows.reduce((s, r) => s + r.employeeShare, 0);
  const totalEmployer = rows.reduce((s, r) => s + r.employerShare, 0);

  return {
    applicableWage: applicable,
    isSaudi,
    rows,
    totalEmployee,
    totalEmployer,
    total: totalEmployee + totalEmployer,
  };
}

export function getPayrolls() {
  return Array.from(payrolls.values());
}

export function getPayrollById(id: string) {
  return payrolls.get(id) || null;
}

export interface TimesheetApplyInput {
  employeeId: string;
  employeeDisplayId: string;
  fullName: string;
  department: string;
  daysWorked: number;
  regularHours: number;
  otHours: number;
  dailyRate: number;
  basePay: number;
  otRate: number;
  otPay: number;
  grossPay: number;
}

export function processPayrollFromTimesheet(
  period: string,
  summaries: TimesheetApplyInput[]
): { success: boolean; count: number; errors: string[] } {
  const errors: string[] = [];
  let count = 0;

  for (const summary of summaries) {
    const emp = employees.get(summary.employeeId);
    if (!emp) {
      errors.push(`${summary.employeeDisplayId || summary.employeeId}: Unknown employee`);
      continue;
    }
    if (summary.grossPay <= 0) {
      errors.push(`${emp.employeeId}: Zero gross pay, skipped`);
      continue;
    }

    const existing = Array.from(payrolls.values()).filter((p) => p.period === period && p.employeeId === emp.id);
    if (existing.some((p) => p.status === 'completed')) {
      errors.push(`${emp.employeeId}: Payroll already processed for ${period}`);
      continue;
    }

    const isSaudi = (emp.nationality || '').toLowerCase() === 'saudi';
    const gosi = calculateGOSI(summary.grossPay, isSaudi);

    const deductions: Deduction[] = [
      { type: 'gosi_employee', amount: gosi.totalEmployee, description: 'GOSI Employee Share' },
    ];
    const additions: Addition[] = [];
    if (summary.otPay > 0) {
      additions.push({
        type: 'overtime',
        amount: summary.otPay,
        description: `Overtime Pay (${summary.otHours} hrs x ${summary.otRate.toFixed(2)})`,
      });
    }
    if (gosi.totalEmployer > 0) {
      additions.push({ type: 'gosi_employer', amount: gosi.totalEmployer, description: 'GOSI Employer Share' });
    }

    const netPay = Math.round(summary.grossPay - gosi.totalEmployee);

    const payroll = {
      companyId: 'demo-company',
      period,
      employeeId: emp.id,
      salary: emp.salary,
      deductions,
      additions,
      gosiContribution: gosi.totalEmployee + gosi.totalEmployer,
      netPay,
      status: 'completed',
      processedAt: new Date().toISOString(),
      timesheet: {
        daysWorked: summary.daysWorked,
        dailyRate: summary.dailyRate,
        basePay: summary.basePay,
        otHours: summary.otHours,
        otRate: summary.otRate,
        otPay: summary.otPay,
        grossPay: summary.grossPay,
      },
    } satisfies Omit<Payroll, 'id'>;

    addPayroll(payroll);
    count++;
  }

  return { success: true, count, errors };
}

export function processPayroll(period: string): { success: boolean; count: number; errors: string[] } {
  const existing = Array.from(payrolls.values()).filter((p) => p.period === period);
  const empList = Array.from(employees.values()).filter((e) => e.status === 'active');
  const errors: string[] = [];
  let count = 0;

  for (const emp of empList) {
    if (existing.some((p) => p.employeeId === emp.id)) {
      continue;
    }

    const total = emp.salary.basic + emp.salary.housing + emp.salary.transportation + emp.salary.otherAllowances;
    if (total <= 0) {
      errors.push(`${emp.employeeId}: Zero salary`);
      continue;
    }

    const isSaudi = (emp.nationality || '').toLowerCase() === 'saudi';
    const gosi = calculateGOSI(total, isSaudi);
    const deductions: Deduction[] = [
      { type: 'gosi_employee', amount: gosi.totalEmployee, description: 'GOSI Employee Share' },
    ];
    const additions: Addition[] = gosi.totalEmployer > 0
      ? [{ type: 'gosi_employer', amount: gosi.totalEmployer, description: 'GOSI Employer Share' }]
      : [];
    const netPay = Math.round(total - gosi.totalEmployee);

    const payroll = {
      companyId: 'demo-company',
      period,
      employeeId: emp.id,
      salary: emp.salary,
      deductions,
      additions,
      gosiContribution: gosi.totalEmployee + gosi.totalEmployer,
      netPay,
      status: 'completed',
      processedAt: new Date().toISOString(),
    } satisfies Omit<Payroll, 'id'>;

    addPayroll(payroll);
    count++;
  }

  return { success: true, count, errors };
}

export function getWPSFile(period: string): string {
  const periodPayrolls = Array.from(payrolls.values()).filter((p) => p.period === period && p.status === 'completed');
  const company = companies.get('demo-company');

  const header = `HDR,${company?.name || 'Company'},${period},${periodPayrolls.length},SAR`;
  const details = periodPayrolls.map((p) => {
    const emp = employees.get(p.employeeId);
    return `DET,${emp?.employeeId || ''},${emp?.fullName || ''},${emp?.salary.iban || ''},${p.netPay},SAR`;
  });
  const total = periodPayrolls.reduce((sum, p) => sum + p.netPay, 0);
  const trailer = `TRL,${periodPayrolls.length},${total},SAR`;

  return [header, ...details, trailer].join('\n');
}

export function generatePayslipHtml(payrollId: string): string | null {
  const payroll = payrolls.get(payrollId);
  if (!payroll) return null;
  const emp = employees.get(payroll.employeeId);
  if (!emp) return null;
  const company = companies.get('demo-company');

  const totalSalary = payroll.salary.basic + payroll.salary.housing + payroll.salary.transportation + payroll.salary.otherAllowances;
  const totalDeductions = payroll.deductions.filter((d) => d.amount > 0).reduce((s, d) => s + d.amount, 0);
  const totalAdditions = payroll.additions.filter((a) => a.amount > 0).reduce((s, a) => s + a.amount, 0);

  const isSaudi = (emp.nationality || '').toLowerCase() === 'saudi';
  const gosiBasis = payroll.timesheet ? payroll.timesheet.grossPay : totalSalary;
  const gosi = calculateGOSI(Math.max(gosiBasis, 0), isSaudi);

  const pd = payroll.processedAt ? new Date(payroll.processedAt) : null;
  const periodLabel = payroll.period;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const deductionsRows = payroll.deductions.filter((d) => d.amount > 0);
  const additionsRows = payroll.additions.filter((a) => a.amount > 0);

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Payslip ${emp.fullName} - ${periodLabel}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; margin: 0; background: #e9e7df; color: #1f2937; }
  .toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 12px 24px; background: #33383e; }
  .toolbar button { border: 0; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .toolbar .print { background: #009B77; color: #fff; }
  .toolbar .print:hover { background: #007a5e; }
  .toolbar .close { background: rgba(255,255,255,0.12); color: #fff; }
  .toolbar .close:hover { background: rgba(255,255,255,0.22); }
  .page { max-width: 820px; margin: 28px auto 48px; background: #fff; border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .page-inner { padding: 44px 48px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #9B775C; padding-bottom: 22px; margin-bottom: 26px; }
  .top .brand h1 { margin: 0; font-size: 22px; color: #9B775C; letter-spacing: 0.4px; }
  .top .brand p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
  .top .doc-title { text-align: right; }
  .top .doc-title h2 { margin: 0; font-size: 20px; color: #111827; text-transform: uppercase; letter-spacing: 2px; }
  .top .doc-title p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 40px; margin-bottom: 30px; }
  .field { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px dashed #e5e7eb; padding: 7px 0; font-size: 13.5px; }
  .field .k { color: #6b7280; }
  .field .v { font-weight: 600; color: #111827; text-align: right; }
  h3.sec { font-size: 12px; color: #9B775C; text-transform: uppercase; letter-spacing: 1.4px; margin: 26px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th, td { padding: 9px 12px; text-align: left; }
  thead th { background: #f6f4ec; color: #6b7280; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; border: 1px solid #e5e7eb; }
  td { border: 1px solid #e5e7eb; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .total td { background: #f6f4ec; font-weight: 700; }
  .net { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; padding: 18px 24px; background: #9B775C; border-radius: 12px; color: #fff; }
  .net .lbl { font-size: 13px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9; }
  .net .amt { font-size: 30px; font-weight: 800; }
  .gosi-note { margin-top: 18px; font-size: 12px; color: #6b7280; line-height: 1.6; }
  .sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 46px; }
  .sign .box .line { border-bottom: 1px solid #111827; height: 34px; }
  .sign .box p { margin: 8px 0 0; font-size: 12px; color: #6b7280; text-align: center; }
  .foot { margin-top: 34px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; display: flex; justify-content: space-between; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .page { margin: 0; box-shadow: none; border-radius: 0; max-width: none; }
    .page-inner { padding: 8mm; }
    @page { size: A4 portrait; margin: 8mm; }
  }
</style></head>
<body>
  <div class="toolbar">
    <button class="close" onclick="history.back()">Close</button>
    <button class="print" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="page"><div class="page-inner">
    <div class="top">
      <div class="brand">
        <h1>${company?.name || 'Company Name'}</h1>
        <p>${company?.industry || 'Human Resources'} · VAT: ${company?.taxNumber || '—'} </p>
      </div>
      <div class="doc-title">
        <h2>Payslip</h2>
        <p>Period: ${periodLabel} · No. ${payrollId.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>

    <h3 class="sec">Employee Information</h3>
    <div class="grid2">
      <div class="field"><span class="k">Employee Name</span><span class="v">${emp.fullName}${emp.fullNameAr && emp.fullNameAr !== emp.fullName ? ' / ' + emp.fullNameAr : ''}</span></div>
      <div class="field"><span class="k">Employee ID</span><span class="v">${emp.employeeId}</span></div>
      <div class="field"><span class="k">Department</span><span class="v">${emp.department}</span></div>
      <div class="field"><span class="k">Position</span><span class="v">${emp.position}</span></div>
      <div class="field"><span class="k">Nationality</span><span class="v">${emp.nationality}</span></div>
      <div class="field"><span class="k">National ID</span><span class="v">${emp.nationalId || '—'}</span></div>
      <div class="field"><span class="k">Hire Date</span><span class="v">${emp.hireDate}</span></div>
      <div class="field"><span class="k">Contract</span><span class="v">${emp.contractType}${emp.contractEndDate ? ' · ends ' + emp.contractEndDate : ''}</span></div>
      <div class="field"><span class="k">Bank (IBAN)</span><span class="v">${emp.salary.iban || '—'}</span></div>
      <div class="field"><span class="k">Processed At</span><span class="v">${pd ? pd.toISOString().slice(0, 10) : '—'}</span></div>
    </div>

    <h3 class="sec">Salary Breakdown</h3>
    <table>
      <thead><tr><th>Component</th><th class="num">Amount (﷼)</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary</td><td class="num">${fmt(payroll.salary.basic)}</td></tr>
        <tr><td>Housing Allowance</td><td class="num">${fmt(payroll.salary.housing)}</td></tr>
        <tr><td>Transportation Allowance</td><td class="num">${fmt(payroll.salary.transportation)}</td></tr>
        <tr><td>Other Allowances</td><td class="num">${fmt(payroll.salary.otherAllowances)}</td></tr>
        <tr class="total"><td>Total Monthly Salary</td><td class="num">${fmt(totalSalary)}</td></tr>
      </tbody>
    </table>

    ${payroll.timesheet ? `
    <h3 class="sec">Timesheet Settlement</h3>
    <table>
      <thead><tr><th>Item</th><th class="num">Value</th></tr></thead>
      <tbody>
        <tr><td>Days Worked</td><td class="num">${payroll.timesheet.daysWorked.toLocaleString('en-US')} days × ${fmt(payroll.timesheet.dailyRate)} /day</td></tr>
        <tr><td>Base Pay (days × daily rate)</td><td class="num">${fmt(payroll.timesheet.basePay)}</td></tr>
        <tr><td>Overtime</td><td class="num">${payroll.timesheet.otHours.toLocaleString('en-US')} hrs × ${fmt(payroll.timesheet.otRate)} /hr = ${fmt(payroll.timesheet.otPay)}</td></tr>
        <tr class="total"><td>Gross Pay (period)</td><td class="num">${fmt(payroll.timesheet.grossPay)}</td></tr>
      </tbody>
    </table>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;">
      <div>
        <h3 class="sec">Deductions</h3>
        ${deductionsRows.length > 0 ? `
        <table>
          <thead><tr><th>Item</th><th class="num">Amount (﷼)</th></tr></thead>
          <tbody>
            ${deductionsRows.map((d) => `<tr><td>${d.description}</td><td class="num">${fmt(d.amount)}</td></tr>`).join('')}
            <tr class="total"><td>Total Deductions</td><td class="num">${fmt(totalDeductions)}</td></tr>
          </tbody>
        </table>` : '<p style="font-size:13px;color:#6b7280;">No deductions</p>'}
      </div>
      <div>
        <h3 class="sec">Additions</h3>
        ${additionsRows.length > 0 ? `
        <table>
          <thead><tr><th>Item</th><th class="num">Amount (﷼)</th></tr></thead>
          <tbody>
            ${additionsRows.map((a) => `<tr><td>${a.description}</td><td class="num">${fmt(a.amount)}</td></tr>`).join('')}
            <tr class="total"><td>Total Additions</td><td class="num">${fmt(totalAdditions)}</td></tr>
          </tbody>
        </table>` : '<p style="font-size:13px;color:#6b7280;">No additions</p>'}
      </div>
    </div>

    <h3 class="sec">GOSI Contribution</h3>
    <table>
      <thead><tr><th>Branch</th><th class="num">Employee Share</th><th class="num">Employer Share</th></tr></thead>
      <tbody>
        ${gosi.rows.map((r) => `<tr><td>${r.label}</td><td class="num">${r.employeeShare > 0 ? fmt(r.employeeShare) : '—'}</td><td class="num">${r.employerShare > 0 ? fmt(r.employerShare) : '—'}</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td class="num">${fmt(gosi.totalEmployee)}</td><td class="num">${fmt(gosi.totalEmployer)}</td></tr>
      </tbody>
    </table>
    <p class="gosi-note">GOSI is calculated on the applicable monthly wage${payroll.timesheet ? ` (timesheet gross, capped at ﷼${GOSI_WAGE_CAP.toLocaleString('en-US')})` : ` of ﷼${fmt(gosi.applicableWage)} (capped at ﷼${GOSI_WAGE_CAP.toLocaleString('en-US')})`}. Employer share is an employer cost and not deducted from net pay.</p>

    <div class="net">
      <span class="lbl">Net Pay (﷼)</span>
      <span class="amt">${fmt(payroll.netPay)}</span>
    </div>

    <div class="sign">
      <div class="text"><div class="line"></div><p>Employee Signature</p></div>
      <div class="text"><div class="line"></div><p>Finance / HR Approval</p></div>
      <div class="text"><div class="line"></div><p>Date</p></div>
    </div>

    <div class="foot">
      <span>This payslip was generated by the SCOS HR system for period ${periodLabel}.</span>
      <span>Payslip No. ${payrollId.slice(0, 8).toUpperCase()}</span>
    </div>
  </div></div>
</body></html>`;
}
