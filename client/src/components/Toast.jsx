import { useEffect } from "react";

const Toast = ({ type = "success", message, onClose }) => {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const toastStyles =
    type === "error"
      ? "bg-red-100 text-red-700 border-red-300"
      : "bg-green-100 text-green-700 border-green-300";

  return (
    <div
      className={`fixed top-5 right-5 z-50 w-90 max-w-[90vw] border rounded-xl shadow-lg px-4 py-3 ${toastStyles}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="text-xl leading-none font-bold opacity-70 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;