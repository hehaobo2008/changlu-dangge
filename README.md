# 山河织路 · 回家吃饭

从田埂到星河，都记着回家吃饭。外婆、妈妈和宁宁的五件旧物，记录了一家三代的归途。

[剧情与互动稿](docs/回家吃饭-剧情与互动稿.md)　·　[评审逐项记录](docs/本轮评审与实机复核.md)

## 五幕与操作

| 年份 | 地点 | 旧物与动作 | 回家的时间 |
| --- | --- | --- | --- |
| 1983 | 田埂与供销社 | 掀盖，取出碗底的字条 | 田埂一刻钟 |
| 1996 | 东街 | 撕下晚场票副券 | 骑车一小时 |
| 2008 | 长路里站 | 给开往江城的粉票剪口 | 绿皮车一整夜 |
| 2023 | 山河大桥 | 刷证，把报销凭证夹进册子 | 过江四十分钟 |
| 2049 | 星河港育苗温室 | 扫描月面广寒站登船牌 | 三天航程 |

开场从黑底背景文字进入一本布面书，翻开后的田埂画面放大至全屏，随即可以漫游。滚轮、上滑或方向键进退。点亮的圆点和工具栏“细节”都能看沿途的小事。拖动票上的物件、轻点票面或按 R 完成动作。F 在路上查看细节，M 切换声音，Esc 返回。说明面板可切换漫游速度和重玩时跳过已读。跨岛时双击或长滑可快速抵达。

票夹的年代栏支持回看和回到现场。前四幕留住的句子会汇成家书。登船时可写 24 字，尾声在地球上空展示笔迹，沿途票根收下五张旧物。本机保存已读、选句、留言和偏好。首次默认静音，减少动态模式有静态开场与直接到达尾声的入口。

## 构建与复核

使用 Node.js 20+、Python 3 和支持 WebGL 2 的 Chromium。项目支持普通网页、子目录部署以及无需网络的单文件版本。

```sh
npm ci
npm run build
npm run serve
```

浏览器打开 `http://127.0.0.1:8137` 即可漫游。也可以直接打开构建生成的 `dist/山河织路-离线单文件.html`。运行 `npm test` 可复查交互流程。

美术逐幕检查使用桌面和触屏视窗。运行 `npm run audit:family` 后，画面与交互检查记录分别位于 `qa/world-light/family-review/check.json` 和 `qa/family/checks.json`。自动降档根据持续慢帧降低分辨率、跳过远处部分植被并关闭泛光与雨灯空气效果。

当前处于本地测试阶段。给浏览器测试的网页和可直接双击的离线版都在 `dist/`。运行 `npm run audit:family` 复查五个动作、十处细节以及桌面和触屏画面。运行 `npm run audit:scenery` 更新 `qa/scenery-study/current/` 的固定机位和本地图库 `qa/scenery-study/index.html`。再次运行会覆盖对应截图。

## 可编辑资产

| 路径 | 用途 |
| --- | --- |
| `assets/zones/`、`assets/vehicles/` | 五座岛与七种载具的 Blender 源件及实时 GLB |
| `assets/sources/painted/`、`assets/painted/` | 场景绘景、独立透明人物插画与材质 |
| `assets/sources/lettering/`、`assets/sources/scene-print/` | 招牌字体原件与许可、影院海报与夜窗画稿 |
| `assets/sources/guishangqingfeng/` | 《轨上清风》的三种列车原模型及校验清单 |
| `src/family_scenes.js`、`src/painted_scenes.js`、`src/illustration.js` | 分层搭景、人物、温室、植物与分阶着色 |
| `assets/raw/` | 十二件主模型未经网页压缩的 GLB |
| `assets/materials/polyhaven/`、`assets/vegetation/` | 第一幕材质、早期地被源件、许可与清单 |
| `tools/model_craft.py`、`tools/rural_craft.py`、`tools/era_fixtures.py`、`tools/rolling_stock.py` | 稻穗和篾编、钢木构件、报亭、列车及发射场细部 |
| `src/main.js`、`src/surface.js`、`src/water.js`、`src/paper.js` | 章节路线、票页与发射、材质细节、雨夜反射、水和纸感后期 |
| `production/score.wav` | 演示配乐源文件 |

重建使用 Blender 4.2、Python（含 Pillow）与 Node.js。先运行 `python tools/make_craft_atlas.py` 生成稻穗、树叶和四种场内标牌。下表为 Blender 的 Python 脚本及其参数。

| 源件 | Blender 脚本及参数 |
| --- | --- |
| 田埂晨、农用板车 | `tools/build_rural_realism.py`、`tools/build_rickshaw_realism.py` |
| 街市暮、轿车 | `tools/build_town.py`、`tools/build_town.py -- car` |
| 城夜雨 | `tools/build_city.py` |
| 山河速 | `tools/build_rail.py -- rail` |
| 绿皮车、和谐号、复兴号 | `tools/adapt_train_collection.py` |
| 星河远、火箭 | `tools/build_future.py -- --only zone`、`tools/build_future.py -- --only rocket` |
| 星港环线列车 | `tools/build_future_metro.py`；独立五节车厢，由 `src/future_metro.js` 沿环线运行 |

例如，使用本机 Blender 从已保存的原始绘景和列车源件重建网页。

```powershell
& 'D:/Blender/blender-4.2.9-windows-x64/blender.exe' -b --factory-startup --python tools/adapt_train_collection.py
python tools/prepare_painted_plates.py
node tools/pack_models.mjs green_train hsr harmony
npm run build
```

网页压缩脚本可接收一个或多个资产名，省略参数会处理全套十二个模型。在 Blender 中手工修改第一幕或农用板车后，可用 `tools/export_rural_assets.py` 从对应的已保存源件合批导出，再运行压缩和网页构建。
