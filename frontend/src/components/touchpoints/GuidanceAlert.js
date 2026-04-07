import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export default function GuidanceAlert({ messages }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div className="space-y-2">
      {messages.map((msg, i) => (
        <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
          msg.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200' :
          msg.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200' :
          'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
        }`}>
          {msg.type === 'warning' ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> :
           msg.type === 'info' ? <Info className="h-4 w-4 mt-0.5 shrink-0" /> :
           <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{msg.message}</span>
        </div>
      ))}
    </div>
  );
}
