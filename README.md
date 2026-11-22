# 山河织路 · 一穗千里

一粒稻种从田埂走到星河，四代人把山河织成了路。翻开书封，沿山河村、县城东街、长路里站、山河大桥走到星河港。五幕均可听沿途对白、遇见并操作时代旧物，结尾从地球回望收卷入书。

[完整剧情与互动稿（含五幕对白）](docs/一穗千里-剧情与互动稿.md)　·　[前版评审记录](docs/本轮评审与实机复核.md)

## 五幕与操作

| 年份 | 地点 | 旧物与动作 | 路程 |
| --- | --- | --- | --- |
| 1983 | 田埂与供销社 | 展开晚稻留种便笺的折角 | 步行半日 |
| 1996 | 东街 | 撕下晚场票副券 | 车行一程 |
| 2008 | 长路里站 | 给开往江城的粉票剪口 | 绿皮车一整夜 |
| 2023 | 山河大桥 | 刷证，把报销凭证夹进册子 | 过江四十分钟 |
| 2049 | 星河港育苗温室 | 扫描月面广寒站登船牌 | 三天航程 |

加载时，书法标题随资源进度点亮，衬以星空山海柔雾背景。轻点书封或按回车翻书，左页为四代人物导览、右页为总背景介绍；再以弧形拟真翻页翻至第一幕，书页实景会放大进入漫游。滚轮、滑动或方向键控制进退。R 翻看旧物，M 切换声音，Esc 返回。沿途对白随行播放并带同步字幕（漫游与书中统一为同一套对白）。手机的展卷、全屏与说明收在“更多”里。

书内收录五幕场景、纸上旧物、背景故事与本幕对白配音。点击左页画面可以进入该幕。小满登船前可留下 24 字，火箭升空后，继续滑动即可从地球五页连翻回卷入书；终章收录「五件旧物 · 五句留字」与登船留言。本机保存阅读记录、留言和声音偏好。

## 构建与复核

使用 Node.js 20+、Python 3 和支持 WebGL 2 的 Chromium。项目支持普通网页、子目录部署以及无需网络的单文件版本。

```sh
npm ci
npm run build
npm run serve
```

浏览器打开 `http://127.0.0.1:8137` 即可漫游。也可以直接打开构建生成的 `dist/山河织路-离线单文件.html`。运行 `npm test` 可复查交互流程，运行 `npm run test:folio` 可复核五幕与图鉴并生成桌面和手机截图。

美术逐幕检查使用桌面和触屏视窗。运行 `npm run audit:family` 后，画面与交互检查记录分别位于 `qa/world-light/family-review/check.json` 和 `qa/family/checks.json`。自动降档根据持续慢帧降低分辨率、跳过远处部分植被并关闭泛光与雨灯空气效果。

当前处于本地测试阶段。给浏览器测试的网页和可直接双击的离线版都在 `dist/`。运行 `npm run audit:family` 复查五个动作、十处细节以及桌面和触屏画面。运行 `npm run audit:scenery` 更新 `qa/scenery-study/current/` 的固定机位和本地图库 `qa/scenery-study/index.html`。再次运行会覆盖对应截图。

更新五幕文案后，运行 `node tools/family_materials.mjs` 即可从作品中的剧情、对白和旧物资料重新生成完整剧情稿，以及展板、设计说明和交互流程的排版文件。

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
