
import React from 'react';
import { Card, Payment, getActualDate } from '../types';
import { format, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay } from 'date-fns';
import ja from 'date-fns/locale/ja';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface CalendarViewProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  cards: Card[];
  payments: Payment[];
  onTogglePaid: (paymentId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  currentDate, 
  onMonthChange, 
  cards, 
  payments,
  onTogglePaid
}) => {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Generate blank days for start of month padding
  const startDayOfWeek = getDay(monthStart); // 0 (Sun) to 6 (Sat)
  const paddingDays = Array.from({ length: startDayOfWeek });

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    onMonthChange(newDate);
  };

  const getPaymentsForDay = (day: Date) => {
    const dayNum = day.getDate();
    const currentMonth = day.getMonth();
    const currentYear = day.getFullYear();

    return payments.filter(p => {
        const card = cards.find(c => c.id === p.cardId);
        if (!card) return false;
        
        // Use the helper to resolve "99" (End of Month) or clamp dates like 31st to 30th
        const expectedDay = getActualDate(currentYear, currentMonth, card.paymentDay);

        // Check if this payment matches the calculated day and the month matches
        return expectedDay === dayNum && p.month === currentMonth && p.year === currentYear;
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-full text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-800">
          {format(currentDate, 'yyyy年 M月', { locale: ja })}
        </h2>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-full text-slate-500">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div key={i} className={`py-2 text-center text-xs font-semibold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[100px] border-b border-r border-slate-50 bg-slate-50/30"></div>
        ))}

        {daysInMonth.map((day) => {
          const dayPayments = getPaymentsForDay(day);
          const isToday = isSameDay(day, new Date());
          const totalAmount = dayPayments.reduce((acc, p) => acc + p.amount, 0);

          return (
            <div 
              key={day.toISOString()} 
              className={`min-h-[100px] p-1 border-b border-r border-slate-100 relative group transition-colors hover:bg-slate-50
                ${isToday ? 'bg-blue-50/50' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                 <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium
                    ${isToday ? 'bg-brand-500 text-white' : 'text-slate-700'}
                 `}>
                  {format(day, 'd')}
                 </span>
                 {totalAmount > 0 && (
                   <span className="text-[10px] font-bold text-slate-400">Total: ¥{(totalAmount / 10000).toFixed(1)}万</span>
                 )}
              </div>

              <div className="mt-1 space-y-1">
                {dayPayments.map(payment => {
                  const card = cards.find(c => c.id === payment.cardId);
                  return (
                    <div 
                      key={payment.id} 
                      onClick={() => onTogglePaid(payment.id)}
                      className={`
                        text-[10px] p-1.5 rounded cursor-pointer transition-all border
                        ${payment.isPaid 
                          ? 'bg-slate-100 text-slate-400 border-transparent decoration-slate-400' 
                          : `${card?.color.replace('bg-', 'bg-').replace('500', '50')} ${card?.color.replace('bg-', 'text-').replace('500', '700')} ${card?.color.replace('bg-', 'border-').replace('500', '200')}`
                        }
                      `}
                    >
                       <div className="flex items-center justify-between">
                         <span className={`font-semibold truncate ${payment.isPaid ? 'line-through' : ''}`}>
                           {card?.name}
                         </span>
                         {payment.isPaid && <Check className="w-3 h-3" />}
                       </div>
                       <div className={`${payment.isPaid ? 'line-through' : ''}`}>
                         ¥{payment.amount.toLocaleString()}
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
};
