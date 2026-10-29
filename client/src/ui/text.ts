// Player-facing text lives here, in one place, so it can be translated later.
// Each key maps to an English sentence. Values are filled in with {name}
// placeholders, e.g. t("saveDeleted", { name: "Aria" }).
// To add a language, copy this table and translate the values; keep the keys.

export const TEXT = {
  // Toasts (short messages at the top of the screen)
  gameFailedToLoad: "The game failed to load. Refresh the page to try again.",
  keyInvalid: "Use a letter, number, arrow, Space, Shift, or Tab.",
  keyTaken:
    "{key} is already bound to {action}. That key was not changed - unbind it there first, or pick another key.",
  keyBound: "{action} bound to {key}.",
  heroNotFound: "That hero could not be found.",
  heroStartFailed: "Could not start that hero.",
  heroExported: "Hero exported.",
  savesExported: "Exported {count} {saveWord}.",
  saveDeleted: "{name} was deleted.",
  importedSaves: "Imported {imported} {saveWord}",
  importedInvalid: ", {failed} invalid",
  gamepadNoButton: "No gamepad button pressed. Try again.",
  gamepadTaken: "Button {index} is already used by {action}. Pick another.",
  gamepadBound: "{action} set to gamepad button {index}.",
  gamepadReset: "Gamepad buttons restored to defaults.",
  keybindsReset: "Keybinds restored to defaults.",
  ngPlusBegins: "New Game+ {cycle} begins.",
  quickSlotBound: "{item} bound to {slot}.",
  fallen: "You have fallen. Returning to Eldoria Village...",
  levelUp: "Level {level}!",
  enteredZone: "Entered {zone}.",
  elaraRestores: "Elara's light restores you.",

  // Buttons and labels on screens
  btnPlay: "Play",
  btnExport: "Export",
  btnDelete: "Delete",
  btnBack: "Back",
  btnLeave: "Leave",
  btnClose: "Close",
  btnContinue: "Continue",
  btnEnterEldoria: "Enter Eldoria",
  btnAcceptQuest: "Accept quest",
  btnTurnIn: "Turn in",
  btnUnequip: "Unequip",
  btnUse: "Use",
  btnEquip: "Equip",
  btnBuy: "Buy",
  btnCraft: "Craft",
  btnHeal: "Heal for {cost} gold",
  btnExportHero: "Export hero",
  btnExportAll: "Export all",
  btnImportSaves: "Import saves",
  btnCharacterSelect: "Character select",
  btnDeleteHero: "Delete hero",
  btnResetKeybinds: "Reset keybinds",
  btnResetGamepad: "Reset gamepad",
  btnShowTutorial: "Show tutorial again",
  labelAll: "All",
  labelEmptySlot: "Empty slot",
  classSearchLabel: "Find a class",
  classSearchPlaceholder: "Search name, role, or weapon...",
  classFilterAll: "All styles",
  classFilterMelee: "Melee",
  classFilterRanged: "Ranged",
  classFilterMagic: "Magic",
  classFilterSupport: "Support",
  classFilterMobile: "Mobile",
  classNoResults: "No classes match that search. Try another name or playstyle.",
  classFiltersLabel: "Filter classes by playstyle",
  journalQuestsNav: "Active quests",
  journalLoreNav: "World lore",
  journalNavLabel: "Journal sections",
  minimapToggle: "Toggle minimap",
  minimapShow: "Show minimap",
  minimapHide: "Hide minimap",

  // Delete-hero confirm modal
  deleteHeroTitle: "Delete this hero?",
  deleteHeroBody:
    "{name} will be removed from this browser for good. The save file is erased the moment you confirm, and it cannot be recovered.",
  deleteHeroProgress: "Level {level} {className}, last saved in {zone}",
  deleteHeroGone: "The hero, its level, gold, gear, quests, and talents",
  deleteHeroExported: "Any copy you exported to a file yourself",
  deleteHeroNote: "Want to keep the hero? Export it first, then delete. Export saves a copy you can import later.",
  deleteHeroKeep: "Keep hero",
  deleteHeroConfirm: "Delete forever",
  modalClose: "Close",
} as const;

export type TextKey = keyof typeof TEXT;

