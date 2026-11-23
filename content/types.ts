/** One chapter = one year behind one time portal. Facts come only from the project's reviewed historical records. */
export type ChapterStatus = 'web' | 'ue' | 'design';
export type Template = 'explore-quest' | 'runner' | 'grid-push' | 'ascent' | 'herding' | 'sort-rush' | 'arena' | 'escort' | 'light-up' | 'lander' | 'flyby' | 'landmark' | 'almanac' | 'solstice' | 'folio' | 'atlas' | 'ability';
export interface ChapterMeta {
  id: string; day: string; year: number;
  event: string; quest: string; steps: string[]; souvenir: string;
  template: Template; era: string; tone: 'bright' | 'solemn'; status: ChapterStatus;
  palette: [string, string];
}
export interface DayMeta { day: string; theme: string; chapters: ChapterMeta[] }
export const templateNames: Record<Template, string> = {
  ability:'元素工坊', atlas:'历史航道',
  almanac:'时光剧场', solstice: '冬至奇境', folio: '秋夜长卷',
  'explore-quest': '探索任务', landmark: '地标攀爬', runner: '横版跑酷', 'grid-push': '推轨解谜', ascent: '竖版上升',
  herding: '赶群', 'sort-rush': '限时分拣', arena: '波次战斗', escort: '护送开闸', 'light-up': '点灯谜题', lander: '低重力着陆', flyby: '引力弹弓',
};
export const statusNames: Record<ChapterStatus, string> = { web: '可以出发', ue: 'UE 版已做 · Web 制作中', design: '设计完成 · 制作中' };
