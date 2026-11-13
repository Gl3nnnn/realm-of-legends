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
    version: "1.24.0",
    date: "November 13, 2026",
    title: "The Readable Fight Update",
    summary:
      "Every class skill can now be cast from a gamepad, the health bar over a wounded monster changes colour as it runs out, and rare gear on the ground throws a coloured beam so a good drop is spotted instead of walked over. A talent tier waiting to be picked keeps a button on the HUD until you choose.",
    changes: [
      { tag: "new", text: "Gamepad players can cast all five class skills: Y, RB, RT and both stick clicks, each one rebindable in Settings." },
      { tag: "new", text: "Monster health bars now turn amber below 60 percent and bright red below 25 percent, and an elite's bar gets a gold rim." },
      { tag: "new", text: "Rare, epic and legendary drops stand in a coloured shaft of light, taller the better the item." },
      { tag: "new", text: "An unspent talent tier shows a purple button on the HUD; click it to open Talents and pick one." },
      { tag: "improved", text: "Dropped loot glows in its own rarity colour instead of the same gold for everything." },
    ],
  },
  {
    version: "1.23.0",
    date: "November 13, 2026",
    title: "The Clearer Choices Update",
    summary:
      "The counter now tells you whether a piece of gear is an upgrade before you buy it, a carried egg can be hatched from the companion page instead of a hidden village key press, and the training dummy's meter can be wiped with one click. Gamepad players can close any panel with B or toggle Settings with Start, and the journal points at the Gauntlet and the Blood Moon.",
    changes: [
      { tag: "new", text: "Shop gear now shows an Upgrade, Downgrade or Sidegrade line against what you already wear, with the first few stat changes in plain numbers." },
      { tag: "new", text: "The companion page hatches a carried egg itself, so the first companion no longer depends on an undocumented village key press." },
      { tag: "new", text: "Click the training dummy's meter to wipe it and start a fresh comparison." },
      { tag: "improved", text: "The gamepad's B button closes the open panel or confirmation, and Start toggles Settings instead of only opening it." },
      { tag: "improved", text: "Gamepad and touch potion buttons now fall back to the best matching potion when their assigned slot is empty, just like the keyboard." },
      { tag: "improved", text: "The journal navigation now links to the Gauntlet and the Blood Moon." },
      { tag: "improved", text: "V, C and U open the village, companion and update board from the keyboard, and the controls sheet lists them." },
    ],
  },
  {
    version: "1.22.0",
    date: "November 12, 2026",
    title: "The Comfort Update",
    summary:
      "Aim assist, phone vibration and a lighter performance mode were already saved in the preferences file, but no switch reached them. They do now: aim assist gently takes the nearest monster in front when your hands are off the aim, phones buzz on a landed hit, and performance mode trims the particles, glows and blurred panels that cost the most on an older device.",
    changes: [
      { tag: "new", text: "Settings now has a switch for Aim assist, which snaps to the nearest monster in front when no stick, touch or pointer is steering your aim." },
      { tag: "new", text: "Phone vibration is now a real setting and phones buzz on hits, crits and boss kills where the browser allows it." },
      { tag: "new", text: "Performance mode now has a switch and is wired to the world: fewer particle sparks, shorter projectile trails, less ambience, no glow flashes and no heavy backdrop blur." },
      { tag: "improved", text: "The three settings sit with Touch controls in Settings, so the options for a phone are together instead of hidden in the save file." },
    ],
  },
  {
    version: "1.21.0",
    date: "November 12, 2026",
    title: "The Small Screen Update",
    summary:
      "The phone HUD was still laid out like the desktop one: the row of panel buttons ran off the right edge, so Settings could not be reached, and the combat log and quest tracker sat under the touch controls. The top row now wraps, the bottom bar keeps the abilities clear of the movement stick and action buttons, and every icon button says what it opens to a screen reader.",
    changes: [
      { tag: "fixed", text: "On phones, the panel buttons now wrap onto a second row, so Settings and every other sheet stay on screen." },
      { tag: "fixed", text: "The combat log sits above the movement stick instead of underneath it, so the last few lines stay readable while you walk." },
      { tag: "fixed", text: "The ability bar now sits in the free space between the movement stick and the attack buttons, so no ability is covered by Dodge or Attack." },
      { tag: "improved", text: "Touch potion buttons show how many are left, and the duplicate quickbar is hidden on phones to make room." },
      { tag: "improved", text: "The quest tracker moves above the aim stick and shows a compact next-step card on phones." },
      { tag: "improved", text: "The top-left vitals and top-right buttons no longer crowd each other on the narrowest phones." },
      { tag: "improved", text: "Each HUD icon button now has a descriptive name for screen readers instead of a single letter." },
    ],
  },
  {
    version: "1.20.0",
    date: "November 9, 2026",
    title: "The Last Shelves Update",
    summary:
      "Three pages were still the last plain ones in the game. The village vault was two loose columns with an unfinished button, the controls sheet was one undivided list of fifteen rows, and the memorial wall was a paragraph with a short list of names. All three now open on the same strip and cards as the backpack: vault and pack each in their own card with a fill meter and a click to move a piece, the controls sorted into Moving, Fighting, Using things, Getting around and Screens, and the wall showing how many heroes have fallen and how deep the best of them got.",
    changes: [
      { tag: "improved", text: "The vault opens on a strip showing your class, level, gold, how many squares are free in the pack and whether the vault can still grow, with Tidy vault and Deposit materials beside your purse." },
      { tag: "improved", text: "Vault and pack are two cards with their own titles and counts, and a fill meter on the vault, so how close it is to full is a glance instead of a sum." },
      { tag: "new", text: "The vault's next size is its own card, and when your purse is short it says exactly how much more gold you need." },
      { tag: "improved", text: "The controls sheet is sorted into five groups - Moving, Fighting, Using things, Getting around and Screens - each with a heading and a plain note, instead of fifteen rows in one run." },
      { tag: "improved", text: "Every control row is bordered and lights up on hover, so your eye can follow one line across its three columns." },
      { tag: "improved", text: "The gamepad note sits in its own card at the end instead of trailing the list." },
      { tag: "improved", text: "The memorial wall opens on a strip with how many hardcore heroes have fallen, the deepest level reached and the newest-first order, with the names kept in a proper card." },
      { tag: "fixed", text: "The controls sheet never mentioned the gamepad until the last line; the strip now counts keyboard, mouse and gamepad together." },
    ],
  },
  {
    version: "1.19.0",
    date: "November 9, 2026",
    title: "The Notice Board Update",
    summary:
      "The update board has grown to sixteen patches and was still one long scroll of fully opened cards, so reading back to an old patch meant scrolling past every note in between. It now opens on a strip that says what the newest patch is and how much you have not read, then groups the history by month, and every patch folds into a one-line row you can open when you want the details. Inside each card the notes are sorted into New, Improved, Fixed and Balance instead of arriving in one mixed list.",
    changes: [
      { tag: "new", text: "The board opens on a strip showing the newest patch, its version and date, then chips for how many patches there are, how many you have not read, and how many notes sit in the newest one." },
      { tag: "new", text: "Patches are grouped by month with a gold heading and a count, so November and October read as two chapters instead of one run." },
      { tag: "improved", text: "Every patch is now a folded row: version chip, title, date and note count together, with a chevron that turns as it opens." },
      { tag: "improved", text: "The newest patch and anything you have not read yet open themselves; patches you have already read stay folded." },
      { tag: "improved", text: "Notes are sorted into New, Improved, Fixed and Balance groups, each with its own colour and a plain count, so a fix is no longer buried between two new features." },
      { tag: "improved", text: "The Latest tag sits on the newest row beside its title instead of replacing the summary line." },
    ],
  },
  {
    version: "1.18.0",
    date: "November 9, 2026",
    title: "The Open Ledger Update",
    summary:
      "The quest log was the longest screen in the game and the least sorted: quests, bounties, the ring, the season, the story, the bestiary and the lore all ran down one column with nothing between them. It now opens on a hero strip that answers the question you came for - how much work is waiting - and puts that work into four named groups: Work, Trials, Your hero and Records. Every button is where it was; only the order and the headings are new.",
    changes: [
      { tag: "new", text: "The journal opens on a strip showing your class, level, zone and title, then chips for quests tracked, quests ready to hand in, bounties ready and deed points." },
      { tag: "new", text: "The page is split into four groups - Work, Trials, Your hero and Records - each with a gold heading and a plain note about what is inside." },
      { tag: "improved", text: "Quests that are ready to hand in come first, then the one you pinned, then open work, then the repeats you have already cleared." },
      { tag: "improved", text: "Every quest card now carries a thin progress bar under its objectives, so you can see how far along it is without reading each line." },
      { tag: "improved", text: "When no quest is tracked, the empty state sits inside the same card as the tracked list, so the page keeps its shape." },
      { tag: "improved", text: "The tip about collect objectives no longer trails off the end of the page; it sits in its own small panel." },
    ],
  },
  {
    version: "1.17.0",
    date: "November 9, 2026",
    title: "The Field Bag Update",
    summary:
      "The backpack was still the one screen that read like a grid of squares with no plan. It now opens on the same hero strip the shop counters use - your class, level, gold, squares used and gems held - and puts the bag, the gear you wear and the piece you selected into three cards, each with a gold title and a plain note about what is inside. Nothing moved on the buttons themselves; every filter, sort and tool is still where the click handler expects it.",
    changes: [
      { tag: "new", text: "The screen opens on a hero strip showing your class, level, zone, gold, how many squares you have used and how many gems you hold.", },
      { tag: "improved", text: "Bag, equipment and the selected piece now sit in three separate cards, so the screen reads in the same order as the shop counters.", },
      { tag: "improved", text: "Tidy, Wear best and the junk filter moved up into the hero strip, next to your purse instead of below the grid.", },
      { tag: "improved", text: "The bag card says how many squares are showing out of how many you carry, so a filter that hides things is never a mystery.", },
      { tag: "improved", text: "The selected piece card names what you are looking at - worn or in the bag, and its rarity - before the item detail.", },
      { tag: "fixed", text: "The worn-piece line under each gear card was written all in lower case; type and rarity now read properly.", },
    ],
  },
  {
    version: "1.16.0",
    date: "November 9, 2026",
    title: "The Clear Glass Update",
    summary:
      "The Settings sheet stopped being one long column of switches. It now opens as four cards, one for Screen, one for Comfort and access, one for Input and language, and one row of sheets worth opening once - each line a plain sentence about what the control does, with a real switch instead of a bare checkbox. Camera zoom also takes effect the moment you pick it, instead of waiting for the next zone.",
    changes: [
      { tag: "improved", text: "Settings is grouped into four cards, so Screen and Comfort are no longer mixed into the same pile." },
      { tag: "improved", text: "Every line now says what it does in one plain sentence, under a bold name, instead of a short label." },
      { tag: "improved", text: "On and off settings use a proper sliding switch, so an enabled setting is visible at a glance." },
      { tag: "improved", text: "The three help pages - Controls sheet, Update board and Show the tutorial - sit together at the end, in one row." },
      { tag: "fixed", text: "Camera zoom now changes the view immediately; before, it only took effect after walking into another zone." },
    ],
  },
  {
    version: "1.15.0",
    date: "November 9, 2026",
    title: "The Counter Update",
    summary:
      "Borin's Forge, Mira's Goods, Elara's Remedies and Gideon's table now look like four counters in one village instead of four unrelated screens. Each one opens on the person serving you, their line, your purse and your free squares; stock is grouped on named shelves with rarity tags and the exact reason a line is locked; selling from the pack shows what each square is worth; and Borin's bench puts the gear you wear beside the recipes you could forge, with the ore and coin you are short of turning red.",
    changes: [
      { tag: "new", text: "Every shop opens on a counter header showing the merchant, their greeting, your level, your gold and how many backpack squares are free." },
      { tag: "improved", text: "Stock is sorted onto named shelves: Supplies, Gear, Gems and Companion kit, with gear listed by name instead of in an arbitrary order." },
      { tag: "improved", text: "Each line of stock carries a rarity tag, a level tag, a stack-size tag and a coloured rarity flag, so a blue piece reads as blue before you read the name." },
      { tag: "improved", text: "A line you cannot buy now says why in plain words on the button itself, and the price turns red when your purse is short." },
      { tag: "improved", text: "The village trust discount is shown as a perk on the counter instead of a loose line of green text." },
      { tag: "improved", text: "Selling shows the gold each square pays in its corner, with the bulk buttons moved up into the card header." },
      { tag: "improved", text: "Borin's bench splits into what you wear and what you could make: each piece shows its temper rank as pips and the next cost as chips that turn green when you can pay and red when you cannot." },
      { tag: "improved", text: "Each recipe shows a chip per material with have against need, and the price, so you can see the one thing you are missing at a glance." },
      { tag: "improved", text: "Gideon's table is three crates rather than three rows: one price, the crate, a Roll button, and a line that says exactly how much more gold you need when you cannot pay." },
      { tag: "improved", text: "The gamble odds are written out in a proper note instead of squeezed into a stat tile." },
      { tag: "fixed", text: "The unused price import behind Gideon's old panel was removed, so the counter code is clean." },
    ],
  },
  {
    version: "1.14.0",
    date: "November 9, 2026",
    title: "The Town Ledger Update",
    summary:
      "Seven screens that were built one patch at a time finally speak the same language. The Journal has a grouped bar with badges for work that is waiting, the talent tree reads as a proper ladder, the village and the runeword book show progress you can see at a glance, your companion has a stage ladder and real gear slots, every villager opens on a portrait with their hearts showing, and Settings leads with your hero instead of a wall of sliders.",
    changes: [
      { tag: "improved", text: "The Journal bar is sorted into Work, Trials, Your hero and Records instead of sixteen links in a row, and a gold badge counts the quests ready to hand in and the bounties waiting to be collected." },
      { tag: "improved", text: "Every quest is now a card with a title row, its objectives, then a footer showing what it pays and what you can do about it. Quests ready to turn in are marked with a gold edge, not just a line of text." },
      { tag: "improved", text: "Talents read as a ladder down the page: a summary strip at the top, the class passive in its own card, then one tier per rung with a filled dot once a choice is taken and a clear tag on each option." },
      { tag: "new", text: "Rebuild Eldoria opens with a progress bar and a row of effect chips for the attack, health, defence, experience, gold and shop discount the village is giving you right now." },
      { tag: "improved", text: "Each building card shows its stages as a rail with the count beside it, then Now against Next, and the price turns red on the part you are short of." },
      { tag: "new", text: "Your companion has a stage ladder across the top with the current stage lit and the levels to the next one counted out, so the slide from Hatchling to Elder is something you can watch." },
      { tag: "improved", text: "Collar and charm are real gear slots that say what is worn, and every runeword shows how close its three gems are with a bar and a ready count." },
      { tag: "improved", text: "Every villager opens on a portrait strip with their name in their own colour and their hearts underneath, a proper quoted line, and their quests and training sorted into cards." },
      { tag: "improved", text: "Training shows each class ability with its icon and an Unlocked tag, so a level-up is visible instead of a line of small text." },
      { tag: "improved", text: "Settings starts with a strip showing your hero, class, level, zone, difficulty, Torment tier and gold, and every row is a bordered card with a proper label." },
      { tag: "fixed", text: "The separator and icon characters in these panels were double-encoded and showed as broken boxes and stray letters. They are clean now, on every screen." },
    ],
  },
  {
    version: "1.13.0",
    date: "November 8, 2026",
    title: "The Field Kit Update",
    summary:
      "The backpack stopped being a plain box. It is now a character sheet: the bag on the left, your five worn pieces as cards beside it with their totals underneath, filter chips that tell you how many of each thing you hold, a rarity stripe on every slot, and a green or red mark on gear that beats or loses to what you wear.",
    changes: [
      { tag: "improved", text: "Backpack and equipment share one screen with the same look. Each worn piece is a card showing its icon, slot, name, rarity and how many sockets are filled, and the bag sits right beside it." },
      { tag: "new", text: "Gear totals at the foot of the equipment panel add up Attack, Defence, Health and Crit across all five slots, so the sheet answers the question you actually ask." },
      { tag: "improved", text: "Every slot shows a rarity stripe along its bottom edge, so the good drops stand out without reading names." },
      { tag: "new", text: "A green up arrow marks gear that beats what you wear and a red down arrow marks gear that loses, right on the slot - judged before you click." },
      { tag: "improved", text: "Filter chips count what is in the bag, and a filter with nothing in it fades out instead of inviting a click. Helm, boots and trinket filters were added too." },
      { tag: "improved", text: "A fill meter runs under the backpack header and turns amber at 20 squares, red when full, so a full bag is noticed before a drop is lost." },
      { tag: "improved", text: "The item card wears its rarity on a coloured edge, and the compare strip shows gains and losses in one tidy box." },
    ],
  },
  {
    version: "1.12.0",
    date: "November 8, 2026",
    title: "The Red Sky Update",
    summary:
      "Four things a fight and a run were missing: enemies that warn you before a heavy blow, a card that tells you what a run actually earned, chests that sometimes bite, and a red sky that thickens packs and fattens purses. Gold also has somewhere to go now, because Gideon sells rolls.",
    changes: [
      { tag: "new", text: "Attack tells: slimes, wolves, skeletons and the rest wind up a named heavy attack with a shape on the ground first. Step out of the shape and the blow misses entirely, and the game counts every one you dodge." },
      { tag: "new", text: "Run recap card: leaving the Ring, the Descent or the Gauntlet now shows a card with the depth reached, the clock, the kills, what it paid, the medal and the boons taken. It stays in the Journal after a reload." },
      { tag: "new", text: "The Blood Moon: every so often a red haze gathers, then the sky turns for two and a half minutes. Packs are thicker, everything hits 15% harder and pays half again as much gold, with more experience and more drops." },
      { tag: "new", text: "Mimics: some chests out in the world are not chests. Open one and a Chest Mimic wakes up and bites. Killing it leaves the loot the chest would have held, and then some." },
      { tag: "new", text: "Gideon the Gambler: a new face at the village market who sells no goods at all. Pay 260 gold for a weapon, a piece of armour or a trinket, and the dice decide the rarity." },
      { tag: "improved", text: "Old saves upgrade themselves to version 21, with the Blood Moon clock, the recap card and the new counters all starting clean." },
    ],
  },
  {
    version: "1.11.0",
    date: "November 7, 2026",
    title: "The Sharpened Edge Update",
    summary:
      "The small things that made every session a little more work than play. Junk gear now turns into ore the moment it drops, three gems of a kind become one better stone, every run gets a clock and a medal for beating your own best, and the villagers have a standing you can see, raise with gifts and be rewarded for at three hearts.",
    changes: [
      { tag: "new", text: "Junk filter: commons and uncommons your class cannot use become ore the second they drop, so the bag stops filling with gear you were going to sell anyway. Toggle it in the backpack." },
      { tag: "new", text: "Gem ladder: three rough gems fuse into one cut one, three cut into one flawless. Flawless stones give three times the bonus of a rough one." },
      { tag: "new", text: "Timed medals: the Hollow Ring, the Descent and the Gauntlet now run a clock. Clear a depth quickly for gold, silver or bronze, and a faster run replaces a slower one." },
      { tag: "new", text: "Village hearts: every villager carries five hearts, raised by giving them the thing they actually want. At three hearts each one hands over a keepsake trinket that only pays once." },
      { tag: "improved", text: "Leaving the Ring, the Descent or the Gauntlet now records the time. Dying in the Ring records it too, so even a bad run can earn a medal." },
      { tag: "improved", text: "Old saves upgrade themselves to version 20, with an empty medal board and no keepsakes claimed." },
    ],
  },
  {
    version: "1.10.0",
    date: "November 7, 2026",
    title: "The Rebuilt Village Update",
    summary:
      "Gold finally has somewhere to go. Seven village buildings can be rebuilt five times each, and every stage helps every hero on this device. Companions now wear a collar and a charm and learn a skill, three gems in one piece of gear spell a runeword, a hardcore hero can be forged who dies for good, and one button draws your hero as a picture you can post.",
    changes: [
      { tag: "new", text: "Rebuild Eldoria: the forge, the chapel, the gatehouse, the marketplace, the stable, the archive and the workshop, five stages each, paid in gold and materials and kept forever." },
      { tag: "new", text: "Village bonuses that help every hero on this account: more attack, health, defense, experience, gold, cheaper shops and stronger potions." },
      { tag: "new", text: "Companion gear: a collar and a charm, sold by Mira and found in the world, each making the companion hit harder and lending the hero a little more." },
      { tag: "new", text: "Companion skills: Guard, Venom Fang, Chilling Bite, Ember Fang, Hunter's Mark and Frenzy. One is taught at a time and every bite carries it." },
      { tag: "new", text: "Runewords: seven three-gem combinations, from Emberheart to Starforge, that wake a power no single gem gives. Set them into any gear with three sockets." },
      { tag: "new", text: "Hardcore heroes: tick the box when you forge one and a single death ends them for good. Their name goes on a memorial wall you can open from the character screen." },
      { tag: "new", text: "Share card: one button draws your hero, class, title, level and best runs as a PNG picture to post anywhere." },
      { tag: "improved", text: "Sell all materials now leaves gems and companion gear alone, so a press of the broom cannot throw away a runeword." },
      { tag: "improved", text: "Old saves upgrade themselves to version 19, with the village unbuilt and the companion slots empty." },
    ],
  },
  {
    version: "1.9.0",
    date: "November 6, 2026",
    title: "The Shared Vault Update",
    summary:
      "The vault now belongs to you, not to one hero: store something with one character and the next character finds it waiting. Gems are in the world too, and any piece of gear has sockets to hold them. A Torment dial raises the whole realm for better pay, companions grow through four stages, and every achievement now pays gold, experience and a gem you can collect.",
    changes: [
      { tag: "new", text: "One shared vault: every hero on this device sees the same squares and the same gear. Best vault size and all stored items carry across." },
      { tag: "new", text: "Gems: eight stones with different bonuses, bought from Mira or dropped by bosses and given as achievement rewards." },
      { tag: "new", text: "Sockets: common gear holds one gem, legendary holds five, and gear upgraded to +3 opens one more. A set gem keeps working while the item is worn." },
      { tag: "new", text: "Torment, ten tiers from +25% to 7.2x monster toughness, paying up to 4.2x gold and experience. Tiers open with level and the top ones need the Hollow King beaten." },
      { tag: "new", text: "Companions grow through four stages: Hatchling, Youngling, Companion and Elder, each hitting harder and lending the hero a small bonus." },
      { tag: "new", text: "Achievement rewards you collect: gold, experience and a gem for every achievement, once each, with a Collect all button." },
      { tag: "improved", text: "The item card now names the gems set into a piece of gear, and worn gear can be re-gemmed or emptied at any time." },
      { tag: "improved", text: "Old saves upgrade themselves to version 18, with no gem, Torment or claim data missing." },
    ],
  },
  {
    version: "1.8.0",
    date: "November 6, 2026",
    title: "The Reckoning Update",
    summary:
      "Shards finally buy something that lasts. Seven relics stay with you forever, a risk dial pays triple for the brave, and every story boss now stands together in one gauntlet. The roads also keep a few surprises: a purse imp that runs for its life, buried chests with a coin to follow, and a training dummy that tells you exactly how hard you hit.",
    changes: [
      { tag: "new", text: "Relics: seven permanent upgrades bought with shards. They never reset, so a bad run still leaves you stronger." },
      { tag: "new", text: "The risk dial: four levels of handicap, from a plain run to the Long Dark, paying up to triple shards." },
      { tag: "new", text: "The Gauntlet: all four story bosses back to back with no waves between. Finishing it pays 3,000 gold and 50 shards." },
      { tag: "new", text: "Descent boons that change the fight, not just a number: life steal, healing on kills, spiked hide, and a finisher for wounded foes." },
      { tag: "new", text: "A purse imp that bolts when it is hit. Catch it before the timer runs out and its fat purse is yours." },
      { tag: "new", text: "Buried treasure hunts: a coin and a plain-words direction lead you to a chest that was not there before." },
      { tag: "new", text: "The training dummy in the village now measures your hits, with records for the hardest blow and the longest combo." },
      { tag: "new", text: "The Turning Week: a weekly mood over every zone and a daily chest that rewards a streak." },
      { tag: "improved", text: "Fights feel heavier: a brief freeze on big hits, slow motion on a boss kill, and rumble on a gamepad." },
      { tag: "improved", text: "Sell all junk gear in one press, so a full bag no longer means a trip to three different merchants." },
      { tag: "improved", text: "New settings for aim assist, phone vibration, and a lighter performance mode for older devices." },
      { tag: "improved", text: "Old saves upgrade themselves to version 17, so nobody is left behind by the shard shop." },
    ],
  },
  {
    version: "1.7.0",
    date: "November 5, 2026",
    title: "The Vault Update",
    summary:
      "Mira has opened the back room. Store the gear and materials you cannot carry, expand the vault with gold, and keep your backpack for the fight ahead.",
    changes: [
      { tag: "new", text: "Mira's Vault: a 24-square storehouse that grows to 60 squares with three gold upgrades." },
      { tag: "new", text: "Deposit materials in one click, tidy the vault, and take anything back into your backpack." },
      { tag: "improved", text: "Vault space and contents travel with your save, so nothing is lost between sessions." },
      { tag: "improved", text: "Old saves gain an empty first-tier vault automatically." },
    ],
  },
  {
    version: "1.6.0",
    date: "November 3, 2026",
    title: "The Grudge Update",
    summary:
      "Fights now build momentum, every creature has one element it cannot stand, and the thing that beats you remembers your name. The Hollow Ring and the free Journey track give you a reason to come back.",
    changes: [
      { tag: "new", text: "Hit chains: land hits without taking one and the momentum carries you, with a bonus at every milestone." },
      { tag: "new", text: "Weaknesses: every creature is soft against one element. The bestiary and the boss card print which." },
      { tag: "new", text: "The Hollow Ring: an endless wave arena behind the village gate. Free to enter, deeper is better paid." },
      { tag: "new", text: "The Journey: a free, permanent track filled by finishing deeds. It never expires and never resets." },
      { tag: "new", text: "A rival: fall in a fight and that monster remembers you, growing stronger until the grudge is settled." },
      { tag: "new", text: "Saved gear sets: store what you are wearing and swap back to it in one press." },
      { tag: "improved", text: "The journal gains Journey, Deeds, Ring, Rival and Sets pages, and the HUD shows your chain and ring run." },
      { tag: "improved", text: "Old saves upgrade themselves, so no hero is left behind by this update." },
    ],
  },
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

