export const TENANT_STORAGE_KEY = "itsrellestate-tenant-draft";
export const LANDLORD_STORAGE_KEY = "itsrellestate-landlord-draft";

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

interface SavedFormState<T> {
  data: T;
  currentStep: number;
  savedAt: number;
}

export function saveFormState<T>(key: string, data: T, currentStep: number): void {
  try {
    const state: SavedFormState<T> = { data, currentStep, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function loadFormState<T>(key: string): SavedFormState<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const state = JSON.parse(raw) as SavedFormState<T>;
    if (Date.now() - state.savedAt > EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearFormState(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function hasSavedState(key: string): boolean {
  return loadFormState(key) !== null;
}

interface SubmittedState {
  firstName: string;
  submittedAt: number;
}

export function markSubmitted(key: string, firstName: string): void {
  try {
    const state: SubmittedState = { firstName, submittedAt: Date.now() };
    localStorage.setItem(`${key}-submitted`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getSubmitted(key: string): SubmittedState | null {
  try {
    const raw = localStorage.getItem(`${key}-submitted`);
    if (!raw) return null;
    return JSON.parse(raw) as SubmittedState;
  } catch {
    return null;
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface PendingSubmission {
  idempotencyKey: string;
  uploadsFolderId?: string;
}

function pendingKey(formKey: string): string {
  return `${formKey}-pending`;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreatePendingSubmission(formKey: string): PendingSubmission {
  try {
    const raw = localStorage.getItem(pendingKey(formKey));
    if (raw) {
      const parsed = JSON.parse(raw) as PendingSubmission;
      if (parsed.idempotencyKey) return parsed;
    }
  } catch {
    // ignore
  }
  const fresh: PendingSubmission = { idempotencyKey: generateIdempotencyKey() };
  try {
    localStorage.setItem(pendingKey(formKey), JSON.stringify(fresh));
  } catch {
    // ignore
  }
  return fresh;
}

export function setPendingUploadsFolderId(formKey: string, uploadsFolderId: string): void {
  try {
    const raw = localStorage.getItem(pendingKey(formKey));
    const current = raw ? (JSON.parse(raw) as PendingSubmission) : { idempotencyKey: generateIdempotencyKey() };
    const next: PendingSubmission = { ...current, uploadsFolderId };
    localStorage.setItem(pendingKey(formKey), JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearPendingSubmission(formKey: string): void {
  try {
    localStorage.removeItem(pendingKey(formKey));
  } catch {
    // ignore
  }
}
