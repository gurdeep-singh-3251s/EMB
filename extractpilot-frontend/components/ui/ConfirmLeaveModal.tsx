"use client";

import { Button } from "./Button";

type ConfirmLeaveModalProps = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

export function ConfirmLeaveModal({ open, onStay, onLeave }: ConfirmLeaveModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onStay}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="leave-modal-title" className="font-display text-lg font-bold text-slate-950">
          Extraction in progress
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Your pipeline is still running. If you leave now, progress on this page will be lost and
          you may not see the final run summary. The worker may still finish jobs in the background.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onStay}>
            Stay on this page
          </Button>
          <Button variant="accent" onClick={onLeave}>
            Leave anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
