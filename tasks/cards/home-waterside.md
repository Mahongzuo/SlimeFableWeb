# 家园水岸、光照与结构修整

## 可改文件

本卡，src/home/{water-waves,water-fish,sea-fx,garden-stage,climate-material,frontier,build-catalog,garden-regions,builder}.ts，src/zones/{kit,lake-water}.ts，src/world/linqi/prop-structures.ts，src/game/{game,graphics}.ts，src/life/{catalog,state,requests}.ts，src/ui/life-ui.ts，tests/home-waterside.test.ts，docs/session/active.md，qa/evidence/home-waterside-*。

为承担细化结构后的逐粒子查询，授权 src/world/home-world.ts、src/slime/{world,character,sim.worker}.ts 维护家园碰撞空间索引；src/home/jiangnan.ts 可登记书埠原生树。

## 验收

核对公园、镜湖、农田与林地共用树木的连接、坡地栏杆和开放建筑的实际门洞、台面与柱子。以模型尺度和旋转验证碰撞。在同机位对比晴景与天气变化。镜湖和河流保持倒影，入水冲击随落速变化，游鱼接触首次写图鉴。运行检查、测试、构建，在独立无头浏览器拍摄常规、近地和远景。
