"""Contact sheets of the six elements' four-hit combo and E / R / Q skills on the Home training lawn.

Runs in an isolated headless browser with pointer lock disabled. The slime casts through the real
`combat.attack` / `castSkill` paths; the two VFX systems are stepped to an exact effect age and then
held, so every cell shows a known moment instead of whatever frame the screenshot happened to catch.
"""
import argparse
import importlib.util
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa/evidence"
spec = importlib.util.spec_from_file_location("qa_home_orchard", ROOT / "scripts/qa-home-orchard.py")
home = importlib.util.module_from_spec(spec)
spec.loader.exec_module(home)

ELEMENTS = ["water", "wind", "fire", "volt", "dark", "rock"]
LABELS = ["水", "风", "火", "雷", "暗", "物"]
# On the paved park path beside the training lawn, facing along it: ground decals are not hidden by grass.
STAND = [4.6, 51.5]
FACING = [0.371, -0.928]
# The three training dummies are moved in front of the cast spot: (metres ahead, metres to the right).
DUMMIES = [[4.0, 0.0], [5.2, 1.8], [5.6, -1.6]]
SWING_AGES = [0.13, 0.30]
# Effect ages in seconds: build-up, the moment of impact, and the aftermath.
SKILL_AGES = {
    "water": {"E": [0.10, 0.34, 0.70], "R": [0.12, 0.30, 0.55], "Q": [0.25, 0.60, 1.00]},
    "wind": {"E": [0.06, 0.20, 0.40], "R": [0.20, 0.70, 1.20], "Q": [0.25, 0.60, 1.00]},
    "fire": {"E": [0.10, 0.30, 0.60], "R": [0.15, 0.40, 0.75], "Q": [0.20, 0.60, 1.20]},
    "volt": {"E": [0.05, 0.15, 0.30], "R": [0.05, 0.15, 0.30], "Q": [0.20, 0.70, 1.30]},
    "dark": {"E": [0.15, 0.42, 0.70], "R": [0.30, 1.50, 3.20], "Q": [0.35, 0.85, 1.20]},
    "rock": {"E": [0.08, 0.22, 0.50], "R": [0.20, 0.50, 0.90], "Q": [0.30, 0.50, 0.90]},
}
# Camera eye and look-at as (right, up, ahead) of the cast spot.
VIEW_NEAR = ([2.7, 1.7, -1.7], [0.0, 0.55, 2.3])
VIEW_WIDE = ([5.0, 3.6, -4.2], [0.0, 0.7, 2.6])
WIDE = {("water", "Q"), ("wind", "Q"), ("fire", "Q"), ("volt", "Q"), ("dark", "Q"), ("rock", "R"), ("rock", "Q"),
        ("dark", "R"), ("wind", "R"), ("fire", "R"), ("volt", "R"), ("water", "R"), ("volt", "E"), ("dark", "E")}

SETUP = """([[x,z],[dx,dz],dummies])=>{
  __game.ui.showHud(false); __game.life.show(false); __homeCalib.setInstantExposure(true);
  const s=document.createElement('style'); s.textContent='body>div:not(:has(canvas)){visibility:hidden!important}';
  document.head.append(s);
  const fx=window.qaFx={clock:0,stopAt:Infinity,held:false,step:0,home:[x,z],dir:[dx,dz],view:null};
  const at=(up,right,ahead)=>{const px=x+dx*ahead-dz*right,pz=z+dz*ahead+dx*right;return [px,(__slime.world.terrain(px,pz)??0)+up,pz]};
  fx.at=at;
  dummies.forEach(([ahead,right],i)=>{const p=at(0,right,ahead);
    __slime.combat.targets[i].position=p; __slime.targetMeshes[i]?.position.fromArray(p);});
  const slash=__slime.slashVfx, skill=__slime.skillVfx;
  const slashUpdate=slash.update.bind(slash), skillUpdate=skill.update.bind(skill);
  // The character steps the slash system first and the skill system second, with the same dt.
  slash.update=(dt,...rest)=>{ if(fx.held){fx.step=0;return;}
    fx.step=Math.max(0,Math.min(dt,fx.stopAt-fx.clock)); fx.clock+=fx.step; slashUpdate(fx.step,...rest); };
  skill.update=(dt,...rest)=>{ if(fx.held)return; skillUpdate(fx.step,...rest); if(fx.clock>=fx.stopAt-1e-6)fx.held=true; };
  __app.ctx.onUpdate(()=>{ if(!fx.view)return;
    __app.camera.position.fromArray(fx.view[0]); __app.camera.lookAt(...fx.view[1]); __app.camera.updateMatrixWorld(); });
}"""

