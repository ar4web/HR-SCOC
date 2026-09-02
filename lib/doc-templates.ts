/**
 * Doc Printer — bilingual HR document templates.
 *
 * Every template has English and Arabic body text with {placeholders}
 * merged from employee + company data. The printed page renders
 * English (LTR) on the left column and Arabic (RTL) on the right.
 *
 * Placeholders are editable in the UI before printing — the merge output
 * is a starting point, not a locked document.
 */

import { Employee, Company } from '@/types';

export type PaperSize = 'a4' | 'letter' | 'a5' | 'legal';

export const PAPER_SIZES: Record<PaperSize, { en: string; ar: string; w: number; h: number; css: string }> = {
  a4: { en: 'A4 (210×297mm)', ar: 'A4 (٢١٠×٢٩٧مم)', w: 210, h: 297, css: '210mm 297mm' },
  letter: { en: 'Letter (8.5×11")', ar: 'Letter (٨٫٥×١١ بوصة)', w: 216, h: 279, css: '8.5in 11in' },
  a5: { en: 'A5 (148×210mm)', ar: 'A5 (١٤٨×٢١٠مم)', w: 148, h: 210, css: '148mm 210mm' },
  legal: { en: 'Legal (8.5×14")', ar: 'Legal (٨٫٥×١٤ بوصة)', w: 216, h: 356, css: '8.5in 14in' },
};

export interface DocTemplate {
  id: string;
  category: 'employment' | 'separation' | 'certificates' | 'disciplinary' | 'requests';
  title: { en: string; ar: string };
  /** Paragraphs; {placeholders} get merged. Same count/order in both languages. */
  body: { en: string[]; ar: string[] };
  /** Show salary table (contract docs) */
  salaryTable?: boolean;
  /** Needs employee signature block too (not just company) */
  employeeSigns?: boolean;
}

export const DOC_CATEGORIES: { id: DocTemplate['category']; en: string; ar: string }[] = [
  { id: 'employment', en: 'Employment', ar: 'التوظيف' },
  { id: 'separation', en: 'Separation', ar: 'إنهاء الخدمة' },
  { id: 'certificates', en: 'Certificates', ar: 'الشهادات' },
  { id: 'disciplinary', en: 'Disciplinary', ar: 'الإجراءات التأديبية' },
  { id: 'requests', en: 'Requests', ar: 'الطلبات' },
];

