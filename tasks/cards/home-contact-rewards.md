# 家园接触效果与每日探索

第一阶段修角色水面反射、描边遮挡、雨落地反馈、水风配色、火焰粒子与即时接地电弧和攀墙留痕。第二阶段接入北京时间每日碎片、通关奖励与天气时间面板。玩家只使用钟型。

## 可改文件

- src/level/stage.ts，src/zones/lake-water.ts，src/home/garden-stage.ts，src/home/rain-contact.ts，src/home/climate.ts
- src/slime/character.ts，src/slime/render.ts，src/slime/wet-film.ts，src/slime/wall-film.ts，src/slime/contact-fx.ts，src/slime/elements.ts
- src/game/game.ts，src/game/save.ts，src/game/home-rewards.ts，src/home/props.ts，src/life/state.ts
- src/ui/game-ui.ts，src/ui/guide-catalog.ts，tests/home-feedback.test.ts、tests/core.test.ts（将已失效的火色水膜断言替换为玩家指定的火焰粒子和接地电弧）
- 本卡、docs/progress.md、docs/session/active.md、qa/evidence/home-feedback-*。

## 验收

检查元素接触特效、同机位角色倒影和房屋遮挡。验证 8 键调整时间及天气，旧角色存档兼容。每天每门首次胜利及每枚碎片支付一次，扩建可参与刷新。独立无头浏览器截图，运行 check、test 和 build。视觉定稿由玩家试玩。

玩家补充定稿：火与雷跳过地面和墙面留痕；火焰粒子从脚边升起，接地电弧只在角色接触地面时存在。
