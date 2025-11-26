import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, CreditCard } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { CardManager } from './components/CardManager';
import { Card, Payment, BankSummary, ViewMode, getActualDate } from './types';
import { addMonths } from 'date-fns';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  
  // Mock initial data load (in real app, use localStorage or DB)
  const [cards, setCards] = useState<Card[]>(() => {
    const saved = localStorage.getItem('crediflow_cards');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default initial data
    return [
        { id: '1', name: 'メインカード (楽天)', bankName: '楽天銀行', closingDay: 27, paymentDay: 27, color: 'bg-rose-500', owner: '自分', paymentSourceOwner: '自分' },
        { id: '2', name: '家族カード (JCB)', bankName: '三井住友銀行', closingDay: 15, paymentDay: 10, color: 'bg-emerald-500', owner: '妻', paymentSourceOwner: '妻' }
    ];
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
     const saved = localStorage.getItem('crediflow_payments');
     return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('crediflow_cards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('crediflow_payments', JSON.stringify(payments));
  }, [payments]);


  // --- Logic to Aggregate Data ---
  const bankSummaries: BankSummary[] = useMemo(() => {
    const summaryMap = new Map<string, BankSummary>();

    const nextMonthDate = addMonths(currentDate, 1);

    // Filter payments for Current Month AND Next Month
    const targetPayments = payments.filter(p => {
        const isCurrent = p.month === currentDate.getMonth() && p.year === currentDate.getFullYear();
        const isNext = p.month === nextMonthDate.getMonth() && p.year === nextMonthDate.getFullYear();
        return isCurrent || isNext;
    });

    targetPayments.forEach(payment => {
      const card = cards.find(c => c.id === payment.cardId);
      if (!card) return;

      // Group by Bank Name AND Account Holder to distinguish separate accounts
      const accountHolder = card.paymentSourceOwner || card.owner;
      const groupKey = `${card.bankName}-${accountHolder}`;

      // Calculate actual payment date for this specific month
      const actualPaymentDay = getActualDate(payment.year, payment.month, card.paymentDay);
      const paymentDate = new Date(payment.year, payment.month, actualPaymentDay);

      if (!summaryMap.has(groupKey)) {
        summaryMap.set(groupKey, {
          id: groupKey,
          bankName: card.bankName,
          accountHolder: accountHolder,
          totalAmount: 0,
          payments: [],
          earliestPaymentDate: paymentDate
        });
      }

      const summary = summaryMap.get(groupKey)!;
      summary.totalAmount += payment.amount;
      summary.payments.push(payment);
      
      // Update earliest date if this payment is earlier
      if (paymentDate < summary.earliestPaymentDate) {
        summary.earliestPaymentDate = paymentDate;
      }
    });

    return Array.from(summaryMap.values());
  }, [cards, payments, currentDate]);

  const togglePaymentPaidStatus = (id: string) => {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, isPaid: !p.isPaid } : p));
  };

  const NavItem = ({ mode, icon: Icon, label }: { mode: ViewMode, icon: any, label: string }) => {
    const isActive = viewMode === mode;
    return (
      <button
        onClick={() => setViewMode(mode)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-slate-800 text-white shadow-md' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }
        `}
      >
        <Icon className={`w-4 h-4 ${isActive ? 'text-brand-300' : ''}`} />
        <span className="font-medium text-sm">{label}</span>
      </button>
    );
  };

  const MobileNavItem = ({ mode, icon: Icon, label }: { mode: ViewMode, icon: any, label: string }) => {
    const isActive = viewMode === mode;
    return (
      <button
        onClick={() => setViewMode(mode)}
        className={`flex flex-col items-center justify-center py-2 px-4 transition-colors w-full
          ${isActive ? 'text-brand-600' : 'text-slate-400'}
        `}
      >
        <div className={`p-1 rounded-full mb-1 transition-all ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}>
           <Icon className={`w-6 h-6 ${isActive ? 'fill-brand-600/20' : ''}`} />
        </div>
        <span className="text-[10px] font-bold">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-200">
            C
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">CrediFlow</h1>
        </div>
        
        <nav className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/50">
          <NavItem mode="dashboard" icon={LayoutDashboard} label="ダッシュボード" />
          <NavItem mode="calendar" icon={CalendarIcon} label="カレンダー" />
          <NavItem mode="cards" icon={CreditCard} label="カード・請求管理" />
        </nav>

        <div className="w-[120px] flex justify-end">
           {/* Placeholder for future user menu */}
           <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
             <span className="text-xs font-bold">U</span>
           </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-center py-3 bg-white border-b border-slate-200 sticky top-0 z-20">
         <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-md flex items-center justify-center text-white font-bold text-sm">C</div>
            <h1 className="font-bold text-slate-800 text-lg">CrediFlow</h1>
         </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-12">
        <div className="animate-fade-in">
          {viewMode === 'dashboard' && (
            <Dashboard 
              bankSummaries={bankSummaries} 
              cards={cards}
              currentDate={currentDate}
              onTogglePaid={togglePaymentPaidStatus}
              payments={payments}
              onMonthChange={setCurrentDate}
            />
          )}

          {viewMode === 'calendar' && (
            <CalendarView 
              currentDate={currentDate} 
              onMonthChange={setCurrentDate} 
              cards={cards} 
              payments={payments}
              onTogglePaid={togglePaymentPaidStatus}
            />
          )}

          {viewMode === 'cards' && (
            <CardManager 
              cards={cards} 
              setCards={setCards} 
              payments={payments}
              setPayments={setPayments}
              currentDate={currentDate}
              onTogglePaid={togglePaymentPaidStatus}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <MobileNavItem mode="dashboard" icon={LayoutDashboard} label="ホーム" />
        <MobileNavItem mode="calendar" icon={CalendarIcon} label="カレンダー" />
        <MobileNavItem mode="cards" icon={CreditCard} label="カード管理" />
      </nav>

    </div>
  );
};

export default App;