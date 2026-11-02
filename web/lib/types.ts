export type Category = {
  id: string;
  name: string;
  area: string;
  area_name: string;
};

export type Stance = "strong" | "rec" | "reference" | "joke" | "critique" | "other";

export type HNStats = {
  mentions: number;
  recommenders: number;
  stances: Partial<Record<Stance, number>>;
  rec_months: number;
  strong: number;
  first: string; // year
  last: string; // year
  last_rec: string; // YYYY-MM
};

export type Video = {
  vid: string;
  title: string;
  channel: string;
  summary: string;
  why_hn: string;
  content_type: string;
  level: string;
  shelf_life: string;
  primary_topic: string;
  tags: string[];
  categories: Category[];
  quote?: { text: string; id: number; year: string } | null;
  hn: HNStats;
  score: number;
  whys: string[];
  hn_related: [string, number][];
  similar?: string[]; // nearest neighbours by embedding
  aliases?: string[]; // other uploads of the same video, merged into this one
  // Optional YouTube Data API fields (only present if a key was used)
  duration_s?: number;
  views?: number;
  published?: string;
};

export type FeedItem = Video & { reason: string; source: string };

export type Mention = {
  id: number;
  vid: string;
  author: string;
  month: string; // YYYY-MM
  kind: "comment" | "story";
  story_id: number;
  story_title: string;
  stance: Stance;
  why: string;
  quote: string;
  text: string;
};

export type Topic = { id: string; name: string; description: string; count: number };
export type Area = { id: string; name: string; topics: Topic[]; count: number };

export type Playlist = {
  id: string;
  name: string;
  description: string;
  vids: string[];
};
