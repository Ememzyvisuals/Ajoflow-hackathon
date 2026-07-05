import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text">Help & Support</h1>
      </div>

      <div className="dashboard-card space-y-4">
        <p className="text-sm text-text-secondary">
          Having trouble with contributions, payouts, or your account? Reach out and we'll help.
        </p>
        <a href="mailto:support@ajoflow.vercel.app" className="flex items-center gap-3 py-3 border-t border-border">
          <Mail className="w-4 h-4 text-primary" />
          <span className="text-sm text-text">support@ajoflow.vercel.app</span>
        </a>
        <a href="https://wa.me/2349047115612" target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3 border-t border-border">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm text-text">Chat with us on WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
