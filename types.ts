
export interface Card {
  id: string;
  name: string;
  bankName: string;
  closingDay: number; // e.g., 15. 99 represents "End of Month"
  paymentDay: number; // e.g., 27. 99 represents "End of Month"
  color: string;
  owner: string; // カード利用者: '自分', '妻', '家計' etc.
  paymentSourceOwner?: string; // 引落口座名義: '自分', '妻', '家計' (省略時はownerと同じ)
}

export interface Payment {
  id: string;
  cardId: string;
  amount: number;
  month: number; // 0-11
  year: number;
  isConfirmed: boolean; // Has the user verified the amount?
  isPaid: boolean; // Has the money left the account?
  notes?: string;
}

export interface BankSummary {
  id: string; // unique key for grouping
  bankName: string;
  accountHolder: string; // The owner of the bank account
  totalAmount: number;
  payments: Payment[];
  earliestPaymentDate: Date;
}

export type ViewMode = 'dashboard' | 'calendar' | 'cards';

export const CARD_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-slate-600',
];

export const END_OF_MONTH = 99;

/**
 * Calculates the actual calendar date given a setting day (which might be END_OF_MONTH)
 * and the target year/month.
 */
export const getActualDate = (year: number, month: number, settingDay: number): number => {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate(); // Get last day (28-31)
  
  if (settingDay === END_OF_MONTH) {
    return lastDayOfMonth;
  }
  
  // If set to 31 but month only has 30, clamp to 30.
  // Standard credit card logic might vary (move to next month), 
  // but for personal finance prep, clamping to month-end is safer.
  return Math.min(settingDay, lastDayOfMonth);
};