PLACE = """([eye,target])=>{
  const fx=window.qaFx, [x,z]=fx.home, [dx,dz]=fx.dir, y=__slime.world.terrain(x,z)??0;
  __slime.slashVfx.reset(); __slime.skillVfx.reset(); __slime.skills.reset();
  __slime.teleport([x,y+.03,z]); __slime.forward=[dx,0,dz]; __slime.yaw=Math.atan2(-dx,-dz); __slime.velocity=[0,0,0];
  for(const t of __slime.combat.targets){t.health=t.maxHealth;t.aura=null;}
  fx.view=[fx.at(eye[1],eye[0],eye[2]),fx.at(target[1],target[0],target[2])];
  fx.held=false; fx.clock=0; fx.stopAt=Infinity;
}"""

CAST = """([el,kind,arg])=>{
  const fx=window.qaFx;
  __slime.setElement(el,true); __slime.skills.reset();
  fx.clock=0; fx.held=false;
  if(kind==='swing'){ const c=__slime.combat; c.active=false; c.idle=0; c.element=el; c.index=arg-1; c.attack(el,[fx.dir[0],0,fx.dir[1]]); return true; }
  return !!__slime.castSkill(arg);
}"""

FRAMES = "n=>new Promise(r=>{function next(){if(--n<=0)r();else requestAnimationFrame(next)}requestAnimationFrame(next)})"


def hold_at(page, age):
    page.evaluate("t=>{qaFx.stopAt=t;qaFx.held=false}", age)
    page.wait_for_function("qaFx.held", timeout=60000)
    page.evaluate(FRAMES, 2)


def grab(page, path):
    page.screenshot(path=path, type="jpeg", quality=88, animations="disabled", timeout=90000)


def guide(page, errors):
    """F1 help: the combat chapter opens, lists the renamed skills and closes back to play, in landscape and portrait."""
    for size, name in [((960, 600), "landscape"), ((390, 844), "portrait")]:
        page.set_viewport_size({"width": size[0], "height": size[1]})
        page.keyboard.press("F1")
        page.wait_for_function("__game.state==='guide'")
        page.locator('[data-guide-sec="combat"]').click()
        for skill in ["水牢泡", "岚刃回旋", "熔火喷发", "万钧雷狱", "千裂", "陨岳"]:
            line = page.locator("article.g-card li").filter(has_text=skill).first
            line.scroll_into_view_if_needed()
            assert line.is_visible(), (name, skill)
        width = page.locator(".g-main").evaluate("el=>el.getBoundingClientRect().width")
        assert width <= size[0], (name, width)
        page.locator("article.g-card h4").filter(has_text="暗 · 蚀界咒术师").scroll_into_view_if_needed()
        grab(page, OUT / f"element-combat-help-{name}.jpg")
        page.keyboard.press("F1")
        page.wait_for_function("__game.state==='play'")
    page.set_viewport_size({"width": 960, "height": 600})


