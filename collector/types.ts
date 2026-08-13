export type DiscoveredVideo = {
  douyinVideoId: string | null;
  videoUrl: string;
  title: string | null;
  publishedAt: string | null;
};

export type VisibleMetrics = {
  like: { raw: string | null; value: number | null };
  collect: { raw: string | null; value: number | null };
  comment: { raw: string | null; value: number | null };
  share: { raw: string | null; value: number | null };
  qualityFlags: string[];
};

export type AccountRow = {
  id: number;
  nickname: string;
  profile_url: string;
};

export type VideoRow = {
  id: number;
  video_url: string;
  title: string | null;
  published_at: string | null;
};
