export interface DemoPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  query: string;
  response: string;
  expectedOutcome: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'mandatory_acme_leave',
    name: 'Paid Leaves & Remote Work (Mandatory Demo)',
    badge: 'Contradiction + Unsupported',
    description: 'Intentional hallucination: 20-day claim contradicts 14-day policy, and unlimited remote work is unsupported.',
    query: 'How many paid leaves do employees get?',
    response: 'According to Acme Policy, employees get 20 paid leave days and unlimited remote work.',
    expectedOutcome: '20 days -> CONTRADICTED (14 days canonical). Unlimited remote work -> UNSUPPORTED.',
  },
  {
    id: 'it_security_mfa',
    name: 'IT Security: MFA & Confidential Storage',
    badge: 'Security Contradiction',
    description: 'Security policy compliance: Claims MFA is optional and data can be stored on personal drives.',
    query: 'What are the rules for accessing sensitive systems and storing company files?',
    response: 'Access to corporate systems requires passwords only since MFA is optional, and employees may save files to personal drives.',
    expectedOutcome: 'MFA optional -> CONTRADICTED (MFA mandatory). Personal drives -> CONTRADICTED (encrypted storage required).',
  },
  {
    id: 'leave_approval_carryover',
    name: 'Leave Approval & 5-Day Carryover',
    badge: 'Fully Supported',
    description: 'Accurate policy statement: Manager approval required 5 days in advance and 5 unused days carry over.',
    query: 'What is the leave approval procedure and carryover policy?',
    response: 'Annual leave requests require reporting-manager approval at least 5 business days prior to scheduled time off. Up to 5 unused leave days may carry over into the subsequent quarter.',
    expectedOutcome: 'Both claims -> SUPPORTED (100% Trust Score).',
  },
  {
    id: 'contractor_scope',
    name: 'Scope Shift: Contractor Benefits',
    badge: 'Scope Violation',
    description: 'Scope broadening hallucination: Claims statutory benefits apply equally to contractors and temporary workers.',
    query: 'Do contractors get paid leave benefits?',
    response: 'According to Acme Policy, all employees including contractors and interns receive full annual leave benefits.',
    expectedOutcome: 'Contractor benefits -> CONTRADICTED (Section 4.1 explicitly restricts benefits to eligible full-time staff).',
  },
];
