// The update board: what changed, newest first. Add a new entry at the top when a
// patch ships, and every player sees it once before their next adventure.
// Keep the version string unique - it is what marks an update as read.

import { esc } from "./helpers";

export type UpdateTag = "new" | "improved" | "fixed" | "balance";

export interface UpdateChange {
  tag: UpdateTag;
  text: string;
}

export interface GameUpdate {
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: UpdateChange[];
}

export const GAME_UPDATES: GameUpdate[] = [
  {
    version: "1.5.0",
    date: "November 3, 2026",
    title: "The Chronicler's Update",
    summary:
      "Your hero now keeps a record of everything they do. Skills remember every cast, the journal remembers every fall, and the character sheet finally shows the numbers behind the fight.",
    changes: [
      { tag: "new", text: "Ability Mastery: every skill grows cheaper and comes back faster the more you use it." },
      { tag: "new", text: "Elemental Reactions: hit a frozen creature with fire, or a burning one with ice, and discover the rest." },
      { tag: "new", text: "A hero diary and character sheet that record your deeds and lay out every fighting stat." },
      { tag: "new", text: "Pin a quest to the tracker so the compass always points at what matters most." },
      { tag: "improved", text: "The journal now gathers quests, bounties, bestiary, mastery, diary, and travel in one place." },
      { tag: "fixed", text: "Quest boss directions now name the right zone, and new heroes start at full health." },
    ],
  },
  {
    version: "1.4.0",
    date: "November 3, 2026",
    title: "Signs of the World",
    summary:
      "Eldoria feels alive now: weather rolls across the zones, bounty boards post fresh work, and the shrine offers a small blessing for the road ahead.",
    changes: [
      { tag: "new", text: "Weather that changes every few minutes and colours the mood of each zone." },
      { tag: "new", text: "Bounty boards with rotating jobs, growing purses, and a streak for hunters who never fall." },
      { tag: "new", text: "Shrine blessings at the healer: one cheap buff each day, lasting ten minutes of play." },
      { tag: "new", text: "Recall home with H, unless a boss is still standing in your way." },
      { tag: "improved", text: "Accessibility settings for UI scale, text size, colour blindness, contrast, motion, and screen shake." },
      { tag: "balance", text: "Fast travel is free and instant, but only to places your hero has already stood in." },
    ],
  },
  {
    version: "1.3.0",
    date: "October 31, 2026",
    title: "The Hunters' Ledger",
    summary:
      "A clearer road for every hero. The HUD shows what to do next, the bestiary fills itself in as you meet new creatures, and achievements and pets give the long hunt more to chase.",
    changes: [
      { tag: "new", text: "Achievements, wearable titles, and a hero record that counts what you have done." },
      { tag: "new", text: "A bestiary that reveals a creature the first time it notices you." },
      { tag: "new", text: "Companion pets that hatch, level up, and fight beside you." },
      { tag: "improved", text: "A HUD that points out the next step, nearby warnings, and the boss ahead." },
      { tag: "improved", text: "The opening story can be skipped, and the class preview shows the stats you really start with." },
      { tag: "fixed", text: "Projectiles no longer strike the same target twice, and companions can no longer walk through walls." },
    ],
  },
];

export const LATEST_UPDATE = GAME_UPDATES[0]!;

const SEEN_STORAGE_KEY = "realm.updates.seen.v1";

const TAG_LABELS: Record<UpdateTag, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  balance: "Balance",
};

function readSeenVersion(): string {
  try {
    return localStorage.getItem(SEEN_STORAGE_KEY) ?? "";
  } catch {
    // Without storage, assume the board was already read so it never blocks the game.
    return LATEST_UPDATE.version;
  }
}

/** How many updates have arrived since the player last read the board. */
export function unreadUpdateCount(): number {
  const seen = readSeenVersion();
  const index = GAME_UPDATES.findIndex((update) => update.version === seen);
  return index < 0 ? GAME_UPDATES.length : index;
}

export function hasUnreadUpdates(): boolean {
  return unreadUpdateCount() > 0;
}

/** Marks every update, including the latest one, as read. */
export function markUpdatesSeen(): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, LATEST_UPDATE.version);
  } catch {
    return;
  }
}

export function updateBoardHtml(): string {
  return GAME_UPDATES.map((update, index) => {
    const latest = index === 0;
    const changes = update.changes
      .map(
        (change) => `<li class="update-change">
          <span class="update-tag tag-${change.tag}">${esc(TAG_LABELS[change.tag])}</span>
          <span>${esc(change.text)}</span>
        </li>`,
      )
      .join("");
    return `<article class="update-card ${latest ? "latest" : ""}">
      <div class="update-meta">
        <span class="update-version-chip">v${esc(update.version)}</span>
        <span class="muted small">${esc(update.date)}</span>
        ${latest ? `<span class="update-new">New</span>` : ""}
      </div>
      <h2>${esc(update.title)}</h2>
      <p class="update-summary">${esc(update.summary)}</p>
      <ul class="update-changes">${changes}</ul>
    </article>`;
  }).join("");
}
