# 一月四门制作与验收卡

Codex 统筹。先完成 124 张逐关设计卡、总表、史料和模型索引，再进入三个代表日制作。代表日仅开放 0101、0114、0131；其余日期待玩家评审后分批制作。代表日十二项史实与构图以本会话用户批准的方案为事实卡，其余选题由 Codex 核实原始来源后写入设计卡。每关标出史实与演绎、动线草图、年代细节、首次操作、二选一、结尾、模型、收藏和两项复玩。

## 可改文件

- 任务与设计：本卡、docs/days/january-four-gates.md、docs/days/january-gates/*.md、tasks/reports/january-four-gates.md。
- 三门工作包：docs/days/january-gates/defense.md、src/{level,templates,themes}/january-defense.ts、src/level/january-defense.css、tests/january-defense.test.ts、scripts/qa-january-defense.py、qa/evidence/january-defense-*。
- 四门工作包：docs/days/january-gates/match.md、src/{level,templates,themes}/january-match.ts、src/{level,templates}/mode-match.ts、src/level/mode-match.css、src/themes/match-objects.ts、tests/january-match.test.ts、scripts/qa-january-match.py、qa/evidence/january-match-*。
- 五门工作包：docs/days/january-gates/skirmish.md、src/{level,templates,themes}/january-skirmish.ts、src/level/january-skirmish.css、tests/january-skirmish.test.ts、scripts/qa-january-skirmish.py、qa/evidence/january-skirmish-*。
- 六门与共享接入：docs/days/january-gates/rpg.md、content/january-pilots.ts、content/daily-modes.ts、src/{level,templates,themes}/january-rpg.ts、src/templates/january-layout.ts、src/level/january-rpg.css、src/level/main.ts、src/level/mode-session.ts、src/game/mode-gates.ts、src/ui/guide-catalog.ts、scripts/level-catalog.ts、tests/{january*,mode-gates*,daily-modes*,mode-stories*,battle-history*,defense*,battle-preview*}.test.ts、scripts/qa-january*.py、qa/evidence/january-*、docs/level-catalog.json、docs/progress.md、docs/session/active.md。

## 交付

旧关回归补充工作包：只动 scripts/qa-january-legacy-field.py（四门执行者）、scripts/qa-january-legacy-fleet.py（三门执行者），证据 qa/evidence/january-legacy-*。按当前工作区既有战斗编队复测，保留原始验收历史。不得调整旧关生产逻辑。

各模式任务执行者负责逐日设计、所列来源复核和本模式的技术检查。共享注册与文档由统筹负责。所有浏览器检查后台无头运行，初始化禁用指针锁。旧入口、旧档与 62 个一月章节回归。运行内容检查、40 种子检查、check/test/build/catalog/catalog:check；保留多机位证据，以用户评审决定后续制作。