const TAG_ORDER: UpdateTag[] = ["new", "improved", "fixed", "balance"];

/** "November 9, 2026" -> "November 2026", so the board can group its patches by month. */
function monthKey(date: string): string {
  const parts = date.trim().split(/\s+/);
  const month = parts[0] ?? date;
  const year = parts.length > 1 ? parts[parts.length - 1] : "";
  return year ? `${month} ${year}` : month;
}

/** One block per kind of note, so a patch reads as New / Improved / Fixed / Balance. */
function changeGroupsHtml(update: GameUpdate): string {
  return TAG_ORDER.map((tag) => {
    const rows = update.changes.filter((change) => change.tag === tag);
    if (rows.length === 0) return "";
    const notes = rows
      .map(
        (row) =>
          `<li class="update-change"><span class="update-mark" aria-hidden="true"></span><span>${esc(row.text)}</span></li>`,
      )
      .join("");
    return `<div class="update-group tag-${tag}">
          <div class="update-group-head">
            <span class="update-group-label">${esc(TAG_LABELS[tag])}</span>
            <span class="update-group-count">${rows.length} ${rows.length === 1 ? "note" : "notes"}</span>
          </div>
          <ul class="update-changes">${notes}</ul>
        </div>`;
  }).join("");
}

export function updateBoardHtml(): string {
  const unread = unreadUpdateCount();
  const latest = LATEST_UPDATE;
  const totalNotes = GAME_UPDATES.reduce((sum, update) => sum + update.changes.length, 0);

  const strip = `<div class="update-sum">
      <div class="update-sum-main">
        <span class="update-kicker">Latest patch</span>
        <strong class="update-sum-title">${esc(latest.title)}</strong>
        <span class="update-sum-meta">v${esc(latest.version)} &middot; ${esc(latest.date)}</span>
      </div>
      <div class="update-sum-chips">
        <span class="update-chip"><span class="update-chip-value">${GAME_UPDATES.length}</span><span class="update-chip-label">patches</span></span>
        <span class="update-chip${unread > 0 ? " is-new" : ""}"><span class="update-chip-value">${unread}</span><span class="update-chip-label">unread</span></span>
        <span class="update-chip"><span class="update-chip-value">${latest.changes.length}</span><span class="update-chip-label">notes here</span></span>
        <span class="update-chip"><span class="update-chip-value">${totalNotes}</span><span class="update-chip-label">notes all told</span></span>
      </div>
    </div>`;

  // The history runs down one column by version; month headings turn it into chapters.
  const months = new Map<string, GameUpdate[]>();
  for (const update of GAME_UPDATES) {
    const key = monthKey(update.date);
    const bucket = months.get(key);
    if (bucket) bucket.push(update);
    else months.set(key, [update]);
  }

  // At most three patches open at once: the newest, plus the ones you have not read yet.
  // A fresh browser reports every patch as unread, and sixteen open cards is not a tidy board.
  const openCount = unread > 0 ? Math.min(unread, 3) : 1;
  let position = 0;
  const sections: string[] = [];
  for (const [month, updates] of months) {
    const cards = updates
      .map((update) => {
        const isLatest = position === 0;
        const isOpen = position < openCount;
        position += 1;
        const count = update.changes.length;
        return `<details class="update-card${isLatest ? " latest" : ""}"${isOpen ? " open" : ""}>
        <summary>
          <span class="update-version-chip">v${esc(update.version)}</span>
          <span class="update-card-title">
            <strong>${esc(update.title)}</strong>
            <span class="small muted">${esc(update.date)} &middot; ${count} ${count === 1 ? "note" : "notes"}</span>
          </span>
          ${isLatest ? `<span class="update-latest-tag">Latest</span>` : ""}
          <span class="update-chevron" aria-hidden="true">&rsaquo;</span>
        </summary>
        <div class="update-card-body">
          <p class="update-summary">${esc(update.summary)}</p>
          <div class="update-groups">${changeGroupsHtml(update)}</div>
        </div>
      </details>`;
      })
      .join("");
    sections.push(`<section class="update-month">
        <div class="update-month-head">
          <span class="update-month-title">${esc(month)}</span>
          <span class="update-month-note">${updates.length} ${updates.length === 1 ? "patch" : "patches"}</span>
        </div>
        ${cards}
      </section>`);
  }

  return `${strip}${sections.join("")}`;
}