def sheet(cells, columns, path, title):
    font = ImageFont.truetype("msyh.ttc", 20)
    w, h, pad = 640, 400, 30
    rows = (len(cells) + columns - 1) // columns
    out = Image.new("RGB", (w * columns, (h + pad) * rows + 36), "#14171c")
    draw = ImageDraw.Draw(out)
    draw.text((12, 6), title, font=font, fill="#f1ead8")
    for i, (label, file) in enumerate(cells):
        x, y = (i % columns) * w, 36 + (i // columns) * (h + pad)
        with Image.open(file) as source:
            out.paste(source.resize((w, h), Image.Resampling.LANCZOS), (x, y))
        draw.text((x + 10, y + h + 3), label, font=font, fill="#cfd6dc")
    out.save(path, quality=88)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", type=Path, default=ROOT / "dist")
    parser.add_argument("--only", choices=ELEMENTS, nargs="*", default=ELEMENTS)
    parser.add_argument("--minute", type=int, default=810, help="home clock minute, 810 = early afternoon")
    parser.add_argument("--tag", default="")
    parser.add_argument("--guide", action="store_true", help="also check the F1 combat help")
    args = parser.parse_args()
    OUT.mkdir(exist_ok=True, parents=True)
    tmp = ROOT / "qa/shots/element-combat"
    tmp.mkdir(exist_ok=True, parents=True)
    errors = []
    report = {"errors": errors}
    with home.sync_playwright() as pw, home.serve(args.dir.resolve()) as base:
        browser = pw.chromium.launch(channel="chrome", headless=True,
            args=["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"])
        page = home.new_home(browser, base, errors=errors)
        # A fresh save opens the starter-companion picker, which locks input until it is answered.
        later = page.locator("dialog.companion-book[open] button", has_text="暂时")
        if later.count():
            later.first.click()
        page.wait_for_function("!__slime.inputLock")
        if args.guide:
            guide(page, errors)
            print("guide checked", flush=True)
        page.evaluate(SETUP, [STAND, FACING, DUMMIES])
        if args.minute != 810:
            page.evaluate("m=>__homeCalib.setView([0,9,0],[1,9,0],m,'clear')", args.minute)
        for name in args.only:
            el = ELEMENTS.index(name)
            cells = []
            for age in SWING_AGES:
                for combo in range(4):
                    page.evaluate(PLACE, VIEW_NEAR)
                    page.wait_for_function("__slime.grounded")
                    assert page.evaluate(CAST, [el, "swing", combo])
                    hold_at(page, age)
                    file = tmp / f"{name}-swing{combo}-{age}.jpg"
                    grab(page, file)
                    cells.append((f"{LABELS[el]} 普攻第 {combo + 1} 段 · {age:.2f}s", file))
            sheet(cells, 4, OUT / f"element-combat{args.tag}-{name}-attack.jpg", f"{LABELS[el]}属性 · 四段普攻")
            cells = []
            for slot in "ERQ":
                for age in SKILL_AGES[name][slot]:
                    page.evaluate(PLACE, VIEW_WIDE if (name, slot) in WIDE else VIEW_NEAR)
                    page.wait_for_function("__slime.grounded")
                    assert page.evaluate(CAST, [el, "skill", slot]), (name, slot)
                    hold_at(page, age)
                    file = tmp / f"{name}-{slot}-{age}.jpg"
                    grab(page, file)
                    cells.append((f"{LABELS[el]} {slot} · {age:.2f}s", file))
            sheet(cells, 3, OUT / f"element-combat{args.tag}-{name}-skills.jpg", f"{LABELS[el]}属性 · E / R / Q")
            print(name, "captured", flush=True)
        report["programs"] = page.evaluate("(__app.renderer.info.programs??[]).length")
        bad = page.evaluate("(__app.renderer.info.programs??[]).filter(p=>p.diagnostics?.runnable===false).map(p=>p.name)")
        report["failedPrograms"] = bad
        (OUT / f"element-combat{args.tag}-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        page.close()
        browser.close()
    assert not bad, bad
    assert not errors, errors


if __name__ == "__main__":
    main()
