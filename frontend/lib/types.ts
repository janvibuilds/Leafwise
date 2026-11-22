/** Wire types mirrored from backend/app/schemas (camelCase on the wire). */

export type ConfidenceState = "high" | "review_recommended" | "uncertain";

export type TopPrediction = {
  condition: string;
  score: number;
};

export type PredictionResponse = {
  id: string;
  plant: string;
  condition: string;
  confidence: number;
  confidenceState: ConfidenceState;
  topPredictions: TopPrediction[];
  modelVersion: string;
  createdAt: string;
  imageUrl: string | null;
};

export type PredictionSummary = {
  id: string;
  plant: string;
  condition: string;
  confidence: number;
  confidenceState: ConfidenceState;
  modelVersion: string;
  createdAt: string;
};

export type FeedbackRequest = {
  isCorrect: boolean;
  comment?: string | null;
};

export type FeedbackResponse = {
  id: string;
  predictionId: string;
  isCorrect: boolean;
  comment: string | null;
  createdAt: string;
};

export type DiseaseInformation = {
  id: string;
  label: string;
  plant: string;
  condition: string;
  description: string | null;
  symptoms: string | null;
  prevention: string | null;
  treatmentNote: string | null;
  source: string | null;
  updatedAt: string | null;
};

export type DiseaseListResponse = {
  count: number;
  diseases: DiseaseInformation[];
};

export type ProfileResponse = {
  id: string;
  email: string | null;
  role: string;
  fullName: string | null;
};

export type ApiErrorShape = {
  error?: { code?: string; message?: string };
};
