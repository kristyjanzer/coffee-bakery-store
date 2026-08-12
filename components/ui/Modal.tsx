"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

// "Подписки" на клиент/сервер не существует — subscribe ничего не делает, эффекта
// монтирования достаточно один раз. useSyncExternalStore вместо useState+useEffect,
// чтобы не звать setState синхронно внутри эффекта (react-hooks/set-state-in-effect):
// getServerSnapshot даёт false при SSR, getSnapshot — true на клиенте, React сам
// синхронно перерисует компонент с true сразу после маунта.
function subscribe() {
  return () => {};
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // На сервере document недоступен — портал рендерим только после маунта на клиенте,
  // тот же приём, что и для гидратации корзины (см. docs/architecture.md, раздел 4)
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black-olive/70 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto bg-warm-cream p-[30px] text-black-olive"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 text-2xl leading-none text-black-olive hover:opacity-70"
        >
          ×
        </button>
        {title && (
          <h2 className="pr-8 font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
            {title}
          </h2>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
