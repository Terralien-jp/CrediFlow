import React, { useState } from 'react';
import { Card, Payment, CARD_COLORS, END_OF_MONTH } from '../types';
import { Trash2, Plus, CreditCard, Sparkles, X, User, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { parsePaymentText } from '../services/geminiService';
import { addMonths, format, getDate } from 'date-fns';
import ja from 'date-fns/locale/ja';

interface CardManagerProps {
  cards: Card[];
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  currentDate: Date;
  onTogglePaid: (id: string) => void;
  savedBanks: string[];
  onAddBank: (bankName: string) => void;
}

// Helper component for Day Selection
const DaySelect = ({ value, onChange, label }: { value: number | undefined, onChange: (val: number) => void, label: string }) => (
  <div className="flex-1">
    <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
    <select 
      className="w-full border p-2 rounded-md text-sm bg-white text-slate-900"
      value={value?.toString()} 
      onChange={e => onChange(Number(e.target.value))}
    >
      <option value={END_OF_MONTH.toString()}>月末</option>
      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
        <option key={day} value={day.toString()}>{day}日</option>
      ))}
    </select>
  </div>
);

const formatDay = (day: number) => day === END_OF_MONTH ? '月末' : `${day}日`;

export const CardManager: React.FC<CardManagerProps> = ({ 
  cards, 
  setCards, 
  payments, 
  setPayments, 
  currentDate, 
  onTogglePaid,
  savedBanks,
  onAddBank
}) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCard, setNewCard] = useState<Partial<Card>>({ color: CARD_COLORS[0], owner: '自分', paymentSourceOwner: '自分', closingDay: 1, paymentDay: 27 });
  
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  
  // Manual Payment State
  const [manualPayment, setManualPayment] = useState<Partial<Payment>>({});
  // FIX: Initialize with real today, not the viewed calendar date
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  // --- Card Logic ---
  const handleSaveCard = () => {
    if (!newCard.name || !newCard.bankName || !newCard.closingDay || !newCard.paymentDay) return;
    
    // Save bank to ledger if new
    if (newCard.bankName) {
      onAddBank(newCard.bankName);
    }

    const card: Card = {
      id: crypto.randomUUID(),
      name: newCard.name,
      bankName: newCard.bankName,
      closingDay: Number(newCard.closingDay),
      paymentDay: Number(newCard.paymentDay),
      color: newCard.color || CARD_COLORS[0],
      owner: newCard.owner || '自分',
      paymentSourceOwner: newCard.paymentSourceOwner || newCard.owner || '自分'
    };
    setCards([...cards, card]);
    setIsAddingCard(false);
    setNewCard({ color: CARD_COLORS[0], owner: '自分', paymentSourceOwner: '自分', closingDay: 1, paymentDay: 27 });
  };

  const deleteCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
    setPayments(payments.filter(p => p.cardId !== id));
  };

  const handleOwnerChange = (val: string) => {
    setNewCard(prev => ({
        ...prev, 
        owner: val,
    }));
  };

  // --- Payment Logic ---
  const handleAiParse = async () => {
    if (!aiInput.trim()) return;
    setIsProcessingAi(true);
    // FIX: Pass real today as reference for intelligent date parsing
    const result = await parsePaymentText(aiInput, cards, new Date());
    setIsProcessingAi(false);
    
    if (result) {
      setManualPayment({
        amount: result.amount,
        cardId: result.cardId || (cards.length > 0 ? cards[0].id : undefined),
      });

      // If AI detected a specific month/year, use it
      if (result.paymentYear && result.paymentMonth) {
        // AI returns 1-12 for month, JS uses 0-11
        setTargetDate(new Date(result.paymentYear, result.paymentMonth - 1, 1));
      } else if (result.cardId) {
        // Fallback: If card is identified but no specific month, use logic based on card payment day
        checkAndSetAutoDate(result.cardId);
      }
    } else {
      alert("読み取りに失敗しました。手動で入力してください。");
    }
  };

  const checkAndSetAutoDate = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // FIX: Always use "Real Today" for logic, not the "Viewed Date" in calendar
    const today = new Date();
    const todayDay = getDate(today);
    const pDay = card.paymentDay === END_OF_MONTH ? 31 : card.paymentDay;
    
    // If today is past the payment day (e.g., Today 20th, Payment 10th),
    // it's likely for next month.
    if (todayDay > pDay) {
      setTargetDate(addMonths(today, 1));
    } else {
      setTargetDate(today);
    }
  };

  const handleCardSelect = (cardId: string) => {
    setManualPayment(prev => ({ ...prev, cardId }));
    checkAndSetAutoDate(cardId);
  };

  const handleSavePayment = () => {
    if (!manualPayment.cardId || !manualPayment.amount) return;
    
    const payment: Payment = {
      id: crypto.randomUUID(),
      cardId: manualPayment.cardId,
      amount: Number(manualPayment.amount),
      month: targetDate.getMonth(), // 0-11
      year: targetDate.getFullYear(),
      isConfirmed: true,
      isPaid: false,
    };
    setPayments([...payments, payment]);
    setIsAddingPayment(false);
    setManualPayment({});
    setAiInput('');
    // Reset target date to today after save
    setTargetDate(new Date());
  };

  const deletePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  // Show all payments sorted by date (newest/future first)
  const sortedPayments = [...payments].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    // Secondary sort by card name for stability
    const cardA = cards.find(c => c.id === a.cardId)?.name || '';
    const cardB = cards.find(c => c.id === b.cardId)?.name || '';
    return cardA.localeCompare(cardB);
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      
      {/* --- Credit Cards Section --- */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            登録カード
          </h2>
          <button 
            onClick={() => setIsAddingCard(true)}
            className="flex items-center gap-1 text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition"
          >
            <Plus className="w-4 h-4" /> カード追加
          </button>
        </div>

        {isAddingCard && (
          <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 mb-4">
            <h3 className="text-sm font-bold mb-3 text-slate-700">新規カード登録</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-full md:col-span-1">
                 <label className="block text-xs font-bold text-slate-700 mb-1">カード名</label>
                 <input 
                    placeholder="例: 楽天カード" 
                    className="w-full border p-2 rounded-md text-sm text-slate-900 bg-white"
                    value={newCard.name || ''}
                    onChange={e => setNewCard({...newCard, name: e.target.value})}
                  />
              </div>
              <div className="col-span-full md:col-span-1">
                 <label className="block text-xs font-bold text-slate-700 mb-1">引落口座 (銀行名)</label>
                 <input 
                    list="bank-options"
                    placeholder="例: 三井住友銀行" 
                    className="w-full border p-2 rounded-md text-sm text-slate-900 bg-white"
                    value={newCard.bankName || ''}
                    onChange={e => setNewCard({...newCard, bankName: e.target.value})}
                  />
                  <datalist id="bank-options">
                    {savedBanks.map(bank => (
                      <option key={bank} value={bank} />
                    ))}
                  </datalist>
              </div>

              <div className="flex gap-2">
                 <DaySelect 
                   label="締日" 
                   value={newCard.closingDay} 
                   onChange={(val) => setNewCard({...newCard, closingDay: val})} 
                 />
                 <DaySelect 
                   label="支払日" 
                   value={newCard.paymentDay} 
                   onChange={(val) => setNewCard({...newCard, paymentDay: val})} 
                 />
              </div>

              <div className="col-span-full md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {/* Card Owner */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> カード利用者
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['自分', '妻', '家計'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleOwnerChange(opt)}
                        className={`px-2 py-1 text-xs rounded border transition ${
                          newCard.owner === opt 
                            ? 'bg-slate-700 text-white border-slate-700' 
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <input 
                      placeholder="直接入力"
                      className="border p-1 rounded-md text-xs w-full bg-white text-slate-900"
                      value={newCard.owner || ''}
                      onChange={e => handleOwnerChange(e.target.value)}
                    />
                </div>

                {/* Bank Account Owner */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> 口座名義 (支払元)
                  </label>
                   <p className="text-[10px] text-slate-500 mb-1">※別々の口座として管理したい場合に指定</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['自分', '妻', '家計'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setNewCard({...newCard, paymentSourceOwner: opt})}
                        className={`px-2 py-1 text-xs rounded border transition ${
                          newCard.paymentSourceOwner === opt 
                            ? 'bg-brand-600 text-white border-brand-600' 
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                   <input 
                      placeholder="直接入力"
                      className="border p-1 rounded-md text-xs w-full bg-white text-slate-900"
                      value={newCard.paymentSourceOwner || ''}
                      onChange={e => setNewCard({...newCard, paymentSourceOwner: e.target.value})}
                    />
                </div>
              </div>

              <div className="col-span-full md:col-span-2">
                 <label className="block text-xs font-bold text-slate-700 mb-1">カラー</label>
                 <div className="flex gap-2 items-center">
                    {CARD_COLORS.map(c => (
                      <button 
                        key={c} 
                        onClick={() => setNewCard({...newCard, color: c})}
                        className={`w-6 h-6 rounded-full ${c} ${newCard.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                      />
                    ))}
                 </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAddingCard(false)} className="text-slate-600 text-sm px-3 py-1">キャンセル</button>
              <button onClick={handleSaveCard} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg font-medium">保存</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 relative group overflow-hidden">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${card.color}`}></div>
              <div className="pl-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800">{card.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <User className="w-3 h-3" /> 利用: {card.owner}
                        </span>
                        <span className="text-slate-300">/</span>
                       <span className="text-[10px] bg-blue-50 text-brand-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-100">
                          <Building2 className="w-3 h-3" /> 口座: {card.paymentSourceOwner || card.owner}
                        </span>
                    </div>
                  </div>
                  <button onClick={() => deleteCard(card.id)} className="text-slate-300 hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-slate-600 mt-2 font-semibold">{card.bankName}</p>

                <div className="mt-2 flex items-center gap-4 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg inline-flex w-full justify-around">
                   <div className="flex flex-col items-center">
                     <span className="text-slate-500 text-[10px]">締日</span>
                     <span className="font-medium text-slate-700">{formatDay(card.closingDay)}</span>
                   </div>
                   <div className="w-px h-6 bg-slate-200"></div>
                   <div className="flex flex-col items-center">
                     <span className="text-slate-500 text-[10px]">支払日</span>
                     <span className="font-medium text-slate-700">{formatDay(card.paymentDay)}</span>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              カードが登録されていません
            </div>
          )}
        </div>
      </section>

      {/* --- Monthly Amounts Section --- */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">請求額の入力</h2>
          <button 
            onClick={() => setIsAddingPayment(true)}
            className="flex items-center gap-1 text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition"
          >
            <Plus className="w-4 h-4" /> 請求額を追加
          </button>
        </div>

        {isAddingPayment && (
          <div className="bg-white p-6 rounded-xl shadow-xl border border-brand-100 mb-6 relative overflow-hidden">
            <button onClick={() => setIsAddingPayment(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
               <X className="w-5 h-5" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* AI Parser */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-brand-600 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI 自動入力</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  メールやSMSの通知を貼り付けると、AIが金額とカードを判別します。
                </p>
                <textarea 
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition text-slate-900 bg-white"
                  rows={3}
                  placeholder="例: 【楽天カード】10月分のご請求金額は54,300円です。お支払日は10月27日です。"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                ></textarea>
                <button 
                  onClick={handleAiParse}
                  disabled={isProcessingAi || !aiInput}
                  className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isProcessingAi ? '解析中...' : 'テキストから読み取る'}
                </button>
              </div>

              {/* Manual Form */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
                
                {/* Target Month Selector */}
                <div>
                   <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                     <Calendar className="w-3 h-3" />
                     支払対象月
                   </label>
                   <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <button onClick={() => setTargetDate(addMonths(targetDate, -1))} className="p-1 hover:bg-white rounded shadow-sm">
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                      </button>
                      <span className="font-bold text-slate-800 text-sm">
                        {format(targetDate, 'yyyy年 M月', { locale: ja })}
                      </span>
                      <button onClick={() => setTargetDate(addMonths(targetDate, 1))} className="p-1 hover:bg-white rounded shadow-sm">
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1">カード選択</label>
                   <select 
                    className="w-full border p-2 rounded-lg text-sm bg-white text-slate-900"
                    value={manualPayment.cardId || ''}
                    onChange={e => handleCardSelect(e.target.value)}
                   >
                     <option value="">選択してください</option>
                     {cards.map(c => (
                       <option key={c.id} value={c.id}>{c.name} ({c.owner})</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1">請求金額</label>
                   <div className="relative">
                     <span className="absolute left-3 top-2 text-slate-600 text-sm">¥</span>
                     <input 
                      type="text" 
                      inputMode="numeric"
                      pattern="\d*"
                      className="w-full border p-2 pl-7 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white"
                      placeholder="0"
                      value={manualPayment.amount !== undefined ? manualPayment.amount : ''}
                      onChange={e => {
                        let val = e.target.value;
                        val = val.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                        val = val.replace(/[^0-9]/g, '');
                        
                        setManualPayment({
                          ...manualPayment, 
                          amount: val === '' ? undefined : Number(val)
                        });
                      }}
                     />
                   </div>
                </div>
                <button 
                  onClick={handleSavePayment}
                  disabled={!manualPayment.cardId || !manualPayment.amount}
                  className="w-full bg-brand-600 text-white font-bold py-2 rounded-lg shadow-lg shadow-brand-200 hover:bg-brand-700 transition disabled:opacity-50 mt-2"
                >
                  決定
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List of current payments */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
           {sortedPayments.length === 0 ? (
             <div className="p-8 text-center text-slate-400 text-sm">
               請求情報はまだ登録されていません
             </div>
           ) : (
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                 <tr>
                   <th className="p-4">対象月</th>
                   <th className="p-4">カード名</th>
                   <th className="p-4">金額</th>
                   <th className="p-4">ステータス</th>
                   <th className="p-4 text-right">操作</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {sortedPayments.map(p => {
                   const card = cards.find(c => c.id === p.cardId);
                   return (
                     <tr key={p.id} className="hover:bg-slate-50/50 transition">
                       <td className="p-4 font-bold text-slate-700 whitespace-nowrap">
                         {format(new Date(p.year, p.month), 'yyyy年M月', { locale: ja })}
                       </td>
                       <td className="p-4 font-medium text-slate-800">
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${card?.color}`}></div>
                           <span className={p.isPaid ? 'line-through text-slate-400' : ''}>{card?.name}</span>
                           {card?.owner && <span className="text-xs text-slate-500">({card.owner})</span>}
                         </div>
                       </td>
                       <td className={`p-4 ${p.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'}`}>¥{p.amount.toLocaleString()}</td>
                       <td className="p-4">
                         <button 
                           onClick={() => onTogglePaid(p.id)}
                           className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer hover:opacity-80 active:scale-95
                             ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                           `}
                           title="クリックしてステータスを変更"
                         >
                           {p.isPaid ? '支払済' : '未払'}
                         </button>
                       </td>
                       <td className="p-4 text-right">
                         <button onClick={() => deletePayment(p.id)} className="text-slate-400 hover:text-red-500">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           )}
        </div>
      </section>

    </div>
  );
};