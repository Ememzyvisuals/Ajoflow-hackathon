import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-7 h-7 text-text-secondary" />
      </div>
      <h1 className="text-xl font-bold text-text mb-2">You&apos;re offline</h1>
      <p className="text-text-secondary text-sm max-w-xs">
        Check your internet connection. Some AjoFlow features need an active connection.
      </p>
    </div>
  );
}
