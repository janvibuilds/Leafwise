"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-browser";

export default function PredictionDetailActions({
  predictionId,
}: {
  predictionId: string;
}) {
  const router = useRouter();
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitFeedback(event: FormEvent) {
    event.preventDefault();
    if (isCorrect === null) {
      setError("Choose whether the prediction was helpful.");
      return;
    }
    setBusy(true);
    setError(null);
    setFeedbackMessage(null);
    try {
      await apiClient.submitFeedback(predictionId, {
        isCorrect,
        comment: comment.trim() || null,
      });
      setFeedbackMessage("Thanks — your feedback was recorded.");
      setComment("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Feedback could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this prediction and its stored image?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.deletePrediction(predictionId);
      router.push("/history");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the prediction.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submitFeedback}
        className="app-card p-6"
      >
        <h2 className="text-[20px] font-bold text-forest">Was this helpful?</h2>
        <p className="mt-2 text-[13px] text-muted">
          One response per prediction. Your feedback stays private.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsCorrect(true)}
            className="app-chip px-5 py-2.5 text-[13px]"
            data-active={isCorrect === true}
          >
            Yes, looks right
          </button>
          <button
            type="button"
            onClick={() => setIsCorrect(false)}
            className="app-chip px-5 py-2.5 text-[13px]"
            data-active={isCorrect === false}
          >
            No, something is off
          </button>
        </div>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Optional note (max 2000 characters)"
          className="app-input mt-5"
        />
        <button
          type="submit"
          disabled={busy}
          className="app-btn-dark mt-4 px-6 py-3 text-[14px]"
        >
          {busy ? "Saving…" : "Send feedback"}
        </button>
        {feedbackMessage && (
          <p role="status" className="mt-4 text-[13px] text-[#168a45]">
            {feedbackMessage}
          </p>
        )}
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="app-btn-quiet px-6 py-3 text-[14px] text-cta"
      >
        Delete this prediction
      </button>
    </div>
  );
}
