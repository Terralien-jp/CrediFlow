import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, CreditCard, Menu } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { CardManager } from './components/CardManager';
import { Card, Payment, BankSummary, ViewMode, getActualDate } from './types';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    // Filter payments for the currently selected month
    const monthlyPayments = payments.filter(p => 
        p.month === currentDate.getMonth() && 
        p.year === currentDate.getFullYear()
    );

    monthlyPayments.forEach(payment => {
      const card = cards.find(c => c.id === payment.cardId);
      if (!card) return;

      // Group by Bank Name AND Account Holder to distinguish separate accounts
      const accountHolder = card.paymentSourceOwner || card.owner;
      const groupKey = `${card.bankName}-${accountHolder}`;

      // Calculate actual payment date for this specific month
      const actualPaymentDay = getActualDate(currentDate.getFullYear(), currentDate.getMonth(), card.paymentDay);
      const paymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), actualPaymentDay);

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

  const NavItem = ({ mode, icon: Icon, label }: { mode: ViewMode, icon: any, label: string }) => (
    <button
      onClick={() => {
        setViewMode(mode);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all duration-200
        ${viewMode === mode 
          ? 'bg-brand-50 text-brand-700 font-bold shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }
      `}
    >
      <Icon className={`w-5 h-5 ${viewMode === mode ? 'text-brand-600' : 'text-slate-400'}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-6 fixed h-full z-10">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-200">
            C
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">CrediFlow</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem mode="dashboard" icon={LayoutDashboard} label="ダッシュボード" />
          <NavItem mode="calendar" icon={CalendarIcon} label="カレンダー" />
          <NavItem mode="cards" icon={CreditCard} label="カード・請求管理" />
        </nav>

        <div className="text-xs text-slate-400 px-4">
          <p>&copy; 2024 CrediFlow</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="font-bold text-slate-800">CrediFlow</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white absolute top-20 left-4 right-4 rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-4">
             <nav className="space-y-2">
                <NavItem mode="dashboard" icon={LayoutDashboard} label="ダッシュボード" />
                <NavItem mode="calendar" icon={CalendarIcon} label="カレンダー" />
                <NavItem mode="cards" icon={CreditCard} label="カード・請求管理" />
            </nav>
          </div>
        )}

        {/* Content Area */}
        <div className="max-w-5xl mx-auto">
          {viewMode === 'dashboard' && (
            <Dashboard 
              bankSummaries={bankSummaries} 
              cards={cards}
              currentDate={currentDate}
              onTogglePaid={togglePaymentPaidStatus}
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

      {/* Mobile Bottom Bar (Alternative to top menu if preferred, sticking to top hamburger for now) */}
    </div>
  );
};

export default App;