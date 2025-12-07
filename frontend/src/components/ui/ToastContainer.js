import React, { useEffect, useState } from "react";
import "./ToastContainer.css";

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      if (!e || !e.detail) return; // ignore malformed events
      const {
        message = "",
        type = "info",
        duration = 3500,
        actionLabel,
        onAction,
      } = e.detail;
      // ignore debug logs in production
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type, actionLabel, onAction }]);

      // no-op

      // Auto remove (coerce duration to number)
      const ms = Number(duration) || 3500;
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, ms);
    };

    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, []);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          role="status"
        >
          <div className="toast-message">{toast.message}</div>
          {toast.actionLabel && (
            <button
              className="toast-action"
              onClick={() => {
                try {
                  toast.onAction && toast.onAction();
                } catch (err) {
                  // swallow errors from callbacks
                }
                remove(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            className="toast-close"
            aria-label="Dismiss"
            onClick={() => remove(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
