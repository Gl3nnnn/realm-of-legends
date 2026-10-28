// Plain-language messages for save and storage problems.
// Each entry is shown to the player with a short list of steps they can take.

export interface StorageAdvice {
  title: string;
  steps: string[];
}

export const STORAGE_ADVICE = {
  unavailable: {
    title: "Browser storage is not available.",
    steps: [
      "Leave private or incognito mode and try again.",
      "Check that cookies and site data are allowed for this site.",
    ],
  },
  full: {
    title: "Browser storage is full.",
    steps: [
      "Delete a hero you no longer need from the list.",
      "Export a backup of your saves, then clear old site data.",
    ],
  },
  limit: {
    title: "You have reached the hero limit.",
    steps: ["Delete one hero before you create a new one."],
  },
  importFailed: {
    title: "That file could not be imported.",
    steps: [
      "Check that it is a save file exported from this game.",
      "Try exporting the save again, then import the new file.",
    ],
  },
  unknown: {
    title: "Something went wrong while saving.",
    steps: [
      "Keep this window open and try the action again.",
      "Export a backup before you close the game.",
    ],
  },
} satisfies Record<string, StorageAdvice>;

export type StorageProblem = keyof typeof STORAGE_ADVICE;

// Works out which kind of problem an error is, from its name and message.
export function classifyStorageError(err: unknown): StorageProblem {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (name === "QuotaExceededError" || /quota|storage is full|no space/i.test(message)) return "full";
  if (/only keep|hero limit|delete one/i.test(message)) return "limit";
  if (/indexeddb|private|not available|could not open/i.test(message) || name === "InvalidStateError") {
    return "unavailable";
  }
  return "unknown";
}

// One line of text for a toast, built from the advice.
export function storageSummary(problem: StorageProblem): string {
  const advice = STORAGE_ADVICE[problem];
  return `${advice.title} ${advice.steps[0]}`;
}
