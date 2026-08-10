# ORB — Data Importer Guide

## Overview

The employee import system allows bulk uploading of employee records via Excel files. It supports preview mode (validate before import) and import mode (create records).

## Endpoint

```
POST /api/employees/import
Content-Type: multipart/form-data

Fields:
  file:    Excel file (.xlsx or .xls, max 10MB)
  action:  "preview" (default) or "import"
```

## Required Permissions

- `employee:manage` — only `admin` and `hr_manager` roles

## Excel Template

Download the template from `GET /api/employees/template` or create your own with these columns:

### Required Columns

| Column | Type | Description |
|---|---|---|
| `Full Name (EN)*` | string | Employee full name in English |
| `Email*` | string | Valid email address (unique) |

### Optional Columns

| Column | Type | Default | Description |
|---|---|---|---|
| `Full Name (AR)` | string | Same as EN | Arabic name |
| `Phone` | string | `""` | Phone number |
| `National ID / Iqama` | string | `""` | National ID or Iqama number |
| `Nationality` | string | `"Saudi"` | Country of origin |
| `Gender (male/female)` | string | `"male"` | Gender |
| `Marital Status (single/married/divorced/widowed)` | string | `"single"` | Marital status |
| `Date of Birth (YYYY-MM-DD)` | string | `"1990-01-01"` | Date of birth |
| `Department` | string | `"General"` | Department name |
| `Position` | string | `"Staff"` | Job title |
| `Hire Date (YYYY-MM-DD)` | string | Today | Employment start date |
| `Contract Type (permanent/fixed_term/part_time/probationary)` | string | `"permanent"` | Contract type |
| `Contract End Date (YYYY-MM-DD)` | string | — | Required for fixed_term |
| `Basic Salary` | number | `0` | Monthly basic salary |
| `Housing Allowance` | number | `0` | Housing allowance |
| `Transportation Allowance` | number | `0` | Transportation allowance |
| `Other Allowances` | number | `0` | Other allowances |
| `Status (active/inactive/terminated/suspended)` | string | `"active"` | Employment status |
| `Sponsor Name` | string | — | Sponsor name (for Iqama) |
| `Sponsor ID` | string | — | Sponsor ID |
| `Annual Vacation Days` | number | — | Custom vacation days per year |
| `Vacation Balance (days)` | number | — | Current vacation balance |
| `Manager Employee ID` | string | — | Manager's employee ID |

## Validation Rules

### Field Validation

| Rule | Details |
|---|---|
| Full Name | Required, non-empty string |
| Email | Required, valid format (`user@domain.tld`) |
| Gender | Must be `male` or `female` |
| Marital Status | Must be `single`, `married`, `divorced`, or `widowed` |
| Contract Type | Must be `permanent`, `fixed_term`, `part_time`, or `probationary` |
| Status | Must be `active`, `inactive`, `terminated`, or `suspended` |
| Dates | Must be `YYYY-MM-DD` format |
| Salaries | Parsed as numbers, commas/spaces stripped |

### Duplicate Detection

| Check | Scope |
|---|---|
| Email uniqueness | Cross-checks existing employees + within uploaded file |
| National ID uniqueness | Cross-checks existing employees |

### File Validation

| Check | Limit |
|---|---|
| File type | `.xlsx` or `.xls` only |
| MIME type | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, `application/octet-stream`, `application/zip` |
| File size | Max 10 MB |
| Empty rows | Rejected if no data rows found |

## Usage Flow

### Step 1: Preview (Validate)

```bash
curl -X POST http://localhost:3001/api/employees/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@employees.xlsx" \
  -F "action=preview"
```

Response:
```json
{
  "success": true,
  "action": "preview",
  "total": 50,
  "validCount": 47,
  "preview": [
    {
      "rowNumber": 1,
      "name": "Ahmed Al-Rashid",
      "email": "ahmed@company.sa",
      "department": "Engineering",
      "position": "Developer",
      "salary": 15000,
      "valid": true,
      "errors": []
    },
    {
      "rowNumber": 5,
      "name": "",
      "email": "invalid-email",
      "department": "HR",
      "position": "Manager",
      "salary": 20000,
      "valid": false,
      "errors": ["Full Name is required", "Invalid email format"]
    }
  ]
}
```

### Step 2: Import (Create)

```bash
curl -X POST http://localhost:3001/api/employees/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@employees.xlsx" \
  -F "action=import"
```

Response:
```json
{
  "success": true,
  "created": 47,
  "skipped": 3,
  "preview": [...],
  "createdRecords": [
    {
      "employeeId": "EMP-001",
      "fullName": "Ahmed Al-Rashid",
      "email": "ahmed@company.sa"
    }
  ],
  "failures": [
    {
      "rowNumber": 5,
      "errors": ["Full Name is required", "Invalid email format"]
    }
  ]
}
```

## Client-Side Usage

The import UI is in `components/employees/EmployeeImport.tsx`:

1. Select an Excel file
2. Click "Preview" → shows validation results in a table
3. Review errors (highlighted in red)
4. Click "Import" → creates valid records, shows summary

## Salary Calculation

Total salary is auto-calculated:
```
Total = Basic + Housing + Transportation + Other Allowances
```

This total is stored in `employee.salary.total` and used for payroll processing.

## Employee ID Generation

Employee IDs are auto-generated on import:
```
Format: EMP-{sequential number}
Example: EMP-001, EMP-002, ...
```

## Post-Import

After import:
- Employee records are created in the data store
- Passwords are set to the default (`Password123!`) — users should change on first login
- Attendance and leave balances start at zero
- The employee appears in the employee list immediately
- `persistData()` is called to write to `data/db.json`

## Error Handling

| Error | HTTP Status | Cause |
|---|---|---|
| `Forbidden: Requires employee:manage` | 403 | Insufficient permissions |
| `Excel file is required` | 400 | No file in request |
| `Please upload an .xlsx or .xls file` | 400 | Wrong file extension |
| `Uploaded file is not a valid Excel workbook` | 400 | Invalid MIME type |
| `File too large (max 10 MB)` | 400 | File exceeds size limit |
| `Could not read the Excel file` | 400 | Corrupt or unreadable file |
| `The file contains no data rows` | 400 | Empty spreadsheet |

## Sample Template

| Full Name (EN)* | Full Name (AR) | Email* | Phone | National ID / Iqama | Department | Position | Hire Date (YYYY-MM-DD) | Contract Type | Basic Salary | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Ahmed Al-Rashid | أحمد الراشد | ahmed@company.sa | +966501234567 | 1234567890 | Engineering | Developer | 2024-01-15 | permanent | 15000 | active |
| Fatima Hassan | فاطمة حسن | fatima@company.sa | +966509876543 | 0987654321 | HR | Manager | 2023-06-01 | permanent | 20000 | active |
| Mohammed Ali | محمد علي | mohammed@company.sa | +966505551234 | 1122334455 | Finance | Analyst | 2024-03-20 | fixed_term | 12000 | active |
