/** The 20 pet species a hatched egg can become. */
export interface PetSpecies {
  id: string;
  name: string;
  /** Colour used for the hatchling sprite and its hit burst. */
  color: number;
}

export const PET_SPECIES: PetSpecies[] = [
  { id: "sprout", name: "Sprout", color: 0x8ff58f },
  { id: "ember", name: "Ember", color: 0xff9a55 },
  { id: "tide", name: "Tide", color: 0x6ccaff },
  { id: "pebble", name: "Pebble", color: 0xc4a582 },
  { id: "gust", name: "Gust", color: 0xe2f8ff },
  { id: "glow", name: "Glow", color: 0xfff9a8 },
  { id: "shade", name: "Shade", color: 0x7d6aa6 },
  { id: "frost", name: "Frost", color: 0xc2f4ff },
  { id: "blossom", name: "Blossom", color: 0xffb8dc },
  { id: "spark", name: "Spark", color: 0xfff06a },
  { id: "moss", name: "Moss", color: 0x6fa650 },
  { id: "bolt", name: "Bolt", color: 0xfcfca8 },
  { id: "dusk", name: "Dusk", color: 0xa57aff },
  { id: "coral", name: "Coral", color: 0xff8f8f },
  { id: "sand", name: "Sand", color: 0xffdc96 },
  { id: "ash", name: "Ash", color: 0xb0b0b0 },
  { id: "mist", name: "Mist", color: 0xf0f8fc },
  { id: "ruby", name: "Ruby", color: 0xff5f5f },
  { id: "sapphire", name: "Sapphire", color: 0x5f8fff },
  { id: "amber", name: "Amber", color: 0xffc977 },
];
