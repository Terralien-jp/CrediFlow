import React, { useState, useMemo } from 'react';
import { Card, BankSummary, Payment } from '../types';
import { format, addMonths } from 'date-fns';
import ja from 'date-fns/locale/ja';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, AlertCircle, CheckCircle2, Users, Building2, Circle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { generateFinancialAdvice } from '../services/geminiService';

interface DashboardProps {
  bankSummaries: BankSummary[];
  cards: Card[];
  currentDate: Date;
  onTogglePaid: (id: string) => void;
  payments: Payment[]; 
  onMonthChange: (date: Date) => void;
  bankReadiness: Record<string, boolean>;
  onToggleBankReadiness: (bankId: string) => void;
}

const COLORS = ['#0ea5e9', '#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ 
  bankSummaries, 
  cards, 
  currentDate, 
  onTogglePaid,
  payments,
  onMonthChange,
  bankReadiness,
  onToggleBankReadiness
}) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const nextMonthDate = addMonths(currentDate, 1);

  // 1. Calculate Totals (Current & Next) from ALL payments (not just summaries)
  const currentMonthTotal = useMemo(() => {
    return payments
      .filter(p => p.month === currentDate.getMonth() && p.year === currentDate.getFullYear())
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments, currentDate]);

  const nextMonthTotal = useMemo(() => {
    return payments
      .filter(p => p.month === nextMonthDate.getMonth() && p.year === nextMonthDate.getFullYear())
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments, nextMonthDate]);

  // Calculate totals by Card Owner (User) for displayed banks
  const ownerTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    bankSummaries.forEach(bank => {
      bank.payments.forEach(payment => {
        const card = cards.find(c => c.id === payment.cardId);
        const owner = card?.owner || '未分類';
        totals[owner] = (totals[owner] || 0) + payment.amount;
      });
    });
    return totals;
  }, [bankSummaries, cards]);

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    const summaryForAi = bankSummaries.map(s => ({
      bankName: `${s.bankName} (${s.accountHolder})`,
      totalAmount: s.totalAmount,
      earliestPaymentDate: format(s.earliestPaymentDate, 'yyyy-MM-dd')
    }));
    const text = await generateFinancialAdvice(summaryForAi);
    setAdvice(text);
    setLoadingAdvice(false);
  };

  const pieData = bankSummaries.map(b => ({
    name: `${b.bankName} (${b.accountHolder})`,
    value: b.totalAmount
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-brand-600" />
          支払いスケジュール
        </h2>
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
          <button 
            onClick={() => onMonthChange(addMonths(currentDate, -1))}
            className="p-1.5 hover:bg-slate-50 rounded-md text-slate-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-3 font-bold text-slate-800 min-w-[100px] text-center">
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
          </span>
          <button 
            onClick={() => onMonthChange(addMonths(currentDate, 1))}
            className="p-1.5 hover:bg-slate-50 rounded-md text-slate-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Current Month Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-brand-500 border-y border-r border-slate-100 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-500"></span>
              当月 ({format(currentDate, 'M月', { locale: ja })})
            </span>
            <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-bold">準備対象</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
             <span className="text-3xl font-bold text-slate-800">¥{currentMonthTotal.toLocaleString()}</span>
          </div>
          
          {/* Owner Breakdown */}
          {Object.keys(ownerTotals).length > 0 && (
             <div className="flex flex-wrap gap-2 items-center mt-3 pt-3 border-t border-slate-50">
               {Object.entries(ownerTotals).map(([owner, amount]) => (
                 <div key={owner} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded text-xs text-slate-700 border border-slate-100">
                   <Users className="w-3 h-3 text-slate-400" />
                   <span className="font-bold">{owner}:</span>
                   <span>¥{amount.toLocaleString()}</span>
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Next Month Card (Display Only) */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              翌月 ({format(nextMonthDate, 'M月', { locale: ja })})
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
             <span className="text-3xl font-bold text-slate-600">¥{nextMonthTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200/50">
             見通しとして表示
          </p>
        </div>
      </div>

      {/* AI Advice Section */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-brand-50 p-2 rounded-full text-brand-600 mt-1">
              <SparklesIcon />
            </div>
            <div className="flex-1">
              <h3 className="text-slate-800 font-bold text-sm">AI キャッシュフロー・アシスタント</h3>
              {advice ? (
                <p className="text-slate-700 text-sm mt-1 leading-relaxed">{advice}</p>
              ) : (
                <p className="text-slate-500 text-xs mt-1">
                   銀行口座ごとの資金移動スケジュールや、今月・来月のバランスを分析します。
                </p>
              )}
            </div>
          </div>
          {!advice && (
            <button 
              onClick={handleGetAdvice}
              disabled={loadingAdvice}
              className="mt-3 w-full bg-white text-slate-700 hover:text-brand-700 text-xs font-bold py-2 rounded-lg border border-slate-200 hover:border-brand-200 hover:bg-brand-50 transition disabled:opacity-50"
            >
              {loadingAdvice ? '分析中...' : '資金スケジュールのアドバイスをもらう'}
            </button>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Breakdown List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-500" />
            口座別入金必要額 
            <span className="text-xs font-normal text-slate-500 ml-1">
              ({format(currentDate, 'M月', { locale: ja })} + {format(nextMonthDate, 'M月', { locale: ja })})
            </span>
          </h3>
          {bankSummaries.length === 0 ? (
            <div className="text-slate-500 text-sm py-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
              支払予定はありません
            </div>
          ) : (
            bankSummaries.map((bank, idx) => {
                const readinessKey = `${bank.id}_${format(currentDate, 'yyyy-MM')}`;
                const isReady = bankReadiness[readinessKey];

                // Group payments by month (yyyy-MM)
                const groupedPayments = bank.payments.reduce((acc, p) => {
                    const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(p);
                    return acc;
                }, {} as Record<string, Payment[]>);

                const sortedGroupKeys = Object.keys(groupedPayments).sort();

                return (
                  <div key={idx} className={`
                    p-4 rounded-xl shadow-sm border flex flex-col gap-3 transition-colors
                    ${isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}
                  `}>
                    <div className="flex justify-between items-start border-b border-slate-200/50 pb-2">
                      <div className="flex flex-col">
                        <span className={`font-bold ${isReady ? 'text-emerald-900' : 'text-slate-800'}`}>
                          {bank.bankName}
                        </span>
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded font-medium ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {bank.accountHolder}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {/* Check Readiness Button */}
                        <button 
                          onClick={() => onToggleBankReadiness(bank.id)}
                          className={`
                            flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border transition
                            ${isReady 
                                ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600' 
                                : 'bg-white text-slate-400 border-slate-300 hover:text-emerald-500 hover:border-emerald-500'
                            }
                          `}
                        >
                            <Check className="w-3 h-3" />
                            {isReady ? '残高OK' : '残高確認'}
                        </button>
                        <div className="text-right">
                            <span className={`font-bold text-xl block ${isReady ? 'text-emerald-700' : 'text-slate-900'}`}>
                              ¥{bank.totalAmount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400">2ヶ月合計</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`text-xs flex items-center gap-1 p-2 rounded-md border 
                        ${isReady ? 'bg-emerald-100/50 border-emerald-100' : 'bg-amber-50 border-amber-100'}
                    `}>
                      {isReady ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                      )}
                      <span className={isReady ? 'text-emerald-800' : 'text-slate-600'}>
                         {isReady ? '準備完了済みです' : '直近の準備期限: '}
                      </span>
                      {!isReady && (
                        <span className="font-bold text-slate-800">
                            {format(bank.earliestPaymentDate, 'M月d日 (E)', { locale: ja })}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 mt-1">
                      {sortedGroupKeys.map(key => {
                        const [year, month] = key.split('-').map(Number);
                        const paymentsInGroup = groupedPayments[key];
                        return (
                          <div key={key}>
                            <h4 className={`text-[10px] font-bold mb-1 border-l-2 pl-2 ${isReady ? 'text-emerald-700 border-emerald-300' : 'text-slate-500 border-slate-200'}`}>
                                {format(new Date(year, month), 'yyyy年 M月分', { locale: ja })}
                            </h4>
                            <div className="space-y-1">
                                {paymentsInGroup.map(p => {
                                    const card = cards.find(c => c.id === p.cardId);
                                    return (
                                        <div key={p.id} className={`flex justify-between items-center text-xs py-1 pl-2 ${isReady ? 'text-emerald-800' : 'text-slate-600'}`}>
                                            <div className={`flex flex-col ${p.isPaid ? 'opacity-50' : ''}`}>
                                                <span className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${card?.color || 'bg-gray-400'}`}></span>
                                                    <span className={`font-medium ${p.isPaid ? 'line-through' : ''}`}>{card?.name}</span>
                                                    <span className={`text-[10px] ${isReady ? 'text-emerald-600' : 'text-slate-400'}`}>({card?.owner})</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-medium ${p.isPaid ? 'line-through opacity-60' : ''}`}>¥{p.amount.toLocaleString()}</span>
                                                <button 
                                                onClick={() => onTogglePaid(p.id)}
                                                className={`transition focus:outline-none p-1 ${isReady ? 'text-emerald-400 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-500'}`}
                                                title={p.isPaid ? "未払に戻す" : "支払済にする"}
                                                >
                                                {p.isPaid ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                ) : (
                                                    <Circle className="w-5 h-5" />
                                                )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
            })
          )}
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[300px]">
          <h3 className="text-lg font-bold text-slate-800 mb-4">口座別負担割合 (2ヶ月分)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `¥${value.toLocaleString()}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: '#1e293b'
                  }}
                  itemStyle={{ color: '#1e293b' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);