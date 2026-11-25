# 史莱姆伞形滑翔

二段跳后沿用现有空格开合和滑翔速度。将本体及具备滑翔行为的分身的流体表面变为伞形，沿用当前元素材质、脸、受光与投影。清理外加伞模型，更新操作提示。

## 可改文件

本卡，src/slime/umbrella.ts、character.ts、solver.ts、types.ts、surface.ts、render.ts，src/ui/guide-catalog.ts、game-ui.ts，tests/slime-ue-feel.test.ts，docs/progress.md、docs/session/active.md，qa/evidence/slime-glide-*。

## 玩家补充 · 全套表情

可改文件增加 src/slime/face.ts、tests/slime-face.test.ts 与 qa/evidence/slime-face-*。所有角色表情共用眼睛、嘴和脸颊的连续参数；区分起跳与滑翔，保留战斗、生活互动和表情优先级。检查六属性以及钓鱼惊喜的实际调用。

## 验收

比较收拢、展开、复原的实际流体网格与三角形，检查低高画质。后台浏览器通过真实空格输入验证开合和空中换属性，留存生产版截图。运行类型检查、全量测试及构建。
