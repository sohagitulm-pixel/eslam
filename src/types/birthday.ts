export type Language = 'en' | 'ar';

export type RelationshipType =
  | 'friend'
  | 'partner'
  | 'child'
  | 'parent'
  | 'sibling'
  | 'family'
  | 'colleague'
  | 'other';

export type SectionType =
  | 'welcome'
  | 'intro'
  | 'cake'
  | 'memories'
  | 'timeline'
  | 'gifts'
  | 'scratch'
  | 'quiz'
  | 'wheel'
  | 'wishes'
  | 'videoWall'
  | 'puzzle'
  | 'futureLetter'
  | 'finalMessage'
  | 'grandFinale';

export type VisibilityType = 'public' | 'unlisted' | 'private';

export type CakeDesign =
  | 'classic-tier'
  | 'royal-crown'
  | 'rose-garden'
  | 'neon-party'
  | 'pastel-cloud'
  | 'luxury-tiered'
  | 'chocolate-ganache'
  | 'white-elegant'
  | 'childrens-colorful'
  | 'black-gold';

export type CandleMode = 'auto' | 'individual' | 'numeral';

export type CandleStyle = 'classic-ivory' | 'gold-metallic' | 'pastel-spiral' | 'rose-blush';

export type BookPaletteKey =
  | 'luxury'
  | 'romantic'
  | 'magical'
  | 'floral'
  | 'minimal'
  | 'colorful';

export type HeadingFontOption = 'cormorant' | 'playfair' | 'jakarta';
export type BodyFontOption = 'jakarta' | 'lora' | 'cairo';

export interface DecorationsConfig {
  corners: boolean;
  stars: boolean;
  florals: boolean;
  ribbons: boolean;
}

export interface CakeColorsConfig {
  tier1: string;
  tier2: string;
  frosting: string;
  accent: string;
}

export type GiftBoxStyle = 'velvet-crimson' | 'ivory-gold' | 'lavender-silk' | 'midnight-star';

export interface EffectsConfig {
  enabled: boolean;
  roses: boolean;
  petals: boolean;
  balloons: boolean;
  hearts: boolean;
  fireworks: boolean;
  confetti: boolean;
  sparkles: boolean;
  speed: number; // 0.3 to 2.0
  density: number; // 0.3 to 2.0
  intensity: number; // 0.3 to 2.0
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface ThemePalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  secondary: string;
  accent: string;
  dark: boolean;
}

export interface BirthdayTemplate {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: 'romantic' | 'luxury' | 'playful' | 'floral' | 'editorial' | 'night';
  cakeDesign: CakeDesign;
  palette: ThemePalette;
  bookStyle?: BookPaletteKey;
  bookCoverColor?: string;
  paperColor?: string;
  candleStyle?: CandleStyle;
  effectsConfig: EffectsConfig;
  active: boolean;
  featured: boolean;
}

export interface SectionConfig {
  id: string;
  type: SectionType;
  visible: boolean;
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  order: number;
}

export interface MemoryItem {
  id: string;
  title: string;
  message: string;
  date: string;
  location?: string;
  photoUrl: string;
  songTitle?: string;
  songArtist?: string;
  audioUrl?: string;
  coverArtUrl?: string;
}

export interface GiftBoxItem {
  id: string;
  label: string;
  boxStyle: GiftBoxStyle;
  revealType: 'message' | 'photo' | 'audio' | 'video';
  message: string;
  mediaUrl?: string;
}

export interface ScratchCardItem {
  id: string;
  title: string;
  hiddenMessage: string;
  hiddenPhotoUrl?: string;
  coverColor: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  photoUrl?: string;
  options: string[];
  correctIndex: number;
  funFact: string;
}

export interface WheelItem {
  id: string;
  label: string;
  color: string;
  rewardMessage: string;
}

export interface PuzzleConfig {
  title: string;
  imageUrl: string;
  gridSize: 3 | 4 | 5;
  hiddenMessage: string;
}

export interface FutureLetterMeta {
  enabled: boolean;
  title: string;
  unlockDateIso: string; // ISO string for UI countdown
  envelopeStyle: 'ivory-wax' | 'crimson-velvet' | 'gold-foil';
}

export interface FutureLetterSecret {
  experienceId: string;
  ownerId: string;
  unlockAt: unknown; // Firestore Timestamp
  message: string;
  senderName: string;
  photoUrl?: string;
  audioUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AudioConfig {
  bgTrackId: string; // preset synth id or 'custom'
  bgTrackTitle: string;
  customAudioUrl?: string;
  volume: number; // 0 to 1
  muted: boolean;
}

export interface ThemeConfig {
  palette: ThemePalette;
  cakeDesign: CakeDesign;
  fontStyle: 'editorial' | 'modern' | 'playful';
  headlineText: string;
  introMessage: string;
  cakeWishPrompt: string;
  // Luxury 3D Birthday Memory Book & Customization fields (stored cleanly inside Firestore themeConfig map)
  bookTitle?: string;
  bookCoverColor?: string;
  paperColor?: string;
  bookStyle?: BookPaletteKey;
  candleMode?: CandleMode;
  candleStyle?: CandleStyle;
  cakeColors?: CakeColorsConfig;
  headingFont?: HeadingFontOption;
  bodyFont?: BodyFontOption;
  decorations?: DecorationsConfig;
}

export interface BirthdayExperience {
  id: string;
  ownerId: string;
  title: string;
  recipientName: string;
  recipientAge?: string;
  relationship?: RelationshipType;
  birthdayDate?: string;
  language: Language;
  templateId: string;
  visibility: VisibilityType;
  published: boolean;
  passcodeEnabled?: boolean;
  passcodeHash?: string;
  passcodeHint?: string;
  moderationRequired?: boolean;
  viewCount: number;
  reportCount?: number;
  coverImage?: string;
  themeConfig: ThemeConfig;
  effectsConfig: EffectsConfig;
  audioConfig: AudioConfig;
  sections: SectionConfig[];
  memories: MemoryItem[];
  gifts: GiftBoxItem[];
  scratchCards: ScratchCardItem[];
  quiz: {
    title: string;
    questions: QuizQuestion[];
  };
  wheel: {
    title: string;
    items: WheelItem[];
  };
  puzzle: PuzzleConfig;
  futureLetterMeta: FutureLetterMeta;
  finalMessage: {
    title: string;
    body: string;
    senderName: string;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BirthdayWish {
  id: string;
  experienceId: string;
  ownerId: string;
  authorName: string;
  isAnonymous: boolean;
  type: 'wish' | 'text' | 'audio' | 'video';
  message: string;
  mediaUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  leafColor?: string;
  createdAt?: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  language: Language;
  role: 'user' | 'admin';
  storageUsedBytes: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ContentReport {
  id: string;
  experienceId: string;
  experienceTitle: string;
  reason: string;
  reporterUid?: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt?: unknown;
}

export interface PlatformSettings {
  maxPhotosPerExperience: number;
  maxFileSizeMb: number;
  maxStoragePerUserMb: number;
  moderationRequiredDefault: boolean;
  maintenanceMode: boolean;
  updatedAt?: unknown;
}
