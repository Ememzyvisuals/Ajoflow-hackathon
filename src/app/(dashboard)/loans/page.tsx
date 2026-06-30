"use client";

import { useState } from "react";
import { formatNaira, formatDate, getStatusColor } from "@/lib/utils";
import { Plus, Loader2, HandCoins } from "lucide-react";

const mockLoans = [
  { id: "1", amount: 50000, reason: "School Fees", status: "pending", created_at: "2024-05-20", group: "Tech Bros Ajo" },
  { id: "2", amount: 30000, reason: "Business Capital", status: "approved", created_at: "2024-04-10", group: "Market Women Ajo" },
  { id: "3", amount: 20000, reason: "Emergency", status: "rejected", created_at: "2024-03-05", group: "Family Support Ajo" },
];

export default function LoansPage() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "group">("my");

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl font-bold text-text">Loan Requests</h1></div>

      <div className="flex gap-2 mb-5">
        {[["my", "My Requests"], ["group", "Group Requests"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as "my" | "group")} className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeTab === key ? "bg-primary text-white border-primary" : "border-border text-text-secondary hover:text-text"}`}>{label}</button>
        ))}
      </div>

      <div className="space-y-3 mb-6">
        {mockLoans.map((loan) => {
          const colors = getStatusColor(loan.status);
          return (
            <div key={loan.id} className="dashboard-card">
              <div className="flex items-start justify-between mb-3">
                <div><p className="font-bold text-text text-lg">{formatNaira(loan.amount)}</p><p className="text-sm text-text-secondary mt-0.5">{loan.reason}</p></div>
                <span className={`badge ${colors.bg} ${colors.text} capitalize`}>{loan.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-text-secondary"><span>{loan.group}</span><span>Requested on {formatDate(loan.created_at)}</span></div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-colors">
        <Plus className="w-4 h-4" /> Request Loan
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center"><HandCoins className="w-5 h-5 text-primary" /></div>
              <h2 className="font-bold text-text text-lg">Request a Loan</h2>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-text mb-1.5">Amount (₦)</label><input type="number" placeholder="50000" className="form-input" /></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Reason</label><textarea placeholder="Why do you need this loan?" rows={3} className="form-input resize-none" /></div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-xl py-3 text-sm font-medium text-text hover:bg-gray-50">Cancel</button>
                <button className="flex-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold hover:bg-primary/90">Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