export const DOC_TEMPLATES: DocTemplate[] = [
  /* ---------------- employment ---------------- */
  {
    id: 'employment-contract',
    category: 'employment',
    title: { en: 'Employment Contract', ar: 'عقد عمل' },
    salaryTable: true,
    employeeSigns: true,
    body: {
      en: [
        'This Employment Contract is entered into on {today} between {companyName} (CR No. {crNumber}), hereinafter referred to as the "Employer", and {employeeName} ({nationality}, ID/Iqama No. {nationalId}), hereinafter referred to as the "Employee".',
        'The Employer hereby employs the Employee in the position of {position} within the {department} department, commencing on {hireDate}, under a {contractType} contract in accordance with the Saudi Labor Law.',
        'The Employee shall receive the monthly remuneration detailed in the salary table below, payable in accordance with the Wage Protection System (WPS).',
        'The Employee shall be entitled to {vacationDays} days of paid annual leave, end-of-service benefits, and all other entitlements prescribed by the Saudi Labor Law.',
        'The first ninety (90) days of employment shall constitute a probationary period, during which either party may terminate this contract without notice or compensation.',
        'This contract is executed in both Arabic and English; in the event of any discrepancy, the Arabic text shall prevail as per the laws of the Kingdom of Saudi Arabia.',
      ],
      ar: [
        'أُبرم عقد العمل هذا بتاريخ {today} بين {companyNameAr} (سجل تجاري رقم {crNumber})، ويُشار إليها فيما يلي بـ«صاحب العمل»، و{employeeNameAr} ({nationality}، هوية/إقامة رقم {nationalId})، ويُشار إليه فيما يلي بـ«الموظف».',
        'يوظف صاحب العمل بموجب هذا العقد الموظف في منصب {position} ضمن إدارة {department}، اعتباراً من {hireDate}، بموجب عقد {contractTypeAr} وفقاً لنظام العمل السعودي.',
        'يتقاضى الموظف الأجر الشهري المفصل في جدول الراتب أدناه، ويُدفع وفقاً لنظام حماية الأجور.',
        'يستحق الموظف {vacationDays} يوماً من الإجازة السنوية مدفوعة الأجر، ومكافأة نهاية الخدمة، وجميع المستحقات الأخرى المنصوص عليها في نظام العمل السعودي.',
        'تُعد التسعون (90) يوماً الأولى من العمل فترة تجربة، يجوز خلالها لأي من الطرفين إنهاء هذا العقد دون إشعار أو تعويض.',
        'حُرر هذا العقد باللغتين العربية والإنجليزية؛ وفي حال وجود أي تعارض، يُعتد بالنص العربي وفقاً لأنظمة المملكة العربية السعودية.',
      ],
    },
  },
  {
    id: 'offer-letter',
    category: 'employment',
    title: { en: 'Job Offer Letter', ar: 'خطاب عرض وظيفي' },
    salaryTable: true,
    employeeSigns: true,
    body: {
      en: [
        'Dear {employeeName},',
        'We are pleased to offer you the position of {position} in the {department} department at {companyName}, with an expected start date of {hireDate}.',
        'Your monthly compensation package is detailed in the table below and is subject to the terms of the Saudi Labor Law and company policy.',
        'This offer is valid for ten (10) business days from the date of this letter. To accept, please sign below and return a copy to Human Resources.',
        'We look forward to welcoming you to our team.',
      ],
      ar: [
        'الأستاذ/ {employeeNameAr} المحترم،',
        'يسرنا أن نقدم لكم عرضاً لشغل وظيفة {position} في إدارة {department} لدى {companyNameAr}، على أن يكون تاريخ المباشرة المتوقع {hireDate}.',
        'تفاصيل حزمة التعويضات الشهرية موضحة في الجدول أدناه، وتخضع لأحكام نظام العمل السعودي وسياسات الشركة.',
        'هذا العرض ساري المفعول لمدة عشرة (10) أيام عمل من تاريخ هذا الخطاب. للقبول، يرجى التوقيع أدناه وإعادة نسخة إلى إدارة الموارد البشرية.',
        'نتطلع إلى انضمامكم لفريقنا.',
      ],
    },
  },
  {
    id: 'promotion-letter',
    category: 'employment',
    title: { en: 'Promotion Letter', ar: 'خطاب ترقية' },
    body: {
      en: [
        'Dear {employeeName},',
        'In recognition of your outstanding performance and dedication, we are pleased to inform you that you have been promoted to the position of {position}, effective {today}.',
        'Your new responsibilities and updated compensation will be communicated to you by the Human Resources department.',
        'We congratulate you on this achievement and wish you continued success.',
      ],
      ar: [
        'الأستاذ/ {employeeNameAr} المحترم،',
        'تقديراً لأدائكم المتميز وتفانيكم في العمل، يسرنا إبلاغكم بأنه قد تمت ترقيتكم إلى منصب {position}، اعتباراً من {today}.',
        'ستتولى إدارة الموارد البشرية إبلاغكم بمسؤولياتكم الجديدة وحزمة التعويضات المحدثة.',
        'نهنئكم على هذا الإنجاز ونتمنى لكم دوام التوفيق والنجاح.',
      ],
    },
  },
  /* ---------------- separation ---------------- */
  {
    id: 'resignation-letter',
    category: 'separation',
    title: { en: 'Resignation Letter', ar: 'خطاب استقالة' },
    employeeSigns: true,
    body: {
      en: [
        'To: Human Resources Department, {companyName}',
        'I, {employeeName} (Employee ID: {employeeId}), currently serving as {position} in the {department} department, hereby submit my formal resignation from my position, effective {today}.',
        'I will duly serve the notice period stipulated in my employment contract and the Saudi Labor Law, and I commit to completing the handover of all duties, assets and documents in my custody.',
        'I would like to express my sincere gratitude for the opportunities for professional growth extended to me during my employment.',
        'I kindly request the settlement of my end-of-service entitlements in accordance with the Saudi Labor Law.',
      ],
      ar: [
        'إلى: إدارة الموارد البشرية، {companyNameAr}',
        'أنا الموقع أدناه {employeeNameAr} (الرقم الوظيفي: {employeeId})، وأشغل حالياً وظيفة {position} في إدارة {department}، أتقدم بموجب هذا الخطاب باستقالتي الرسمية من منصبي، اعتباراً من {today}.',
        'سألتزم بفترة الإشعار المنصوص عليها في عقد العمل ونظام العمل السعودي، كما أتعهد بإتمام تسليم جميع المهام والعُهد والمستندات التي بحوزتي.',
        'أود أن أعرب عن خالص شكري وتقديري لما أُتيح لي من فرص للنمو المهني خلال فترة عملي.',
        'وأرجو التكرم بتسوية مستحقات نهاية الخدمة وفقاً لنظام العمل السعودي.',
      ],
    },
  },
  {
    id: 'termination-letter',
    category: 'separation',
    title: { en: 'Termination Letter', ar: 'خطاب إنهاء خدمات' },
    body: {
      en: [
        'Dear {employeeName},',
        'We regret to inform you that your employment with {companyName} as {position} will be terminated effective {today}, in accordance with the provisions of the Saudi Labor Law and your employment contract.',
        'You will receive your end-of-service benefits, accrued leave balance, and all outstanding entitlements as prescribed by Article 84 of the Saudi Labor Law.',
        'Please coordinate with Human Resources to complete the exit procedures, including the return of company property and the settlement of any outstanding matters.',
        'We thank you for your service and wish you success in your future endeavors.',
      ],
      ar: [
        'الأستاذ/ {employeeNameAr} المحترم،',
        'نأسف لإبلاغكم بأن خدماتكم لدى {companyNameAr} في وظيفة {position} ستنتهي اعتباراً من {today}، وذلك وفقاً لأحكام نظام العمل السعودي وعقد العمل المبرم معكم.',
        'ستحصلون على مكافأة نهاية الخدمة ورصيد الإجازات المستحق وجميع المستحقات الأخرى وفقاً للمادة (84) من نظام العمل السعودي.',
        'يرجى التنسيق مع إدارة الموارد البشرية لاستكمال إجراءات إخلاء الطرف، بما في ذلك إعادة ممتلكات الشركة وتسوية أي التزامات قائمة.',
        'نشكركم على ما قدمتموه من خدمات ونتمنى لكم التوفيق في مسيرتكم المستقبلية.',
      ],
    },
  },
  {
    id: 'clearance-form',
    category: 'separation',
    title: { en: 'Final Clearance Form', ar: 'نموذج إخلاء طرف' },
    employeeSigns: true,
    body: {
      en: [
        'Employee: {employeeName} — ID: {employeeId} — Department: {department} — Position: {position}.',
        'This is to certify that the above-named employee has returned all company property, settled all financial obligations, and completed the handover of duties as of {today}.',
        'Departments sign-off: IT (equipment & accounts) — Finance (advances & loans) — Administration (access cards & keys) — Direct Manager (handover of duties).',
        'Upon completion of all signatures, the employee is cleared for final settlement of end-of-service entitlements.',
      ],
      ar: [
        'الموظف: {employeeNameAr} — الرقم الوظيفي: {employeeId} — الإدارة: {department} — الوظيفة: {position}.',
        'نشهد بأن الموظف المذكور أعلاه قد أعاد جميع ممتلكات الشركة، وسوّى جميع الالتزامات المالية، وأتم تسليم المهام حتى تاريخ {today}.',
        'اعتماد الإدارات: تقنية المعلومات (الأجهزة والحسابات) — المالية (السلف والقروض) — الشؤون الإدارية (بطاقات الدخول والمفاتيح) — المدير المباشر (تسليم المهام).',
        'بعد استكمال جميع التواقيع، يُعتبر الموظف مخلى الطرف وتُصرف له مستحقات نهاية الخدمة.',
      ],
    },
  },
  /* ---------------- certificates ---------------- */
  {
    id: 'salary-certificate',
    category: 'certificates',
    title: { en: 'Salary Certificate', ar: 'شهادة راتب' },
    salaryTable: true,
    body: {
      en: [
        'To Whom It May Concern,',
        '{companyName} (CR No. {crNumber}) hereby certifies that {employeeName} ({nationality}, ID/Iqama No. {nationalId}) has been employed with us since {hireDate} and currently holds the position of {position} in the {department} department.',
        'The employee receives the monthly salary detailed in the table below, transferred to their bank account via the Wage Protection System.',
        'This certificate has been issued upon the employee\u2019s request without any liability on the company, and it does not constitute a guarantee of any kind.',
      ],
      ar: [
        'إلى من يهمه الأمر،',
        'تشهد {companyNameAr} (سجل تجاري رقم {crNumber}) بأن {employeeNameAr} ({nationality}، هوية/إقامة رقم {nationalId}) يعمل لدينا منذ {hireDate} ويشغل حالياً وظيفة {position} في إدارة {department}.',
        'يتقاضى الموظف الراتب الشهري المفصل في الجدول أدناه، ويُحوَّل إلى حسابه البنكي عبر نظام حماية الأجور.',
        'صدرت هذه الشهادة بناءً على طلب الموظف دون أدنى مسؤولية على الشركة، ولا تُعد ضماناً من أي نوع.',
      ],
    },
  },
  {
    id: 'employment-certificate',
    category: 'certificates',
    title: { en: 'Employment Certificate', ar: 'شهادة عمل' },
    body: {
      en: [
        'To Whom It May Concern,',
        '{companyName} hereby certifies that {employeeName} ({nationality}, ID/Iqama No. {nationalId}) is a full-time employee of the company, serving as {position} in the {department} department since {hireDate}.',
        'The employee is on active duty and in good standing as of the date of this certificate.',
        'This certificate has been issued upon the employee\u2019s request for whatever legal purpose it may serve.',
      ],
      ar: [
        'إلى من يهمه الأمر،',
        'تشهد {companyNameAr} بأن {employeeNameAr} ({nationality}، هوية/إقامة رقم {nationalId}) موظف بدوام كامل لدى الشركة، ويشغل وظيفة {position} في إدارة {department} منذ {hireDate}.',
        'الموظف على رأس عمله وبوضع وظيفي سليم حتى تاريخ إصدار هذه الشهادة.',
        'صدرت هذه الشهادة بناءً على طلب الموظف لاستخدامها فيما يسمح به النظام.',
      ],
    },
  },
  {
    id: 'experience-certificate',
    category: 'certificates',
    title: { en: 'Experience Certificate', ar: 'شهادة خبرة' },
    body: {
      en: [
        'To Whom It May Concern,',
        'This is to certify that {employeeName} ({nationality}, ID/Iqama No. {nationalId}) was employed by {companyName} from {hireDate} until {today}, holding the position of {position} in the {department} department.',
        'During their tenure, the employee performed their duties with professionalism, dedication and integrity.',
        'This certificate is issued at the employee\u2019s request, and the company wishes them continued success in their career.',
      ],
      ar: [
        'إلى من يهمه الأمر،',
        'نشهد بأن {employeeNameAr} ({nationality}، هوية/إقامة رقم {nationalId}) عمل لدى {companyNameAr} في الفترة من {hireDate} حتى {today}، وشغل وظيفة {position} في إدارة {department}.',
        'وقد أدى الموظف خلال فترة عمله مهامه بمهنية وتفانٍ ونزاهة.',
        'صدرت هذه الشهادة بناءً على طلب الموظف، وتتمنى له الشركة دوام التوفيق في مسيرته المهنية.',
      ],
    },
  },
  /* ---------------- disciplinary ---------------- */
  {
    id: 'warning-letter',
    category: 'disciplinary',
    title: { en: 'Warning Letter', ar: 'خطاب إنذار' },
    employeeSigns: true,
    body: {
      en: [
        'Dear {employeeName} (Employee ID: {employeeId}),',
        'This letter serves as a formal warning regarding a violation of company policy observed on {today}. The details of the violation have been documented and discussed with you.',
        'In accordance with Article 66 of the Saudi Labor Law and the company\u2019s approved disciplinary regulations, you are hereby warned that any recurrence may result in further disciplinary action, up to and including termination.',
        'You have the right to submit a written objection to this warning within fifteen (15) days of receipt.',
        'Please sign below to acknowledge receipt of this warning.',
      ],
      ar: [
        'الأستاذ/ {employeeNameAr} المحترم (الرقم الوظيفي: {employeeId})،',
        'يُعد هذا الخطاب إنذاراً رسمياً بشأن مخالفة لسياسات الشركة رُصدت بتاريخ {today}. وقد تم توثيق تفاصيل المخالفة ومناقشتها معكم.',
        'وفقاً للمادة (66) من نظام العمل السعودي ولائحة الجزاءات المعتمدة لدى الشركة، ننذركم بأن تكرار المخالفة قد يؤدي إلى إجراءات تأديبية أشد، قد تصل إلى إنهاء الخدمات.',
        'يحق لكم التقدم باعتراض كتابي على هذا الإنذار خلال خمسة عشر (15) يوماً من تاريخ استلامه.',
        'يرجى التوقيع أدناه إقراراً باستلام هذا الإنذار.',
      ],
    },
  },
  /* ---------------- requests ---------------- */
  {
    id: 'leave-request',
    category: 'requests',
    title: { en: 'Leave Request Form', ar: 'نموذج طلب إجازة' },
    employeeSigns: true,
    body: {
      en: [
        'Employee: {employeeName} — ID: {employeeId} — Department: {department} — Position: {position}.',
        'I hereby request approval for leave starting from ____________ to ____________, for a total of ______ days.',
        'Leave type: ☐ Annual  ☐ Sick  ☐ Emergency  ☐ Unpaid  ☐ Hajj  ☐ Other: ____________',
        'Current leave balance: {vacationBalance} days. Contact during leave: ____________.',
        'I confirm that I have arranged proper handover of my duties for the duration of the leave.',
      ],
      ar: [
        'الموظف: {employeeNameAr} — الرقم الوظيفي: {employeeId} — الإدارة: {department} — الوظيفة: {position}.',
        'أتقدم بطلب الموافقة على إجازة تبدأ من ____________ حتى ____________، بإجمالي ______ يوماً.',
        'نوع الإجازة: ☐ سنوية  ☐ مرضية  ☐ اضطرارية  ☐ بدون راتب  ☐ حج  ☐ أخرى: ____________',
        'رصيد الإجازات الحالي: {vacationBalance} يوماً. وسيلة التواصل أثناء الإجازة: ____________.',
        'أؤكد أنني قمت بترتيب تسليم مهامي بشكل مناسب طوال فترة الإجازة.',
      ],
    },
  },
  {
    id: 'salary-advance',
    category: 'requests',
    title: { en: 'Salary Advance Request', ar: 'طلب سلفة على الراتب' },
    employeeSigns: true,
    body: {
      en: [
        'Employee: {employeeName} — ID: {employeeId} — Department: {department} — Basic salary: SAR {basicSalary}.',
        'I hereby request a salary advance of SAR ____________, to be deducted from my monthly salary in ______ equal installments starting from ____________.',
        'Reason for the request: ________________________________________.',
        'I acknowledge that in the event of the termination of my services for any reason, the remaining balance shall be deducted in full from my final settlement.',
      ],
      ar: [
        'الموظف: {employeeNameAr} — الرقم الوظيفي: {employeeId} — الإدارة: {department} — الراتب الأساسي: {basicSalary} ريال.',
        'أتقدم بطلب سلفة على الراتب بمبلغ ____________ ريال، تُخصم من راتبي الشهري على ______ قسطاً متساوياً اعتباراً من ____________.',
        'سبب الطلب: ________________________________________.',
        'أُقر بأنه في حال انتهاء خدماتي لأي سبب، يُخصم الرصيد المتبقي كاملاً من مستحقاتي النهائية.',
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* merge                                                               */
/* ------------------------------------------------------------------ */

const CONTRACT_TYPE_AR: Record<string, string> = {
  permanent: 'غير محدد المدة',
  fixed_term: 'محدد المدة',
  probation: 'تحت التجربة',
  part_time: 'دوام جزئي',
};

export function buildMergeMap(emp: Employee | null, company: Company | null, crNumber: string): Record<string, string> {
  const today = new Date().toISOString().slice(0, 10);
  const fmt = (n?: number) => (n === undefined || n === null ? '—' : new Intl.NumberFormat('en-US').format(n));
  return {
    today,
    companyName: company?.name || 'Company',
    companyNameAr: company?.nameAr || company?.name || 'الشركة',
    crNumber: crNumber || company?.taxNumber || '—',
    employeeName: emp?.fullName || '____________',
    employeeNameAr: emp?.fullNameAr || emp?.fullName || '____________',
    employeeId: emp?.employeeId || '____',
    nationality: emp?.nationality || '____________',
    nationalId: emp?.iqamaNumber || emp?.nationalId || '____________',
    position: emp?.position || '____________',
    department: emp?.department || '____________',
    hireDate: emp?.hireDate?.slice(0, 10) || '____________',
    contractType: (emp?.contractType || 'permanent').replace('_', ' '),
    contractTypeAr: CONTRACT_TYPE_AR[emp?.contractType || 'permanent'] || 'غير محدد المدة',
    vacationDays: String(emp?.annualVacationDays ?? 30),
    vacationBalance: String(emp?.vacationBalance ?? '____'),
    basicSalary: fmt(emp?.salary?.basic),
  };
}

export function mergeText(text: string, map: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => map[key] ?? `{${key}}`);
}
