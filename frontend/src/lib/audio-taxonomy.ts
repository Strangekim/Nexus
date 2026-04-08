// 오디오 분류 체계 — 프론트엔드 하드코딩 (API 무관하게 카테고리 탭 표시용)

export interface TaxonomyMid {
  name: string;
  subs: string[];
}

export interface TaxonomyMajor {
  key: string;
  label: string;
  mids: TaxonomyMid[];
}

/** 전체 분류 체계 */
export const AUDIO_TAXONOMY: TaxonomyMajor[] = [
  {
    key: 'Ambience',
    label: 'Ambience',
    mids: [
      { name: 'Nature', subs: ['Forest', 'Ocean', 'River', 'Wind', 'Birds', 'Insects', 'Rain_Forest'] },
      { name: 'Urban', subs: ['City_Traffic', 'Street', 'Construction', 'Market', 'Subway'] },
      { name: 'Interior', subs: ['Office', 'Restaurant', 'Hospital', 'School', 'Home', 'Mall'] },
      { name: 'Exterior', subs: ['Park', 'Parking_Lot', 'Airport', 'Stadium', 'Harbor'] },
      { name: 'Weather', subs: ['Rain', 'Thunder', 'Wind', 'Snow', 'Hail'] },
      { name: 'Special', subs: ['Sci_Fi', 'Fantasy', 'Horror', 'Underwater'] },
      { name: 'Designed', subs: ['Abstract', 'Processed'] },
      { name: 'Mechanical', subs: ['Factory', 'Engine', 'HVAC'] },
      { name: 'Human', subs: ['Crowd', 'Walla', 'Children'] },
    ],
  },
  {
    key: 'Cinematic',
    label: 'Cinematic',
    mids: [
      { name: 'Riser_Sweller', subs: ['Short_Riser', 'Long_Riser', 'Reverse_Riser', 'Swell'] },
      { name: 'Hit_Impact', subs: ['Cinematic_Hit', 'Sub_Hit', 'Orchestral_Hit', 'Hybrid_Hit'] },
      { name: 'Whoosh_Transition', subs: ['Fast_Whoosh', 'Slow_Whoosh', 'Flyby', 'Sweep'] },
      { name: 'Drone_Texture', subs: ['Dark_Drone', 'Light_Texture', 'Evolving_Pad', 'Granular'] },
      { name: 'UI_Notification', subs: ['Button_Click', 'Alert', 'Confirm', 'Cancel', 'Hover'] },
      { name: 'Stab_Sting', subs: ['Orchestra_Stab', 'Synth_Sting', 'Brass_Stab'] },
      { name: 'Dark', subs: ['Horror', 'Suspense', 'Eerie'] },
      { name: 'Fantasy', subs: ['Magic', 'Sparkle', 'Enchant'] },
      { name: 'Horror', subs: ['Scare', 'Creep', 'Jump_Scare'] },
      { name: 'Sci_Fi', subs: ['Laser', 'Hologram', 'Warp'] },
      { name: 'Tension', subs: ['Build', 'Sustain', 'Release'] },
      { name: 'Texture', subs: ['Organic', 'Synthetic', 'Metallic'] },
      { name: 'Transition', subs: ['Cut', 'Fade', 'Swipe'] },
      { name: 'Impact', subs: ['Boom', 'Thud', 'Crash'] },
    ],
  },
  {
    key: 'Dialogue_VO',
    label: 'Dialogue / VO',
    mids: [
      { name: 'Dialogue', subs: [] },
      { name: 'Narration_VO', subs: [] },
      { name: 'Crowd_Dialogue', subs: [] },
      { name: 'Announcement', subs: [] },
      { name: 'Voiceover', subs: [] },
      { name: 'Synthetic', subs: [] },
      { name: 'Human', subs: [] },
    ],
  },
  {
    key: 'Foley',
    label: 'Foley',
    mids: [
      { name: 'Footsteps', subs: ['Concrete', 'Wood', 'Gravel', 'Grass', 'Metal', 'Carpet', 'Tile', 'Snow', 'Mud', 'Sand'] },
      { name: 'Cloth_Rustle', subs: ['Jacket', 'Dress', 'Denim', 'Leather'] },
      { name: 'Body_movement', subs: ['Jump', 'Fall', 'Crawl', 'Roll'] },
      { name: 'Hand_Touch', subs: ['Grab', 'Release', 'Tap', 'Scratch'] },
      { name: 'Object_handling', subs: ['Cup_Glass', 'Paper', 'Plastic', 'Metal_Object', 'Wood_Object'] },
      { name: 'Door_Window', subs: ['Open', 'Close', 'Knock', 'Creak', 'Slide'] },
      { name: 'Furniture', subs: ['Chair', 'Drawer', 'Cabinet', 'Table'] },
      { name: 'Eating_Drinking', subs: ['Chew', 'Sip', 'Pour', 'Swallow'] },
      { name: 'Writing', subs: ['Pen', 'Pencil', 'Keyboard', 'Chalk'] },
      { name: 'Liquid', subs: ['Pour', 'Splash', 'Drip', 'Bubble'] },
      { name: 'Material', subs: ['Glass', 'Metal', 'Wood', 'Fabric', 'Paper'] },
      { name: 'Movement', subs: ['Slide', 'Drag', 'Roll', 'Spin'] },
      { name: 'Object_Interaction', subs: ['Stack', 'Drop', 'Catch', 'Throw'] },
      { name: 'Body', subs: ['Clap', 'Snap', 'Slap', 'Stomp'] },
      { name: 'Misc_Foley', subs: [] },
    ],
  },
  {
    key: 'Hard_SFX',
    label: 'Hard SFX',
    mids: [
      { name: 'Impact_Hit', subs: ['Punch', 'Kick', 'Slam', 'Thud', 'Metal_Hit', 'Wood_Hit'] },
      { name: 'Crash_Break', subs: ['Glass_Shatter', 'Wood_Break', 'Metal_Crash', 'Ceramic_Break'] },
      { name: 'Explosion', subs: ['Small', 'Medium', 'Large', 'Distant', 'Debris'] },
      { name: 'Gunshot_Weapon', subs: ['Pistol', 'Rifle', 'Shotgun', 'Laser', 'Sword', 'Bow'] },
      { name: 'Vehicle', subs: ['Car', 'Motorcycle', 'Truck', 'Helicopter', 'Airplane', 'Boat'] },
      { name: 'Fire', subs: ['Campfire', 'Torch', 'Inferno', 'Match'] },
      { name: 'Water_impact', subs: ['Splash', 'Drip', 'Underwater', 'Wave'] },
      { name: 'Mechanical', subs: ['Gear', 'Lock', 'Switch', 'Motor', 'Hydraulic'] },
      { name: 'Electrical', subs: ['Spark', 'Buzz', 'Zap', 'Short_Circuit'] },
      { name: 'Animal', subs: ['Dog', 'Cat', 'Bird', 'Horse', 'Insect', 'Monster'] },
      { name: 'Human_nonspeech', subs: ['Breath', 'Cough', 'Scream', 'Laugh', 'Grunt', 'Gasp'] },
      { name: 'Impact', subs: ['Generic', 'Body', 'Object'] },
      { name: 'Weapon', subs: ['Sword', 'Shield', 'Bow', 'Magic'] },
      { name: 'Whoosh', subs: ['Fast', 'Slow', 'Heavy', 'Light'] },
      { name: 'UI', subs: ['Click', 'Beep', 'Notification', 'Error'] },
      { name: 'Cartoon', subs: ['Boing', 'Splat', 'Pop', 'Squeak'] },
      { name: 'Electronic', subs: ['Glitch', 'Digital', 'Synth'] },
      { name: 'Construction', subs: ['Hammer', 'Drill', 'Saw'] },
      { name: 'Sports', subs: ['Ball', 'Whistle', 'Crowd'] },
      { name: 'General', subs: [] },
    ],
  },
  {
    key: 'Music',
    label: 'Music',
    mids: [
      { name: 'BGM', subs: ['Cinematic_Score', 'Lo_fi_Chill', 'Electronic', 'Orchestral', 'Acoustic', 'Rock', 'Jazz', 'Hip_Hop', 'World'] },
      { name: 'Stinger', subs: ['Hit_Stinger', 'Reveal_Stinger', 'Transition_Stinger'] },
      { name: 'Jingle', subs: ['Intro_Jingle', 'Outro_Jingle', 'Notification_Jingle'] },
      { name: 'Drone_Pad', subs: ['Ambient_Pad', 'Dark_Drone', 'Bright_Pad'] },
      { name: 'Score', subs: ['Orchestral', 'Electronic', 'Hybrid'] },
      { name: 'Percussion', subs: ['Acoustic', 'Electronic', 'World'] },
    ],
  },
];

/** major key → label 매핑 */
export const MAJOR_LABELS: Record<string, string> = Object.fromEntries(
  AUDIO_TAXONOMY.map((t) => [t.key, t.label]),
);
