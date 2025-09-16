// FIX: Implemented BudgetTrendChart component to resolve module not found error.
import React, { useMemo } from 'react';
import { Trip, Expense } from '../types';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';

interface BudgetTrendChartProps {
    expenses: Expense[];
    trip: Trip;
}

const BudgetTrendChart: React.FC<BudgetTrendChartProps> = ({ expenses, trip }) => {
    const { convert, formatCurrency } = useCurrencyConverter();

    const chartData = useMemo(() => {
        if (!trip || expenses.length === 0) return null;

        const tripStart = new Date(trip.startDate);
        const tripEnd = new Date(trip.endDate);
        
        // Clamp to today if trip is ongoing
        const today = new Date();
        const lastDate = today < tripEnd ? today : tripEnd;

        // Create a map of dates to daily spending
        const dailySpending = new Map<string, number>();
        expenses.forEach(expense => {
            const date = new Date(expense.date).toISOString().split('T')[0];
            const amountInMain = convert(expense.amount, expense.currency, trip.mainCurrency);
            dailySpending.set(date, (dailySpending.get(date) || 0) + amountInMain);
        });

        // Generate data points for each day of the trip up to lastDate
        const dataPoints = [];
        let cumulativeSpent = 0;
        let currentDate = new Date(tripStart);

        while (currentDate <= lastDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const spentToday = dailySpending.get(dateStr) || 0;
            cumulativeSpent += spentToday;
            dataPoints.push({
                date: new Date(currentDate),
                spent: spentToday,
                cumulative: cumulativeSpent,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const totalDays = dataPoints.length > 0 ? dataPoints.length : 1;
        const idealDailyBurn = trip.totalBudget / totalDays;
        
        return { dataPoints, idealDailyBurn, totalDays };

    }, [expenses, trip, convert]);

    if (!chartData) {
        return null; // Don't render if no data
    }
    
    const { dataPoints, idealDailyBurn } = chartData;
    const maxCumulative = Math.max(trip.totalBudget, ...dataPoints.map(d => d.cumulative));

    return (
        <div className="bg-surface p-6 rounded-3xl shadow-sm">
            <h2 className="text-xl font-semibold text-on-surface mb-4">Andamento Budget</h2>
            
            <div className="w-full h-48 relative overflow-hidden" aria-label="Grafico andamento budget">
                {/* Background lines */}
                <div className="absolute top-0 left-0 w-full h-full border-b border-l border-outline/50 grid grid-rows-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="border-t border-outline/50"></div>)}
                </div>

                {/* Ideal spending line */}
                <svg width="100%" height="100%" className="absolute top-0 left-0" preserveAspectRatio="none">
                    <line 
                        x1="0" 
                        y1={ (1 - (idealDailyBurn / maxCumulative)) * 100 + '%'}
                        x2="100%" 
                        y2={ (1 - ( (idealDailyBurn * dataPoints.length) / maxCumulative)) * 100 + '%'} 
                        strokeDasharray="4 4"
                        stroke="var(--md-sys-color-tertiary)"
                        strokeWidth="2"
                    />
                </svg>

                {/* Actual spending path */}
                <svg width="100%" height="100%" className="absolute top-0 left-0" preserveAspectRatio="none">
                     <defs>
                        <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.4"/>
                          <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    <path
                        d={`M 0,100 ` + dataPoints.map((p, i) => {
                            const x = (i / (dataPoints.length -1)) * 100;
                            const y = 100 - (p.cumulative / maxCumulative) * 100;
                            return `L ${x},${y}`;
                        }).join(' ') + ` L 100,${100 - (dataPoints[dataPoints.length-1].cumulative / maxCumulative) * 100} L 100,100 Z`}
                        fill="url(#spendingGradient)"
                        stroke="var(--md-sys-color-primary)"
                        strokeWidth="2.5"
                    />
                </svg>

                {/* Y-Axis Labels */}
                 <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-xs text-on-surface-variant -ml-1 pr-2 text-right w-full" style={{pointerEvents: 'none'}}>
                    <span>{formatCurrency(maxCumulative, trip.mainCurrency)}</span>
                    <span>0</span>
                </div>
            </div>

            <div className="flex justify-between text-xs text-on-surface-variant mt-2 px-1">
                <span>{new Date(trip.startDate).toLocaleDateString('it-IT', {day:'2-digit', month: 'short'})}</span>
                <span>{new Date(trip.endDate).toLocaleDateString('it-IT', {day:'2-digit', month: 'short'})}</span>
            </div>
             <div className="mt-4 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-primary"></div>
                    <span>Spesa Cumulativa</span>
                </div>
                <div className="flex items-center gap-2">
                     <svg width="12" height="12"><line x1="0" y1="6" x2="12" y2="6" strokeDasharray="2 2" stroke="var(--md-sys-color-tertiary)" strokeWidth="2"/></svg>
                    <span>Andamento Ideale</span>
                </div>
            </div>
        </div>
    );
};

export default BudgetTrendChart;
