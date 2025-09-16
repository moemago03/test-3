// FIX: Implemented Dashboard component to resolve module not found error.
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { Expense, Trip } from '../types';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import CategoryChart from './CategoryChart';
import CurrencyConverter from './CurrencyConverter';
import QuickExpense from './QuickExpense';
import FrequentExpenses from './FrequentExpenses';
import CategoryBudgetTracker from './CategoryBudgetTracker';

interface DashboardProps {
    activeTripId: string;
    onToggleSidebar: () => void;
}

const StatCard: React.FC<{ title: string; value: string; color: string; icon: string }> = ({ title, value, color, icon }) => (
    <div className={`p-4 rounded-2xl flex items-center gap-4 bg-surface-variant shadow-sm`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
            <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <div>
            <p className="text-sm text-on-surface-variant">{title}</p>
            <p className="text-xl font-bold text-on-surface">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ activeTripId, onToggleSidebar }) => {
    const { data } = useData();
    const { convert, formatCurrency } = useCurrencyConverter();
    const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

    const activeTrip = useMemo(() => data.trips.find(t => t.id === activeTripId), [data.trips, activeTripId]);

    const stats = useMemo(() => {
        if (!activeTrip) return { totalSpent: 0, budget: 0, remaining: 0, dailyAvg: 0 };
        
        const totalSpent = activeTrip.expenses.reduce((sum, exp) => sum + convert(exp.amount, exp.currency, activeTrip.mainCurrency), 0);
        const budget = activeTrip.totalBudget;
        const remaining = budget - totalSpent;
        
        const tripStart = new Date(activeTrip.startDate).getTime();
        const now = new Date().getTime();
        const tripEnd = new Date(activeTrip.endDate).getTime();
        
        let daysElapsed = (now - tripStart) / (1000 * 3600 * 24);
        if (now < tripStart) daysElapsed = 0;
        if (now > tripEnd) daysElapsed = (tripEnd - tripStart) / (1000 * 3600 * 24);
        daysElapsed = Math.max(1, Math.ceil(daysElapsed)); // At least one day

        const dailyAvg = totalSpent / daysElapsed;

        return { totalSpent, budget, remaining, dailyAvg };
    }, [activeTrip, convert]);
    
    const sortedExpenses = useMemo(() => {
        if (!activeTrip) return [];
        return [...activeTrip.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [activeTrip]);

    if (!activeTrip) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Viaggio non trovato.</h2>
                    <p>Seleziona un viaggio dal menu.</p>
                </div>
            </div>
        );
    }

    const openNewExpenseForm = (prefill: Partial<Omit<Expense, 'id'>> = {}) => {
        setEditingExpense({
            id: '', // Indicates new
            amount: prefill.amount || 0,
            currency: prefill.currency || activeTrip.mainCurrency,
            category: prefill.category || '',
            description: prefill.description || '',
            date: prefill.date || new Date().toISOString(),
        });
        setIsExpenseFormOpen(true);
    };

    const openEditExpenseForm = (expense: Expense) => {
        setEditingExpense(expense);
        setIsExpenseFormOpen(true);
    };

    const closeExpenseForm = () => {
        setIsExpenseFormOpen(false);
        setEditingExpense(undefined);
    };

    const remainingBudgetPercentage = activeTrip.totalBudget > 0 ? (stats.remaining / activeTrip.totalBudget) * 100 : 0;
    let progressBarColor = 'bg-primary';
    if (remainingBudgetPercentage < 25) progressBarColor = 'bg-tertiary';
    if (remainingBudgetPercentage <= 0) progressBarColor = 'bg-error';

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onToggleSidebar} className="p-2 rounded-full text-on-background hover:bg-surface-variant lg:hidden" aria-label="Apri menu">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-on-background">{activeTrip.name}</h1>
                        <p className="text-on-surface-variant">{new Date(activeTrip.startDate).toLocaleDateString()} - {new Date(activeTrip.endDate).toLocaleDateString()}</p>
                    </div>
                </div>
                <button onClick={() => openNewExpenseForm()} className="px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span>
                    <span>Nuova Spesa</span>
                </button>
            </header>

            <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-on-surface-variant">Budget Rimanente</span>
                    <span className="font-bold text-on-surface">{formatCurrency(stats.remaining, activeTrip.mainCurrency)}</span>
                </div>
                <div className="w-full bg-surface-variant rounded-full h-3">
                    <div className={`${progressBarColor} h-3 rounded-full transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(remainingBudgetPercentage, 100))}%` }}></div>
                </div>
                <div className="flex justify-between text-xs mt-1 text-on-surface-variant">
                    <span>Speso: {formatCurrency(stats.totalSpent, activeTrip.mainCurrency)}</span>
                    <span>Totale: {formatCurrency(stats.budget, activeTrip.mainCurrency)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <StatCard title="Budget Totale" value={formatCurrency(stats.budget, activeTrip.mainCurrency)} color="bg-primary-container text-on-primary-container" icon="account_balance_wallet" />
                <StatCard title="Spesa Totale" value={formatCurrency(stats.totalSpent, activeTrip.mainCurrency)} color="bg-tertiary-container text-on-tertiary-container" icon="shopping_cart" />
                <StatCard title="Media Giornaliera" value={formatCurrency(stats.dailyAvg, activeTrip.mainCurrency)} color="bg-secondary-container text-on-secondary-container" icon="today" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <QuickExpense trip={activeTrip} />
                    {activeTrip.frequentExpenses && activeTrip.frequentExpenses.length > 0 &&
                        <FrequentExpenses 
                            frequentExpenses={activeTrip.frequentExpenses} 
                            onFrequentExpenseClick={openNewExpenseForm}
                        />
                    }
                    <ExpenseList expenses={sortedExpenses} trip={activeTrip} onEditExpense={openEditExpenseForm} />
                </div>

                <div className="space-y-6">
                    <CurrencyConverter trip={activeTrip} />
                    {activeTrip.enableCategoryBudgets && <CategoryBudgetTracker trip={activeTrip} expenses={activeTrip.expenses} />}
                    <CategoryChart expenses={activeTrip.expenses} trip={activeTrip} />
                </div>
            </div>

            {isExpenseFormOpen && (
                <ExpenseForm 
                    trip={activeTrip} 
                    expense={editingExpense} 
                    onClose={closeExpenseForm} 
                />
            )}
        </div>
    );
};

export default Dashboard;