"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/app/icons";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type ImageUploadProps = {
  busy: boolean;
  error: string | null;
  onSubmit: (file: File) => void;
  onClearError: () => void;
};

export default function ImageUpload({
  busy,
  error,
  onSubmit,
  onClearError,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
  }

  function chooseFile(candidate: File | undefined) {
    onClearError();
    setLocalError(null);
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) {
      setLocalError("Choose a JPEG, PNG or WEBP image.");
      return;
    }
    if (candidate.size === 0) {
      setLocalError("That file is empty.");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setLocalError("Images must be 5 MB or smaller.");
      return;
    }
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    const url = URL.createObjectURL(candidate);
    previewRef.current = url;
    setFile(candidate);
    setPreview(url);
  }

  const shownError = localError ?? error;

  return (
    <div className="rounded-2xl border border-dashed border-line bg-soft p-6 sm:p-8">
      <input
        ref={inputRef}
        id="leaf-image"
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(event) => chooseFile(event.target.files?.[0])}
      />

      {preview ? (
        <div className="flex flex-col items-center gap-5">
          <img
            src={preview}
            alt="Selected leaf preview"
            className="max-h-[280px] w-auto rounded-2xl object-contain"
          />
          <p className="text-center text-[14px] text-ink/65">
            {file?.name} · {file ? (file.size / 1024).toFixed(0) : 0} KB
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => file && onSubmit(file)}
              className="app-btn-primary px-6 py-3 text-[15px]"
            >
              {busy ? "Analyzing…" : "Analyze leaf →"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                clearPreview();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="app-btn-quiet px-6 py-3 text-[15px]"
            >
              Choose another
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor="leaf-image"
          className="flex cursor-pointer flex-col items-center gap-4 py-10 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#168a45]">
            <Icon name="upload" size={26} />
          </span>
          <span className="text-[24px] font-bold tracking-[-0.025em] text-forest">
            Drop your leaf photo here
          </span>
          <span className="text-[14px] text-muted">
            One image at a time · JPEG, PNG or WEBP · up to 5 MB
          </span>
        </label>
      )}

      {shownError && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700"
        >
          {shownError}
        </p>
      )}
    </div>
  );
}
