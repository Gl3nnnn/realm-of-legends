// Three-act campaign outline. Each chapter ends with a boss.
// Chapter 0 is the prologue. The number of chapters is the length of STORY_CHAPTERS.

export interface StoryChapter {
  id: number;
  act: 1 | 2 | 3;
  bossId?: string;
  title: string;
  text: string;
  closing: string;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 0,
    act: 1,
    title: "The Quiet Village",
    text: "Eldoria has been calm for years, but strange cold winds have started to blow from the north. Master Kael asks you to find out why.",
    closing: "The road north is waiting. Pack your gear and go."
  },
  {
    id: 1,
    act: 1,
    bossId: "bone_warden",
    title: "The Bone Crypt",
    text: "The Bone Warden guards the crypt where the dead refuse to rest. Only his defeat can bring the crypt its peace.",
    closing: "The bones settle at last. The crypt is quiet."
  },
  {
    id: 2,
    act: 2,
    bossId: "miremother",
    title: "The Mire",
    text: "The Miremother's grief has poisoned the marsh. Her story is sad, but the swamp is still dangerous.",
    closing: "The marsh breathes again. Her sorrow is finally still."
  },
  {
    id: 3,
    act: 2,
    bossId: "ice_revenant",
    title: "The Frozen Wastes",
    text: "A hunter lost to the Hollow King's call still stands watch in the snow. Ending his watch may be the only mercy left to him.",
    closing: "The hunter's watch is over. The snow falls softly now."
  },
  {
    id: 4,
    act: 3,
    bossId: "hollow_king",
    title: "The Hollow Throne",
    text: "The Hollow King took the warmth of his people for a throne of ice. Ending his reign returns the warmth to the land.",
    closing: "The ice melts. Eldoria is warm again."
  }
];
