import type {LevelSpec, Objective} from '../../content/levels/types';
/**
 * One chapter's quest, as in the UE QuestSystem: one main quest made of ordered branches (only the current branch
 * counts), plus an optional side quest that never blocks completion. Counts are per target id, each counted once.
 */
export interface QuestView {title: string; branch: string; count: number; total: number; side?: {title: string; done: boolean}; complete: boolean; index: number; branches: number}
export class QuestRunner {
  private index = 0; private done = new Set<string>(); private sideDone = false; onChange?: (v: QuestView, event: 'progress' | 'branch' | 'complete' | 'side') => void;
  constructor(readonly spec: LevelSpec) {}
  get branch(): Objective | null { return this.spec.quest.main.branches[this.index] ?? null; }
  get complete() { return this.index >= this.spec.quest.main.branches.length; }
  /** Is this target wanted right now (main branch or side quest)? */
  wants(id: string) { return (!!this.branch?.targets.includes(id) && !this.done.has(id)) || (!this.sideDone && !!this.spec.quest.side?.objective.targets.includes(id)); }
  /** Was this target already handled in the current or an earlier branch? */
  handled(id: string) { const all = this.spec.quest.main.branches.slice(0, this.index).flatMap(b => b.targets); return all.includes(id) || this.done.has(id); }
  hit(id: string): boolean {
    const side = this.spec.quest.side;
    if (side && !this.sideDone && side.objective.targets.includes(id)) { this.sideDone = side.objective.targets.every(t => t === id || this.done.has(t)); this.done.add(id); if (this.sideDone) this.onChange?.(this.view(), 'side'); return true; }
    const b = this.branch; if (!b || !b.targets.includes(id) || this.done.has(id)) return false;
    this.done.add(id);
    if (b.targets.every(t => this.done.has(t))) { this.index++; this.done = new Set([...this.done].filter(t => side?.objective.targets.includes(t))); this.onChange?.(this.view(), this.complete ? 'complete' : 'branch'); }
    else this.onChange?.(this.view(), 'progress');
    return true;
  }
  view(): QuestView {
    const b = this.branch, side = this.spec.quest.side;
    return {title: this.spec.quest.main.title, branch: b?.label ?? '完成', count: b ? b.targets.filter(t => this.done.has(t)).length : 0, total: b?.targets.length ?? 0,
      side: side ? {title: side.title, done: this.sideDone} : undefined, complete: this.complete, index: this.index, branches: this.spec.quest.main.branches.length};
  }
  get sideComplete() { return this.sideDone; }
}
