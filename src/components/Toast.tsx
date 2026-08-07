import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type ToastKind = "success" | "error";
export interface ToastAction {
  label: string;
  onClick: () => void;
}
type Toast = { id: number; message: string; kind: ToastKind; action?: ToastAction };

const ToastContext = createContext<(message: string, kind?: ToastKind, action?: ToastAction) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = "success", action?: ToastAction) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, kind, action }]);
      setTimeout(() => dismiss(id), action ? 6000 : 3400);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{t.message}</span>
            {t.action && (
              <button
                className="toast-action"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
