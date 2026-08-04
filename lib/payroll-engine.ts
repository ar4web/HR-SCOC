import { employees, companies, payrolls, addPayroll } from '@/lib/mock-data';
import { Payroll, PayrollStatus, Deduction, Addition } from '@/types';
import { generateId } from '@/lib/utils';

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

export function processPayroll(period: string): { success: boolean; count: number; errors: string[] } {
  const empList = Array.from(employees.values()).filter((e) => e.status === 'active');
  const errors: string[] = [];
  let count = 0;

  for (const emp of empList) {
    const total = emp.salary.basic + emp.salary.housing + emp.salary.transportation + emp.salary.otherAllowances;
    if (total <= 0) {
      errors.push(`${emp.employeeId}: Zero salary`);
      continue;
    }

    const gosiEmployee = total * 0.095;
    const gosiEmployer = total * 0.095;
    const deductions: Deduction[] = [
      { type: 'gosi_employee', amount: Math.round(gosiEmployee), description: 'GOSI Employee Share' },
    ];
    const netPay = Math.round(total - gosiEmployee);

    const payroll = {
      companyId: 'demo-company',
      period,
      employeeId: emp.id,
      salary: emp.salary,
      deductions,
      additions: [
        { type: 'gosi_employer', amount: Math.round(gosiEmployer), description: 'GOSI Employer Share' },
      ],
      gosiContribution: Math.round(gosiEmployee + gosiEmployer),
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

  const totalSalary = payroll.salary.basic + payroll.salary.housing + payroll.salary.transportation + payroll.salary.otherAllowances;
  const totalDeductions = payroll.deductions.reduce((s, d) => s + d.amount, 0);
  const totalAdditions = payroll.additions.reduce((s, a) => s + a.amount, 0);

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip</title>
    <style>
      body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; background: #f5f5f0; }
      .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .header { text-align: center; border-bottom: 2px solid #009B77; padding-bottom: 20px; margin-bottom: 20px; }
      .header h1 { color: #009B77; margin: 0; font-size: 24px; }
      .header p { color: #666; margin: 4px 0 0; }
      .section { margin-bottom: 24px; }
      .section h2 { font-size: 14px; color: #009B77; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
      th { background: #f9fafb; font-weight: 500; color: #666; }
      .total-row td { font-weight: 700; border-top: 2px solid #009B77; color: #009B77; }
      .net-pay { text-align: center; margin-top: 24px; padding: 16px; background: #009B77; color: white; border-radius: 8px; }
      .net-pay h3 { margin: 0; font-size: 16px; opacity: 0.9; }
      .net-pay .amount { font-size: 36px; font-weight: 700; margin: 4px 0 0; }
    </style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payslip</h1>
          <p>Period: ${payroll.period} | Employee: ${emp.fullName} (${emp.employeeId})</p>
        </div>
        <div class="section">
          <h2>Salary Breakdown</h2>
          <table><tr><th>Component</th><th>Amount</th></tr>
            <tr><td>Basic Salary</td><td>SAR ${payroll.salary.basic.toFixed(2)}</td></tr>
            <tr><td>Housing Allowance</td><td>SAR ${payroll.salary.housing.toFixed(2)}</td></tr>
            <tr><td>Transportation</td><td>SAR ${payroll.salary.transportation.toFixed(2)}</td></tr>
            <tr class="total-row"><td>Total Salary</td><td>SAR ${totalSalary.toFixed(2)}</td></tr>
          </table>
        </div>
        <div class="section">
          <h2>Deductions</h2>
          <table><tr><th>Type</th><th>Amount</th></tr>
            ${payroll.deductions.filter(d => d.amount > 0).map(d => `<tr><td>${d.description}</td><td>SAR ${d.amount.toFixed(2)}</td></tr>`).join('')}
            <tr class="total-row"><td>Total Deductions</td><td>SAR ${totalDeductions.toFixed(2)}</td></tr>
          </table>
        </div>
        <div class="section">
          <h2>Additions</h2>
          <table><tr><th>Type</th><th>Amount</th></tr>
            ${payroll.additions.filter(a => a.amount > 0).map(a => `<tr><td>${a.description}</td><td>SAR ${a.amount.toFixed(2)}</td></tr>`).join('')}
            <tr class="total-row"><td>Total Additions</td><td>SAR ${totalAdditions.toFixed(2)}</td></tr>
          </table>
        </div>
        <div class="net-pay">
          <h3>GOSI Contribution: SAR ${payroll.gosiContribution.toFixed(2)}</h3>
          <div class="amount">SAR ${payroll.netPay.toFixed(2)}</div>
          <p style="margin:4px 0 0;opacity:0.8;">Net Pay</p>
        </div>
      </div>
    </body></html>`;
}
