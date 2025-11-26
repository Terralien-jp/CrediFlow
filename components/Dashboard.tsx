import React, { useState, useMemo } from 'react';
import { Card, BankSummary, Payment } from '../types';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, AlertCircle, CheckCircle2, ArrowRight, Users, Building2, Circle } from 'lucide-react';
import { generateFinancialAdvice } from '../services/geminiService';

interface DashboardProps {
  bankSummaries: BankSummary[];
  cards: Card[];
  currentDate: Date;
  onTogglePaid: (id: string) => void;
}

const COLORS = ['#0ea5e9', '#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ bankSummaries, cards, currentDate, onTogglePaid }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const totalMonthlyOutflow = bankSummaries.reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Calculate totals by Card Owner (User)
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
      {/* Hero Card: Total Outflow */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-slate-500 text-sm font-medium mb-2">今月の支払い総額</h2>
        <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-800">
                ¥{totalMonthlyOutflow.toLocaleString()}
            </span>
            <span className="text-slate-400 text-sm">
                {format(currentDate, 'M月', { locale: ja })}分
            </span>
          </div>

          {/* Owner Breakdown */}
          {Object.keys(ownerTotals).length > 0 && (
             <div className="flex flex-wrap gap-2 items-center">
               <span className="text-slate-300 hidden md:inline">|</span>
               {Object.entries(ownerTotals).map(([owner, amount]) => (
                 <div key={owner} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded text-xs text-slate-600 border border-slate-100">
                   <Users className="w-3 h-3 text-slate-400" />
                   <span className="font-bold">{owner}:</span>
                   <span>¥{amount.toLocaleString()}</span>
                 </div>
               ))}
             </div>
          )}
        </div>
        
        {/* AI Advice Section */}
        <div className="mt-6 bg-brand-50 rounded-xl p-4 border border-brand-100">
          <div className="flex items-start gap-3">
            <div className="bg-white p-2 rounded-full shadow-sm text-brand-600 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div className="flex-1">
              <h3 className="text-slate-800 font-bold text-sm">AI キャッシュフロー・アシスタント</h3>
              {advice ? (
                <p className="text-slate-700 text-sm mt-1 leading-relaxed">{advice}</p>
              ) : (
                <p className="text-slate-600 text-xs mt-1">
                   銀行口座ごとの資金移動スケジュールを分析します。
                </p>
              )}
            </div>
          </div>
          {!advice && (
            <button 
              onClick={handleGetAdvice}
              disabled={loadingAdvice}
              className="mt-3 w-full bg-white text-brand-600 text-xs font-bold py-2 rounded-lg shadow-sm border border-brand-100 hover:bg-brand-50 transition disabled:opacity-50"
            >
              {loadingAdvice ? '分析中...' : '資金スケジュールのアドバイスをもらう'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Breakdown List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-slate-500" />
            口座別必要資金
          </h3>
          {bankSummaries.length === 0 ? (
            <div className="text-slate-400 text-sm py-4">支払予定はありません</div>
          ) : (
            bankSummaries.map((bank, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{bank.bankName}</span>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                       <Building2 className="w-3 h-3" />
                       <span className="bg-slate-100 px-1.5 rounded">{bank.accountHolder}</span>
                    </div>
                  </div>
                  <span className="font-bold text-lg text-slate-800">¥{bank.totalAmount.toLocaleString()}</span>
                </div>
                
                <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-50 p-2 rounded-md">
                   <AlertCircle className="w-3 h-3 text-amber-500" />
                   <span>準備期限: </span>
                   <span className="font-bold text-slate-700">
                     {format(bank.earliestPaymentDate, 'M月d日 (E)', { locale: ja })}
                   </span>
                </div>

                <div className="space-y-1 mt-1 border-t border-slate-100 pt-2">
                  {bank.payments.map(p => {
                    const card = cards.find(c => c.id === p.cardId);
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs text-slate-500 py-1">
                         <div className={`flex flex-col ${p.isPaid ? 'opacity-50' : ''}`}>
                             <span className="flex items-center gap-1">
                               <span className={`w-2 h-2 rounded-full ${card?.color || 'bg-gray-400'}`}></span>
                               <span className={p.isPaid ? 'line-through' : ''}>{card?.name}</span>
                               <span className="text-[10px] text-slate-300">({card?.owner}利用)</span>
                             </span>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className={p.isPaid ? 'line-through text-slate-300' : ''}>¥{p.amount.toLocaleString()}</span>
                            <button 
                              onClick={() => onTogglePaid(p.id)}
                              className="text-slate-400 hover:text-brand-500 transition focus:outline-none"
                              title={p.isPaid ? "未払に戻す" : "支払済にする"}
                            >
                              {p.isPaid ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                              )}
                            </button>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[300px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">口座別割合</h3>
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
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};