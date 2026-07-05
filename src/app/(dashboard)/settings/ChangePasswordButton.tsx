"use client";

import { useState } from "react";
import { Loader2, Lock, X } from "lucide-react";
import { changePassword } from "@/features/auth/change-password";

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setError("");
    if (pwd !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const result = await changePassword(pwd);
    setLoading(false);
    if (result.success) {
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setPwd(""); setConfirm(""); }, 1500);
    } else {
      setError(result.error ?? "Failed to update password.");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center justify-between py-3 w-full hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
        <span className="text-sm text-text">Change Password</span>
        <Lock className="w-4 h-4 text-text-secondary/40" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-text text-lg">Change Password</h2>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-text-secondary" /></button>
            </div>
            {done ? (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">Password updated.</p>
            ) : (
              <div className="space-y-3">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
                <input type="password" placeholder="New password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="form-input" />
                <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="form-input" />
                <button onClick={submit} disabled={loading || !pwd || !confirm} className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
