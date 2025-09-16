import React, { useMemo } from 'react';
import { Trip, Expense } from '../types';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { useData } from '../context/DataContext';

interface CategoryChartProps {
    expenses: Expense[];
    trip: Trip;
}

const CategoryChart: React.FC<CategoryChartProps> = ({ expenses, trip }) => {
    const { convert, formatCurrency } = useCurrencyConverter();
    const { data: { categories } } = useData();

    const dataByCategory = useMemo(() => {
        const spending: { [key: string]: number } = {};
        expenses.forEach(exp => {
            const amountInMain = convert(exp.amount, exp.currency, trip.mainCurrency);
            spending[exp.category] = (spending[exp.category] || 0) + amountInMain;
        });

        const totalSpent = Object.values(spending).reduce((sum, amount) => sum + amount, 0);

        return Object.entries(spending)
            .map(([categoryName, amount]) => ({
                name: categoryName,
                amount,
                percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
                icon: categories.find(c => c.name === categoryName)?.icon || '💸',
            }))
            .sort((a, b) => b.amount - a.amount);

    }, [expenses, trip.mainCurrency, convert, categories]);

    if (expenses.length === 0) {
        return null; // Don't show the chart if there are no expenses
    }
    
    // Simple color palette
    const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];

    return (
        <div className="bg-surface p-6 rounded-3xl shadow-sm">
            <h2 className="text-xl font-semibold text-on-surface mb-4">Spese per Categoria</h2>
            <div className="space-y-3">
                {dataByCategory.map((item, index) => (
                    <div key={item.name}>
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-on-surface-variant flex items-center gap-2">
                                {item.icon} {item.name}
                            </span>
                            <span className="font-semibold text-on-surface">{formatCurrency(item.amount, trip.mainCurrency)}</span>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-2 mt-1">
                            <div
                                className={`${colors[index % colors.length]} h-2 rounded-full`}
                                style={{ width: `${item.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryChart;
