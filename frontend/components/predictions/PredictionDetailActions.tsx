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
        className="rounded-3xl border border-ink/10 bg-paper p-6"
      >
        <h2 className="font-display text-[22px] text-ink">Was this helpful?</h2>
        <p className="mt-2 text-[14px] text-ink/60">
          One response per prediction. Your feedback stays private.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsCorrect(true)}
            className={`rounded-full border px-5 py-2.5 text-[14px] font-medium transition ${
              isCorrect === true
                ? "border-teal bg-teal/15 text-[#0d6f55]"
                : "border-ink/15 text-ink hover:bg-bone"
            }`}
          >
            Yes, looks right
          </button>
          <button
            type="button"
            onClick={() => setIsCorrect(false)}
            className={`rounded-full border px-5 py-2.5 text-[14px] font-medium transition ${
              isCorrect === false
                ? "border-teal bg-teal/15 text-[#0d6f55]"
                : "border-ink/15 text-ink hover:bg-bone"
            }`}
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
          className="mt-5 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-[14px] outline-none focus:border-teal focus:ring-2 focus:ring-teal/30"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-paper transition hover:bg-night disabled:opacity-60"
        >
          {busy ? "Saving…" : "Send feedback"}
        </button>
        {feedbackMessage && (
          <p role="status" className="mt-4 text-[14px] text-teal">
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
        className="rounded-full border border-red-200 px-6 py-3 text-[14px] font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
      >
        Delete this prediction
      </button>
    </div>
  );
}
