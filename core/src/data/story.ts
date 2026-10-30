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

// A short line about each class, shown with the prologue so the story speaks to the hero's own path.
export const CLASS_INTROS: Partial<Record<string, string>> = {
  warrior: "Your sword arm is known in every village, and Master Kael trusts you to hold the line.",
  mage: "Your magic answers to you alone, and Master Kael believes the cold winds are a sign you were meant to see.",
  archer: "Your aim is steady and your eyes are sharp, and Master Kael sends you because no one reads the wild better.",
  warden: "You have guarded the village roads through every season. Master Kael trusts you to keep Eldoria standing.",
  oracle: "You saw the northern chill in a dream before it came. Now Master Kael asks you to follow its trail.",
  battlemage: "Your training joined spell and steel into one discipline. Master Kael believes both will be needed in the north.",
  shadowdancer: "You know how to move unseen and strike only when it matters. The threat in the north will not see you coming.",
  artificer: "Your clever devices have kept the village safe before. Master Kael hopes they can uncover what stirs beyond the forest.",
  beastmaster: "The creatures of the wild trust your call. Their unease tells you the northern roads are in danger.",
  duelist: "Your blade is quick, your judgment quicker. Master Kael asks you to meet the northern threat on your own terms.",
  elementalist: "The elements have grown restless beneath the northern winds. You set out to learn why they have changed.",
  sentinel: "You swore to stand between danger and the people of Eldoria. Master Kael holds you to that oath.",
  stormcaller: "A strange storm gathers beyond the forest, and its lightning answers your voice. You follow it north.",
  assassin: "You strike from the shadows and leave no trace. Master Kael trusts you with the quiet work in the north.",
  paladin: "Your oath to protect the weak has never been broken. Master Kael asks you to carry that oath north.",
  priest: "Your healing prayers have eased many suffering villagers. Master Kael hopes your faith can keep the north's cold from spreading south.",
  necromancer: "You have spoken with the dead and learned their secrets. Master Kael believes you can calm the restless crypt in the north.",
  druid: "The spirits of the forest answer your call, and they have felt the cold creeping south. You set out to learn why.",
  monk: "Years of quiet discipline have made your body a weapon. Master Kael sends you north to test that discipline against the cold.",
  gunslinger: "Your aim is quick and your nerve is steady. Master Kael needs a marksman for the dangers in the north.",
  berserker: "Your rage has protected Eldoria more than once. Master Kael hopes that fury can hold back the cold in the north.",
  summoner: "Your summons answer you without hesitation, and they sense something wrong in the north. Master Kael sends you to find it.",
  ranger: "You have tracked beasts along every road in Eldoria. Master Kael asks you to follow the cold winds north.",
  spellblade: "You weave magic into every sword strike. Master Kael believes the strange cold will need both your blade and your spells.",
  dragonknight: "Your sword and your oath have carried you through many fights. Master Kael asks you to ride north and face the cold."
};

// Each new cycle opens with a line that changes the story, so replaying feels different from the first run.
// The last line repeats for every cycle after the list ends.
export const NG_PLUS_OPENINGS: string[] = [
  "The Hollow King is gone, yet the cold winds have returned. Master Kael wonders if something older has woken beneath the north.",
  "Villagers speak of a stranger who looks just like you, walking the north road. Master Kael asks you to learn who it is.",
  "Every road feels familiar now, as though the land remembers you. Master Kael warns that the realm is listening."
];

// On later cycles the Hollow King's ending changes: the throne is not empty, and his rule is not finished.
export const NG_PLUS_HOLLOW_ENDING = "The ice melts, but a cold voice whispers from the throne. The Hollow King's crown has a second owner now.";

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
    bossId: "frost_revenant",
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

// The opening a brand-new hero reads once, right after being made. Page two is the hero's own line from CLASS_INTROS.
export interface IntroPage {
  title: string;
  text: string;
  closing: string;
}

export function newHeroIntro(classId: string): IntroPage[] {
  const prologue = STORY_CHAPTERS[0];
  return [
    { title: prologue.title, text: prologue.text, closing: "" },
    {
      title: "Master Kael",
      text: CLASS_INTROS[classId] ?? "Master Kael has a task for you, and he trusts you to see it through.",
      closing: ""
    },
    {
      title: "The Road North",
      text: "Dangers wait on the road north, from the Bone Crypt to the Hollow Throne. Each one ends with a boss.",
      closing: prologue.closing
    }
  ];
}
