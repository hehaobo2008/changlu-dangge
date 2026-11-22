"""Bundle the playable work and jury-facing assets; an author may add signed paperwork."""
import argparse
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--author", help="用于赛区要求的实名文件名")
parser.add_argument("--pledge", type=Path, help="已签署的正式原创承诺书")
parser.add_argument("--team", type=Path, help="团队分工说明")
args = parser.parse_args()
author = (args.author or "").strip()
if any(c in author for c in '<>:"/\\|?*') or author in (".",".."):
    parser.error("作者姓名包含文件名不支持的字符")
prefix = f"数字媒体设计_山河织路_{author}" if author else "山河织路"
out = DIST / (prefix + ".zip" if author else "山河织路-参赛材料.zip")
assets = []


def include(src, folder, label):
    src = Path(src)
    if not src.is_file():
        raise FileNotFoundError(src)
    assets.append((src, f"{folder}/{prefix}_{label}{src.suffix.lower()}"))


include(DIST / "山河织路-离线单文件.html","01_交互作品","离线交互作品")
include(DIST / "山河织路-演示片.mp4","02_演示影像","操作与实景")
screens = [
    ("cover","封面"),("opening","开场"),("overview","五幕展卷"),("front-1","电影副券"),
    ("back-2","开学夜车"),("carriage","红伞与车窗"),("route-3","江岸晚饭"),("detail-4","星港温室"),
    ("back-4","登船留言"),("earth","回望地球"),("record","沿途票根"),
    ("phone-route","手机漫游"),("phone-book","手机票夹"),
]
for file, label in screens:
    include(ROOT/"qa"/"family"/(file+".jpg"),"03_高保真界面",label)
for frame, label in (("wide-4-751","夕照会车"),("launch-0","星河号登船层"),("launch-2.85","离台与排烟")):
    include(ROOT/"qa"/"world-light"/"family-review"/(frame+".jpg"),"03_高保真界面",label)
review=ROOT/"qa"/"scenery-study"/"五幕局部对照.jpg"
if review.is_file():
    include(review,"03_高保真界面","五幕局部复核")
cast_review = ROOT / "qa" / "scenery-study" / "人物近景.jpg"
if cast_review.is_file():
    include(cast_review, "03_高保真界面", "人物实景")
for i, label in enumerate(("作品概念","五幕实景","交互流程","美术工艺","尾声"),1):
    include(ROOT/"docs"/"boards"/f"board_0{i}.png","04_设计展板",f"0{i}_{label}")
for label in ("交互流程图","设计说明"):
    include(ROOT/"docs"/(label+".pdf"),"05_作品说明",label)
include(ROOT/"assets"/"sources"/"作品素材说明.md","05_作品说明","作品素材说明")
for project, license_file in (("three","LICENSE"),("meshoptimizer","LICENSE.md")):
    src = ROOT/"node_modules"/project/license_file
    assets.append((src, f"05_作品说明/软件许可/{project}.txt"))
for font in ("mashanzheng","zcoolqingkehuangyou"):
    assets.append((ROOT/"assets"/"sources"/"lettering"/(font+"-OFL.txt"),f"05_作品说明/字体许可/{font}-OFL.txt"))
assets.append((ROOT/"assets"/"sources"/"lettering"/"sources.json","05_作品说明/字体许可/字体版本与来源.json"))
assets.append((ROOT/"assets"/"sources"/"quaternius-stylized-nature"/"License_Standard.txt","05_作品说明/模型许可/Quaternius_树木_CC0.txt"))
for name in ("EARTH-CREDIT.txt","CLOUDS-CREDIT.txt"):
    assets.append((ROOT/"assets"/"earth"/name,"05_作品说明/地球与云层出处/"+name))
if args.pledge:
    include(args.pledge,"06_作者材料","原创承诺书")
if args.team:
    include(args.team,"06_作者材料","团队分工")

guide = """山河织路　｜　实时三维互动长卷

解压后，用支持 WebGL 2 的桌面浏览器打开“01_交互作品”里的 HTML。首次打开为静音，点击声音按钮可以开启。手机浏览器可从部署后的网页进入。作品支持桌面键鼠、触屏竖屏与横屏。

外婆把秋天的稻种留给女儿。六十多年后，宁宁带着同一脉稻种登上星河号。五件纸上旧物记下一家三代回家吃饭的路。

点击“展开长卷”进入。轻滑、滚轮或方向键前行。在灶边掀盖取字条，在影院撕副券，在车站剪票、刷证，在星港扫码登船。点击或按 R 也可完成。每幕有两处细节。说明页提供三档速度和跳过已读。可以在票夹选年代、回到对应场景。登船留言会写在地球上空的字条上，留住的句子会在沿途票根汇合。

影片共 102 秒，含操作提示、五幕实景与尾声。高保真界面为运行实录 JPG，展板为五张 2400 × 1500 PNG。设备、视觉规范、制作流程与素材说明见“05_作品说明”。

五幕采用手绘动画风格的三维场景。绘景使用图像生成工具辅助制作，三种列车模型沿用作者提供的《轨上清风》项目，第二至五幕选用 Quaternius 的 CC0 树模，乡村底模保留 Poly Haven 的 CC0 基础材质。制作归属详见作品素材说明。
"""
with NamedTemporaryFile(dir=DIST, prefix=".submission-", suffix=".zip", delete=False) as temp:
    pending = Path(temp.name)
try:
    with ZipFile(pending,"w",compression=ZIP_DEFLATED,compresslevel=6) as bundle:
        bundle.writestr(prefix+"_观看与操作.txt",guide)
        for src, archive_name in assets:
            method = ZIP_DEFLATED if src.suffix.lower() in (".html",".txt",".md") else ZIP_STORED
            bundle.write(src,archive_name,compress_type=method)
    with ZipFile(pending) as bundle:
        broken = bundle.testzip()
        if broken:
            raise ValueError(f"ZIP checksum failed for {broken}")
        count = len(bundle.namelist())
    pending.replace(out)
    print(f"{out.name} · {count} files · {out.stat().st_size:,} bytes")
finally:
    pending.unlink(missing_ok=True)
