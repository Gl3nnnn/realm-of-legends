// Three-act campaign outline. Each chapter ends with a boss.
// Chapter 0 is the prologue. The number of chapters is the length of STORY_CHAPTERS.

export interface StoryChapter {
  id: number;
  act: 1 | 2 | 3;
  title: string;
  text: string;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 0,
    act: 1,
    title: "The Quiet Village",
    text: "Eldoria has been calm for years, but strange cold winds have started to blow from the north. Master Kael asks you to find out why."
  },
  {
    id: 1,
    act: 1,
    title: "The Bone Crypt",
    text: "The Bone Warden guards the crypt where the dead refuse to rest. Only his defeat can bring the crypt its peace."
  },
  {
    id: 2,
    act: 2,
    title: "The Mire",
    text: "The Miremother's grief has poisoned the marsh. Her story is sad, but the swamp is still dangerous."
  },
  {
    id: 3,
    act: 2,
    title: "The Frozen Wastes",
    text: "A hunter lost to the Hollow King's call still stands watch in the snow. Ending his watch may be the only mercy left to him."
  },
  {
    id: 4,
    act: 3,
    title: "The Hollow Throne",
    text: "The Hollow King took the warmth of his people for a throne of ice. Ending his reign returns the warmth to the land."
  }
];
