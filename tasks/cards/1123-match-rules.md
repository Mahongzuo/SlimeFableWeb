---
agent: codex
files: src/templates/mode-match.ts, tests/mode-match.test.ts, src/level/mode-match.ts, src/level/mode-match.css, src/level/match-effects.ts, src/level/match-pointer.ts, scripts/qa-match-drag.py, qa/evidence/match-touch.jpg, docs/session/active.md, docs/progress.md, tasks/reports/1123-match-rules.md, content/daily-modes.ts, docs/level-catalog.json
checks: check,test,build
---
# 三消特效和拖动
按项目分工派发棋盘规则、指针手势、棋盘表现三项；Codex 核实资料，实测桌面与触屏模式、三故事通关，整合发布。沿用 1123-mode-revision 的三日事实卡。
普通三连；四连按主动交换方向（自然掉落按线向）生成横/竖特效；L/T/交叉多线相连生成爆炸；直线五连及以上生成虹彩。横/竖/爆炸与普通棋需实际连色；相邻双特效可直接交换，虹彩可选色。实现组合连锁，目标/洞格保护，保留原三故事及零钱横移。双线十字、线爆沿线方向加宽四排、双爆大范围、虹彩加特效同色转特效触发、双虹全盘。资料与本作范围调校分别记录。
手势在按下时捕获主指针，棋子跟手，水平或垂直相邻交换，保留两次轻点，回弹/取消无扣步；独立无头鼠标和触摸均验收。