// Tagalog copy of the same keys. Placeholders ({name}) stay exactly as in
// English so t() fills them the same way.
export const TEXT_TL: Record<TextKey, string> = {
  gameFailedToLoad: "Hindi na-load ang laro. I-refresh ang pahina para subukan ulit.",
  keyInvalid: "Gumamit ng letra, numero, arrow, Space, Shift, o Tab.",
  keyTaken:
    "Naka-bind na ang {key} sa {action}. Hindi ito nabago - i-unbind muna doon, o pumili ng ibang key.",
  keyBound: "Na-bind ang {action} sa {key}.",
  heroNotFound: "Hindi mahanap ang hero na iyon.",
  heroStartFailed: "Hindi masimulan ang hero na iyon.",
  heroExported: "Na-export ang hero.",
  savesExported: "Na-export ang {count} {saveWord}.",
  saveDeleted: "Nabura ang {name}.",
  importedSaves: "Na-import ang {imported} {saveWord}",
  importedInvalid: ", {failed} ang hindi valid",
  gamepadNoButton: "Walang pinindot na gamepad button. Subukan ulit.",
  gamepadTaken: "Ginagamit na ng {action} ang button {index}. Pumili ng iba.",
  gamepadBound: "Naitakda ang {action} sa gamepad button {index}.",
  gamepadReset: "Ibinalik sa default ang mga gamepad button.",
  keybindsReset: "Ibinalik sa default ang mga keybind.",
  ngPlusBegins: "Nagsimula ang New Game+ {cycle}.",
  quickSlotBound: "Naka-bind ang {item} sa {slot}.",
  fallen: "Natalo ka. Babalik sa Eldoria Village...",
  levelUp: "Level {level}!",
  enteredZone: "Pumasok sa {zone}.",
  elaraRestores: "Naibalik ka ng liwanag ni Elara.",
  btnPlay: "Laro",
  btnExport: "I-export",
  btnDelete: "Burahin",
  btnBack: "Bumalik",
  btnLeave: "Umalis",
  btnClose: "Isara",
  btnContinue: "Ituloy",
  btnEnterEldoria: "Pumasok sa Eldoria",
  btnAcceptQuest: "Tanggapin ang quest",
  btnTurnIn: "Ibigay",
  btnUnequip: "Tanggalin",
  btnUse: "Gamitin",
  btnEquip: "Isuot",
  btnBuy: "Bilhin",
  btnCraft: "Gumawa",
  btnHeal: "Magpagaling sa {cost} gold",
  btnExportHero: "I-export ang hero",
  btnExportAll: "I-export lahat",
  btnImportSaves: "I-import ang mga save",
  btnCharacterSelect: "Pumili ng karakter",
  btnDeleteHero: "Burahin ang hero",
  btnResetKeybinds: "I-reset ang keybind",
  btnResetGamepad: "I-reset ang gamepad",
  btnShowTutorial: "Ipakita ulit ang tutorial",
  labelAll: "Lahat",
  labelEmptySlot: "Walang laman",
  classSearchLabel: "Maghanap ng klase",
  classSearchPlaceholder: "Hanapin ayon sa pangalan, role, o sandata...",
  classFilterAll: "Lahat ng estilo",
  classFilterMelee: "Melee",
  classFilterRanged: "Ranged",
  classFilterMagic: "Mahika",
  classFilterSupport: "Suporta",
  classFilterMobile: "Mabilis",
  classNoResults: "Walang tugmang klase. Subukan ang ibang pangalan o estilo.",
  classFiltersLabel: "I-filter ang mga klase ayon sa estilo",
  journalQuestsNav: "Mga aktibong quest",
  journalLoreNav: "Kaalaman sa mundo",
  journalNavLabel: "Mga seksyon ng journal",
  minimapToggle: "Ipakita o itago ang minimap",
  minimapShow: "Ipakita ang minimap",
  minimapHide: "Itago ang minimap",

  // Delete-hero confirm modal
  deleteHeroTitle: "Burahin ang hero na ito?",
  deleteHeroBody:
    "Permanenteng mawawala sa browser na ito si {name}. Mabubura ang save file agad pagkatapos mong kumpirmahin, at hindi na ito maibabalik.",
  deleteHeroProgress: "Level {level} {className}, huling na-save sa {zone}",
  deleteHeroGone: "Ang hero, level, gold, gamit, quest, at talento nito",
  deleteHeroExported: "Anumang kopyang ini-export mo mismo sa file",
  deleteHeroNote: "Gusto mong itago ang hero? I-export muna, tapos burahin. Ang export ay lumilikha ng kopyang maaari mong i-import ulit.",
  deleteHeroKeep: "Itago ang hero",
  deleteHeroConfirm: "Burahin nang tuluyan",
  modalClose: "Isara",
};

// Language used for the text. "en" is the default; "tl" uses TEXT_TL.
let currentLang: "en" | "tl" = "en";

export function setLanguage(lang: "en" | "tl"): void {
  currentLang = lang;
}

// Fills {name} placeholders in a text entry, in the chosen language.
export function t(key: TextKey, values: Record<string, string | number> = {}): string {
  const source = currentLang === "tl" ? TEXT_TL[key] : TEXT[key];
  return source.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = values[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}
