"""Detailed skyscraper typologies and urban corner architecture for Act 3 (Blender metres)."""
import math
import random
import bpy
import blib as B
from model_craft import Batch


def footprint(x, y, width, depth, radius):
    """Legacy rounded-corner outline preserved for external imports."""
    a, b = width / 2, depth / 2
    r = min(radius, a * .90, b * .90)
    outline = []
    for cx, cy, start in ((a - r, b - r, 0), (-a + r, b - r, 90), (-a + r, -b + r, 180), (a - r, -b + r, 270)):
        for j in range(5):
            angle = math.radians(start + 22.5 * j)
            outline.append((x + cx + r * math.cos(angle), y + cy + r * math.sin(angle)))
    return outline


def chamfer_plan(cx, cy, w, d, bevel):
    """8-vertex crisp 45-degree chamfered rectangular skyscraper plan (CCW)."""
    hx, hy = w * 0.5, d * 0.5
    c = min(bevel, hx * 0.42, hy * 0.42)
    return [
        (cx + hx, cy - hy + c),
        (cx + hx, cy + hy - c),
        (cx + hx - c, cy + hy),
        (cx - hx + c, cy + hy),
        (cx - hx, cy + hy - c),
        (cx - hx, cy - hy + c),
        (cx - hx + c, cy - hy),
        (cx + hx - c, cy - hy),
    ]


def cruciform_plan(cx, cy, w, d, notch_x, notch_y):
    """12-vertex notched-corner cruciform landmark tower plan (CCW)."""
    hx, hy = w * 0.5, d * 0.5
    nx = min(notch_x, hx * 0.34)
    ny = min(notch_y, hy * 0.34)
    return [
        (cx + hx, cy - hy + ny),
        (cx + hx, cy + hy - ny),
        (cx + hx - nx, cy + hy - ny),
        (cx + hx - nx, cy + hy),
        (cx - hx + nx, cy + hy),
        (cx - hx + nx, cy + hy - ny),
        (cx - hx, cy + hy - ny),
        (cx - hx, cy - hy + ny),
        (cx - hx + nx, cy - hy + ny),
        (cx - hx + nx, cy - hy),
        (cx + hx - nx, cy - hy),
        (cx + hx - nx, cy - hy + ny),
    ]


def inset_plan(outline, delta):
    """Uniformly inset/outset a CCW orthogonal-chamfered 2D polygon along vertex normals."""
    n = len(outline)
    pts = []
    for i in range(n):
        p0 = outline[(i - 1) % n]
        p1 = outline[i]
        p2 = outline[(i + 1) % n]
        e1x, e1y = p1[0] - p0[0], p1[1] - p0[1]
        e2x, e2y = p2[0] - p1[0], p2[1] - p1[1]
        l1 = math.hypot(e1x, e1y) or 1.0
        l2 = math.hypot(e2x, e2y) or 1.0
        n1x, n1y = e1y / l1, -e1x / l1
        n2x, n2y = e2y / l2, -e2x / l2
        bx, by = n1x + n2x, n1y + n2y
        bl = math.hypot(bx, by) or 1.0
        bx /= bl
        by /= bl
        denom = max(0.35, n1x * bx + n1y * by)
        pts.append((p1[0] + bx * (delta / denom), p1[1] + by * (delta / denom)))
    return pts


def _edge_info(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy)
    if length < 1e-4:
        return 0.0, 0.0, 0.0, (0.0, 1.0)
    return dx, dy, length, (dy / length, -dx / length)


def level(batch, outline, bottom, top, color, cap_top=True):
    rings = [[(x, y, bottom) for x, y in outline], [(x, y, top) for x, y in outline]]
    batch.rings(rings, color, False, caps=False)
    if cap_top:
        batch.panel(rings[-1], color)


def slanted_crown(batch, outline, z_base, slope_x, slope_y, lift, color, cap=False):
    cx = sum(p[0] for p in outline) / len(outline)
    cy = sum(p[1] for p in outline) / len(outline)
    span_x = max(abs(p[0] - cx) for p in outline) or 1.0
    span_y = max(abs(p[1] - cy) for p in outline) or 1.0
    bot = [(x, y, z_base) for x, y in outline]
    top = [
        (x, y, z_base + lift * max(0.20, 0.56 + 0.44 * (slope_x * (x - cx) / span_x + slope_y * (y - cy) / span_y)))
        for x, y in outline
    ]
    batch.rings([bot, top], color, False, caps=False)
    if cap:
        batch.panel(top, color)
    return top


def sloped_belt(batch, ring, offset_xy, z_drop, z_rise, color):
    """Emit a sloped glowing or metallic perimeter belt flush outside a slanted ring."""
    xy = inset_plan([(p[0], p[1]) for p in ring], -offset_xy)
    bot = [(x, y, p[2] - z_drop) for (x, y), p in zip(xy, ring)]
    top = [(x, y, p[2] + z_rise) for (x, y), p in zip(xy, ring)]
    batch.rings([bot, top], color, False, caps=False)
    return top


def prism_fin(batch, p, nx, ny, tx, ty, thick, depth, z0, z1, color):
    """4-sided outward architectural fin anchored at edge point p pointing along (nx, ny)."""
    ox, oy = p[0] + nx * depth * 0.5, p[1] + ny * depth * 0.5
    ht = thick * 0.5
    hd = depth * 0.5
    ring = [
        (ox - tx * ht - nx * hd, oy - ty * ht - ny * hd),
        (ox + tx * ht - nx * hd, oy + ty * ht - ny * hd),
        (ox + tx * ht + nx * hd, oy + ty * ht + ny * hd),
        (ox - tx * ht + nx * hd, oy - ty * ht + ny * hd),
    ]
    batch.rings([[(q[0], q[1], z0) for q in ring], [(q[0], q[1], z1) for q in ring]], color, False, caps=True)


def plan_segments(cx, cy, w, d, style, bevel=0.45):
    if style == "step":
        return cruciform_plan(cx, cy, w, d, w * 0.13, d * 0.13)
    if style == "glass":
        return chamfer_plan(cx, cy, w, d, min(w, d) * 0.19)
    return chamfer_plan(cx, cy, w, d, bevel)


def _pane_tone(style, floor, bay_idx, edge_idx, normal, run_seed):
    shade = 0.45 * normal[0] + 0.58 * normal[1] + 0.18 * math.sin((floor + edge_idx * 0.35) * 0.42)
    if style == "glass":
        cold = "#34516b" if shade > 0.32 else "#1e3247" if shade < -0.32 else "#294158"
    elif style == "step":
        cold = "#2e4860" if shade > 0.32 else "#1b2e40" if shade < -0.32 else "#243a4e"
    elif style == "grid":
        cold = "#2b4256" if shade > 0.32 else "#172736" if shade < -0.32 else "#213548"
    else:
        cold = "#30465a" if shade > 0.32 else "#1c2d3c" if shade < -0.32 else "#25394c"

    # Clustered multi-level warm office/room luminance via (R - B) gradation in facadeGlass shader.
    cluster_w = 2 if style in ("res", "grid") else 3
    grp = bay_idx // cluster_w
    h = (grp * 73856093 ^ (floor + 11) * 19349663 ^ (edge_idx + 3) * 83492791 ^ run_seed * 2654435761) & 0xFFFFFFFF
    v = (h % 1000) / 1000.0
    sub_h = ((bay_idx * 29 + floor * 17 + run_seed) % 13)
    warm_bright = "#dab072"  # strong warm focal suite (R-B ~ 0.40)
    warm_mid = "#ba956b"     # calm evening interior (R-B ~ 0.31)
    warm_soft = "#9a8677"    # subtle curtained/dim lamp (R-B ~ 0.14)
    if v < (0.14 if style == "res" else 0.11):
        if sub_h in (0, 7):
            return cold
        return warm_bright if (grp + floor) % 4 == 0 else warm_mid
    if v < (0.26 if style == "res" else 0.21):
        return warm_soft if sub_h % 3 != 0 else cold
    if (bay_idx * 17 + floor * 31 + edge_idx * 7 + run_seed) % 23 == 0:
        return warm_bright
    return cold


def _curtain_bay_panes(windows, metal, masonry, outline, z_sill, pane_h, spandrel_h, rng, style, floor, run_seed,
                       glass_offset=0.04, bay_target=1.85, mullions=True):
    """Emit crisp fine-bay glass panes and spandrel shadow bands around an outline."""
    if pane_h <= 0.25:
        return
    spandrel_col = {
        "glass": "#425568",
        "step": "#4f5866",
        "grid": "#445260",
        "res": "#5a636e",
    }[style]
    transom_col = {
        "glass": "#a2b0ba",
        "step": "#c4b6a4",
        "grid": "#7b8792",
        "res": "#8b939b",
    }[style]
    mullion_col = {
        "glass": "#a8b4be",
        "step": "#c7b8a6",
        "grid": "#808c98",
        "res": "#6e7984",
    }[style]

    n = len(outline)
    for j, a in enumerate(outline):
        b = outline[(j + 1) % n]
        dx, dy, length, normal = _edge_info(a, b)
        if length < 0.35:
            continue
        nx, ny = normal
        tx, ty = dx / length, dy / length
        bays = max(1, round(length / bay_target))
        if mullions and length >= 2.2:
            # Crisp thin horizontal transom trim along glazing top/bottom
            ox, oy = nx * (glass_offset + 0.04), ny * (glass_offset + 0.04)
            for tz in (z_sill - 0.05, z_sill + pane_h + 0.03):
                metal.panel([
                    (a[0] + ox, a[1] + oy, tz - 0.045),
                    (b[0] + ox, b[1] + oy, tz - 0.045),
                    (b[0] + ox, b[1] + oy, tz + 0.045),
                    (a[0] + ox, a[1] + oy, tz + 0.045),
                ], transom_col)

        if spandrel_h > 0.15:
            sx, sy = nx * (glass_offset + 0.025), ny * (glass_offset + 0.025)
            z_sp0 = z_sill - spandrel_h
            masonry.panel([
                (a[0] + sx, a[1] + sy, z_sp0),
                (b[0] + sx, b[1] + sy, z_sp0),
                (b[0] + sx, b[1] + sy, z_sill - 0.04),
                (a[0] + sx, a[1] + sy, z_sill - 0.04),
            ], spandrel_col)

        gap = min(0.08, 0.075 / max(0.35, length / bays))
        for k in range(bays):
            f0 = k / bays + gap
            f1 = (k + 1) / bays - gap
            if f1 <= f0:
                continue
            tone = _pane_tone(style, floor, k, j, normal, run_seed)
            gx, gy = nx * glass_offset, ny * glass_offset
            p0 = (a[0] + dx * f0 + gx, a[1] + dy * f0 + gy, z_sill)
            p1 = (a[0] + dx * f1 + gx, a[1] + dy * f1 + gy, z_sill)
            p2 = (p1[0], p1[1], z_sill + pane_h)
            p3 = (p0[0], p0[1], z_sill + pane_h)
            windows.panel([p0, p1, p2, p3], tone)
            if style == "res" and mullions and (k + floor + run_seed) % 5 == 0 and tone[1] in "123":
                # Subtle drawn shade on upper pane third for residential depth
                blind_h = z_sill + pane_h * (0.52 if (k + floor) % 2 else 0.72)
                bx, by = nx * (glass_offset + 0.02), ny * (glass_offset + 0.02)
                windows.panel([
                    (p0[0] + bx, p0[1] + by, blind_h),
                    (p1[0] + bx, p1[1] + by, blind_h),
                    (p1[0] + bx, p1[1] + by, z_sill + pane_h),
                    (p0[0] + bx, p0[1] + by, z_sill + pane_h),
                ], "#6f7782")

            if mullions and k > 0 and length / bays > 1.05:
                mx = a[0] + dx * (k / bays) + nx * (glass_offset + 0.035)
                my = a[1] + dy * (k / bays) + ny * (glass_offset + 0.035)
                hw = 0.042
                metal.panel([
                    (mx - tx * hw, my - ty * hw, z_sill),
                    (mx + tx * hw, my + ty * hw, z_sill),
                    (mx + tx * hw, my + ty * hw, z_sill + pane_h),
                    (mx - tx * hw, my - ty * hw, z_sill + pane_h),
                ], mullion_col)


def _tier_vertical_ribs(metal, outline, z0, z1, style, color):
    """Full-tier continuous external mullions & corner pilasters (low-poly, soaring vertical lines)."""
    n = len(outline)
    for j, a in enumerate(outline):
        b = outline[(j + 1) % n]
        dx, dy, length, normal = _edge_info(a, b)
        if length < 1.2:
            continue
        nx, ny = normal
        tx, ty = dx / length, dy / length
        # Corner pilasters on primary faces
        if style == "step" and length > 2.2:
            for frac in (0.04, 0.96):
                px = a[0] + dx * frac
                py = a[1] + dy * frac
                prism_fin(metal, (px, py), nx, ny, tx, ty, 0.34, 0.42, z0, z1, color)
        elif style == "glass" and length < 6.0:
            # Accent diagonal chamfer blades on crystal towers
            for frac in (0.18, 0.82):
                px = a[0] + dx * frac
                py = a[1] + dy * frac
                prism_fin(metal, (px, py), nx, ny, tx, ty, 0.16, 0.36, z0, z1, "#b4bec6")
        if length >= 5.0:
            ribs = max(2, round(length / (4.8 if style == "grid" else 3.8)))
            thick = 0.28 if style == "grid" else 0.11
            depth = 0.44 if style == "grid" else 0.18
            col = "#848e98" if style == "grid" else color
            for r in range(1, ribs):
                frac = r / ribs
                px = a[0] + dx * frac
                py = a[1] + dy * frac
                prism_fin(metal, (px, py), nx, ny, tx, ty, thick, depth, z0, z1, col)


def _podium_entrance(masonry, windows, metal, warm_trim, x, y, w, d, podium, style):
    """Refined double-height ground-floor colonnade podium keeping tenant sign clearances."""
    street = 1 if x < 0 else -1
    pw, pd = w + 3.6, d + 3.6
    # Subtle stepped granite plinth + main podium carcass
    plinth = chamfer_plan(x, y, pw + 0.35, pd + 0.35, 0.85)
    level(masonry, plinth, 0.05, 0.65, "#4c545e")
    podium_plan = chamfer_plan(x, y, pw, pd, 0.90)
    level(masonry, podium_plan, 0.65, podium - 0.55, "#5a636e")
    # Recessed lobby shopfront glass + deep dark mullions around all 4 sides
    lobby_glass = chamfer_plan(x, y, pw - 0.14, pd - 0.14, 0.85)
    n = len(lobby_glass)
    for j, a in enumerate(lobby_glass):
        b = lobby_glass[(j + 1) % n]
        dx, dy, length, normal = _edge_info(a, b)
        if length < 1.5:
            continue
        nx, ny = normal
        tx, ty = dx / length, dy / length
        gx, gy = nx * 0.11, ny * 0.11
        bays = max(2, round(length / 2.2))
        # Mid-height shopfront horizontal transom beam so tall lobby glazing reads cleanly proportioned
        tx0, ty0 = a[0] + nx * 0.13, a[1] + ny * 0.13
        tx1, ty1 = b[0] + nx * 0.13, b[1] + ny * 0.13
        metal.panel([(tx0, ty0, 3.35), (tx1, ty1, 3.35), (tx1, ty1, 3.52), (tx0, ty0, 3.52)], "#8c939a")
        for k in range(bays):
            f0, f1 = k / bays + 0.035, (k + 1) / bays - 0.035
            is_street = (nx * street) > 0.7
            tone = "#b9936a" if (is_street and k % 2 == 0) else "#948171" if k % 3 == 1 else "#2a4459"
            windows.panel([
                (a[0] + dx * f0 + gx, a[1] + dy * f0 + gy, 0.72),
                (a[0] + dx * f1 + gx, a[1] + dy * f1 + gy, 0.72),
                (a[0] + dx * f1 + gx, a[1] + dy * f1 + gy, 5.20),
                (a[0] + dx * f0 + gx, a[1] + dy * f0 + gy, 5.20),
            ], tone)
            if k > 0:
                px = a[0] + dx * (k / bays)
                py = a[1] + dy * (k / bays)
                prism_fin(metal, (px, py), nx, ny, tx, ty, 0.14, 0.24, 0.68, 5.35, "#9ca098")

    # Podium cornice band kept within pw+0.7 (= w+4.3) so street-facing sign at w/2+1.85 sits clean below at z=6.95
    cornice = chamfer_plan(x, y, pw + 0.68, pd + 0.68, 0.98)
    level(masonry, cornice, podium - 0.58, podium - 0.18, "#8e9296")
    level(masonry, podium_plan, podium - 0.18, podium + 0.05, "#68727c")

    # Street-facing colonnade piers & cantilevered glazed arrival canopy
    face_x = x + street * (pw * 0.5)
    canopy_d = min(d * 0.62, 12.0)
    cols = max(3, round(canopy_d / 3.8) + 1)
    for idx in range(cols):
        cy = y - canopy_d * 0.5 + idx * (canopy_d / (cols - 1))
        metal.box((face_x + street * 1.10, cy, 2.75), (0.58, 0.58, 5.40), "#7b838c")
    # Canopy beam frame + recessed dark glazed roof + warm soffit light cove
    metal.box((face_x + street * 0.92, y, 4.95), (2.25, canopy_d + 1.0, 0.28), "#5a6570")
    windows.box((face_x + street * 0.92, y, 5.12), (2.05, canopy_d + 0.6, 0.06), "#2f4b61")
    warm_trim.box((face_x + street * 0.55, y, 4.78), (0.36, canopy_d * 0.72, 0.10), "#ffd89e")


def _lantern_and_spire(masonry, metal, windows, warm_trim, cool_trim, beacon, cx, cy, w, d, z_top, style, seed):
    """Distinct sculptural crowns, illuminated trims, louvers and aviation spires."""
    base_col = {"res": "#646d78", "grid": "#596878", "glass": "#4e6274", "step": "#626a78"}[style]
    trim_col = {"res": "#989b9f", "grid": "#8e969e", "glass": "#9aa8b2", "step": "#b5a693"}[style]

    if style == "step":
        # Double-tier glowing pagoda/lantern crown + stepped metallic cage + tall needle spire
        lan1_w, lan1_d = max(5.2, w * 0.76), max(5.2, d * 0.76)
        lan1_h = 5.4
        plan1 = cruciform_plan(cx, cy, lan1_w, lan1_d, lan1_w * 0.12, lan1_d * 0.12)
        level(masonry, inset_plan(plan1, -0.35), z_top, z_top + 0.55, trim_col)
        level(warm_trim, inset_plan(plan1, 0.25), z_top + 0.55, z_top + lan1_h - 0.35, "#ffcf8a", cap_top=True)
        for p in plan1:
            metal.box((p[0], p[1], z_top + lan1_h * 0.5), (0.34, 0.34, lan1_h), trim_col)
        _tier_vertical_ribs(metal, plan1, z_top + 0.4, z_top + lan1_h, "step", trim_col)

        z2 = z_top + lan1_h
        lan2_w, lan2_d = max(3.4, lan1_w * 0.62), max(3.4, lan1_d * 0.62)
        lan2_h = 4.2
        plan2 = chamfer_plan(cx, cy, lan2_w, lan2_d, min(lan2_w, lan2_d) * 0.24)
        level(masonry, inset_plan(plan2, -0.30), z2, z2 + 0.45, trim_col)
        level(warm_trim, inset_plan(plan2, 0.18), z2 + 0.45, z2 + lan2_h, "#ffe0ad", cap_top=True)
        _tier_vertical_ribs(metal, plan2, z2 + 0.3, z2 + lan2_h + 0.2, "step", trim_col)

        z3 = z2 + lan2_h
        # Tapered metallic pinnacle cone + tall antenna mast + red beacon
        base_pin = chamfer_plan(cx, cy, lan2_w * 0.55, lan2_d * 0.55, 0.5)
        top_pin = chamfer_plan(cx, cy, 1.0, 1.0, 0.22)
        metal.rings([[(p[0], p[1], z3) for p in base_pin], [(p[0], p[1], z3 + 4.8) for p in top_pin]], trim_col, False, caps=True)
        spire_h = 14.0 if z_top > 130 else 9.5
        metal.rod((cx, cy, z3 + 4.7), (cx, cy, z3 + 4.7 + spire_h), 0.24, trim_col, sides=6, end_radius=0.05)
        beacon.box((cx, cy, z3 + 4.7 + spire_h + 0.20), (0.36, 0.36, 0.36), "#ff3b30")

    elif style == "glass":
        # Sculpted diagonally-sloping crystal sail crown + cool/warm illuminated rim + twin sleek spires
        crown_plan = chamfer_plan(cx, cy, w, d, min(w, d) * 0.19)
        slope_x = 1.0 if (seed % 2 == 0) else -1.0
        slope_y = 0.65 if (seed % 3 == 0) else -0.55
        lift = max(6.5, min(11.5, w * 0.48))
        # Outer glazed rising curtain shell + sloped roof skylight deck so aerial angles are enclosed
        top_ring = slanted_crown(windows, crown_plan, z_top - 0.1, slope_x, slope_y, lift, "#375772", cap=False)
        inner_deck = [(cx + (p[0] - cx) * 0.88, cy + (p[1] - cy) * 0.88, p[2] - 0.55) for p in top_ring]
        masonry.rings([top_ring, inner_deck], "#5c6c7a", False, caps=False)
        windows.panel(inner_deck, "#263f56")
        # Illuminated chamfered crown trim ribbon faithfully tracing the sloped rim
        rim = cool_trim if (seed % 2 == 0) else warm_trim
        rim_col = "#b8e4ff" if (seed % 2 == 0) else "#ffd9a2"
        sloped_belt(rim, top_ring, 0.08, 0.40, 0.05, rim_col)
        # Perimeter coping metal cap + vertical mullions + mid-crown transom subdividing crystal sail
        metal.rings([top_ring, [(p[0], p[1], p[2] + 0.24) for p in top_ring]], "#a8b4be", False, caps=False)
        for p in top_ring:
            metal.rod((p[0], p[1], z_top - 0.1), (p[0], p[1], p[2] + 0.24), 0.13, "#b2bec6", sides=4)
        for j in range(len(crown_plan)):
            p0, p1 = top_ring[j], top_ring[(j + 1) % len(top_ring)]
            b0, b1 = crown_plan[j], crown_plan[(j + 1) % len(crown_plan)]
            edge_l = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
            if edge_l > 2.2:
                m_cnt = max(2, round(edge_l / 2.2))
                for k in range(1, m_cnt):
                    f = k / m_cnt
                    mx = p0[0] + (p1[0] - p0[0]) * f
                    my = p0[1] + (p1[1] - p0[1]) * f
                    mz = p0[2] + (p1[2] - p0[2]) * f
                    metal.rod((mx, my, z_top), (mx, my, mz), 0.055, "#9aa6b0", sides=4)
            # Horizontal mid-sail metallic transom ring for crisp architectural scale
            dx, dy, length, normal = _edge_info(b0, b1)
            nx, ny = normal
            mz0 = z_top + (p0[2] - z_top) * 0.48
            mz1 = z_top + (p1[2] - z_top) * 0.48
            metal.panel([
                (b0[0] + nx * 0.06, b0[1] + ny * 0.06, mz0 - 0.07),
                (b1[0] + nx * 0.06, b1[1] + ny * 0.06, mz1 - 0.07),
                (b1[0] + nx * 0.06, b1[1] + ny * 0.06, mz1 + 0.07),
                (b0[0] + nx * 0.06, b0[1] + ny * 0.06, mz0 + 0.07),
            ], "#9aa6b0")
        # Sleek twin asymmetric spires rising from the high side of the crystal crown
        sp_z = z_top + lift * 0.45
        sp_x = cx + slope_x * w * 0.16
        sp_y = cy + slope_y * d * 0.10
        spire_h = 12.5 if z_top > 110 else 8.8
        metal.rod((sp_x, sp_y, sp_z), (sp_x, sp_y, sp_z + spire_h), 0.18, "#b4c0c8", sides=4, end_radius=0.04)
        metal.rod((sp_x - slope_x * 1.6, sp_y, sp_z), (sp_x - slope_x * 1.6, sp_y, sp_z + spire_h * 0.68), 0.13, "#9ca8b2", sides=4, end_radius=0.04)
        beacon.box((sp_x, sp_y, sp_z + spire_h + 0.18), (0.32, 0.32, 0.32), "#ff3b30")

    elif style == "grid":
        # Open-frame cantilevered architectural portal halo + louvered penthouse + slim parapet glow
        outer = chamfer_plan(cx, cy, w + 0.5, d + 0.5, 0.5)
        inner = chamfer_plan(cx, cy, w * 0.68, d * 0.68, 0.4)
        level(masonry, inner, z_top, z_top + 3.4, "#3b4856")
        # Horizontal louvre bands on penthouse core
        for lz in (0.9, 1.7, 2.5):
            level(metal, inset_plan(inner, -0.06), z_top + lz, z_top + lz + 0.28, "#7e8a96", cap_top=False)
        # Crown structural portal ring supported by corner blades
        level(metal, outer, z_top + 3.55, z_top + 4.35, trim_col)
        level(cool_trim, inset_plan(outer, 0.15), z_top + 3.38, z_top + 3.55, "#b3deff", cap_top=False)
        for px, py in outer[::2]:
            metal.box((px, py, z_top + 1.9), (0.55, 0.55, 3.8), trim_col)
        metal.rod((cx + w * 0.18, cy, z_top + 4.35), (cx + w * 0.18, cy, z_top + 10.5), 0.13, trim_col, sides=4, end_radius=0.04)
        if z_top > 85:
            beacon.box((cx + w * 0.18, cy, z_top + 10.65), (0.28, 0.28, 0.28), "#ff3b30")

    else:
        # Clean residential architectural parapet cornice + pergola crown frame + neat elevator headhouse
        par = chamfer_plan(cx, cy, w + 0.3, d + 0.3, 0.5)
        level(masonry, par, z_top, z_top + 1.15, trim_col, cap_top=False)
        level(masonry, chamfer_plan(cx, cy, w * 0.42, d * 0.46, 0.3), z_top, z_top + 2.7, base_col)
        # Subtle warm roof cornice accent on 2 tiers
        level(warm_trim, inset_plan(par, 0.08), z_top + 1.05, z_top + 1.24, "#f4cf99", cap_top=False)
        # Slim architectural pergola ribs across roof center
        for k in range(-2, 3):
            metal.box((cx + k * w * 0.14, cy, z_top + 2.85), (0.14, d * 0.72, 0.18), "#8f949a")


def _balcony_stacks(masonry, metal, windows, x, y, w, d, z_limit, podium, seed):
    """Add crisp inset/semi-projecting residential balcony stacks & vertical stair-core glow."""
    street = 1 if x < 0 else -1
    side_sign = 1 if seed % 2 == 0 else -1
    # Full-height vertical illuminated glazed stairwell slot on non-sign flank
    stair_x = x - street * (w * 0.26)
    stair_y = y - side_sign * (d * 0.5 + 0.08)
    windows.box((stair_x, stair_y, (podium + z_limit) * 0.5), (1.35, 0.14, z_limit - podium - 0.8), "#e0b87c")
    metal.box((stair_x - 0.72, stair_y, (podium + z_limit) * 0.5), (0.14, 0.22, z_limit - podium), "#65707b")
    metal.box((stair_x + 0.72, stair_y, (podium + z_limit) * 0.5), (0.14, 0.22, z_limit - podium), "#65707b")

    # Stacked residential balconies on street-side & secondary side
    bx = x + street * (w * 0.5 + 0.42)
    for off_s in (-0.23, 0.22):
        by = y + off_s * d
        z = podium + 3.45
        while z + 2.5 < z_limit:
            masonry.box((bx, by, z), (0.95, 4.4, 0.22), "#919498")
            metal.box((bx + street * 0.44, by, z + 0.58), (0.08, 4.35, 0.96), "#4f5c67")
            metal.box((bx + street * 0.44, by, z + 1.08), (0.11, 4.42, 0.08), "#a5a7aa")
            windows.box((bx - street * 0.40, by, z + 1.35), (0.12, 3.2, 2.2), "#dfb779")
            z += 6.90


def building(x, y, w, d, h, style, seed, far=False):
    rng = random.Random(seed)
    masonry, windows, metal = Batch(), Batch(), Batch()
    warm_trim, cool_trim, beacon = Batch(), Batch(), Batch()

    base = {"res": "#7a828e", "grid": "#6f8092", "glass": "#5c748a", "step": "#788090"}[style]
    trim = {"res": "#aeb3b8", "grid": "#9fa9b3", "glass": "#9aaab6", "step": "#c3b6a6"}[style]

    if far:
        tiers = [(0.0, 0.70, 1.0), (0.70, 0.90, 0.80), (0.90, 1.0, 0.54)]
    else:
        tiers = {
            "res": [(0.0, 0.64, 1.0), (0.64, 0.88, 0.88), (0.88, 1.0, 0.72)],
            "glass": [(0.0, 0.54, 1.0), (0.54, 0.82, 0.90), (0.82, 1.0, 0.77)],
            "step": [(0.0, 0.34, 1.0), (0.34, 0.58, 0.86), (0.58, 0.78, 0.71), (0.78, 0.91, 0.56), (0.91, 1.0, 0.42)],
            "grid": [(0.0, 0.62, 1.0), (0.62, 0.88, 0.86), (0.88, 1.0, 0.68)],
        }[style]

    podium = 5.5 if far else 8.1
    if far:
        street = chamfer_plan(x, y, w + 1.6, d + 1.6, 0.7)
        level(masonry, street, 0.08, podium, "#58626e")
    else:
        _podium_entrance(masonry, windows, metal, warm_trim, x, y, w, d, podium, style)

    body_h = h - podium
    tier0_top = podium + body_h * tiers[0][1]

    cx, cy = x, y
    ww, dd = w, d
    for index, (start, end, scale) in enumerate(tiers):
        # Symmetric architectural setback centering (or slight clean terrace shift for res/grid)
        shift_x = (1.0 - scale) * w * (0.09 if (style in ("res", "grid") and seed % 2) else -0.09 if style in ("res", "grid") else 0.0)
        shift_y = (1.0 - scale) * d * (0.07 if (style == "res" and seed % 3 == 0) else 0.0)
        cx = x + shift_x
        cy = y + shift_y
        a = podium + body_h * start
        b = podium + body_h * end
        ww, dd = w * scale, d * scale
        shape = plan_segments(cx, cy, ww, dd, style, bevel=0.45 if style == "grid" else 0.75)

        # Tier core facade
        level(masonry, shape, a, b - 0.55, base)
        # Architectural setback cornice / sky-terrace deck
        cap_shape = inset_plan(shape, -0.34)
        level(masonry, cap_shape, b - 0.55, b, trim)

        # Subtle warm uplight rim at setbacks of landmark towers
        if not far and style in ("step", "glass") and index < len(tiers) - 1:
            level(warm_trim, inset_plan(shape, -0.06), b - 0.72, b - 0.55, "#f5cc90", cap_top=False)

        floor_target = 5.4 if far else (3.40 if style == "res" else 3.60)
        count = max(1, round((b - a) / floor_target))
        story = (b - a) / count

        for f in range(count):
            fz0 = a + f * story
            is_refuge = (not far and style in ("glass", "step") and count >= 6 and f == count // 2 and index == 0)
            if is_refuge:
                # Illuminated louvered sky-lobby gallery with warm ceiling cove behind outer mullions
                rec = inset_plan(shape, 0.28)
                level(masonry, rec, fz0, fz0 + story - 0.1, "#455564", cap_top=False)
                _curtain_bay_panes(windows, metal, masonry, rec, fz0 + 0.5, story - 1.1, 0.4, rng, style, f + 99, seed * 37, glass_offset=0.04, bay_target=1.45, mullions=True)
                level(warm_trim, inset_plan(rec, -0.02), fz0 + story - 0.45, fz0 + story - 0.18, "#f7ce91", cap_top=False)
                continue

            spandrel_h = story * (0.28 if style == "glass" else 0.30 if style == "step" else 0.32)
            pane_h = story - spandrel_h - (0.08 if far else 0.14)
            z_sill = fz0 + spandrel_h
            _curtain_bay_panes(
                windows, metal, masonry, shape,
                z_sill, pane_h, spandrel_h * 0.90,
                rng, style, f + index * 20, seed * 101 + index,
                glass_offset=0.05,
                bay_target=3.0 if far else (1.72 if style in ("glass", "step") else 1.85),
                mullions=not far,
            )
            # Bold 3-storey structural stone belt bands on Mega-Frame 'grid' towers
            if not far and style == "grid" and f > 0 and f % 3 == 0:
                level(masonry, inset_plan(shape, -0.26), fz0 - 0.18, fz0 + 0.24, "#8a95a0", cap_top=False)

        # Full-tier continuous vertical mullions / mega-pilasters
        if not far:
            _tier_vertical_ribs(metal, shape, a, b - 0.55, style, trim)

    if not far and style == "res" and (tiers[0][1] * body_h) > 14.0:
        _balcony_stacks(masonry, metal, windows, x, y, w, d, tier0_top, podium, seed)

    # Signature sculptural tops (including refined far skyline crowns)
    if far:
        far_cap = inset_plan(plan_segments(cx, cy, ww * 0.72, dd * 0.72, style), 0.0)
        level(masonry, far_cap, h, h + 3.2, base)
        if style == "step":
            metal.rod((cx, cy, h + 3.2), (cx, cy, h + 11.5), 0.18, trim, sides=4, end_radius=0.04)
            beacon.box((cx, cy, h + 11.7), (0.32, 0.32, 0.32), "#ff3b30")
    else:
        _lantern_and_spire(masonry, metal, windows, warm_trim, cool_trim, beacon, cx, cy, ww, dd, h, style, seed)

    mat_masonry = bpy.data.materials.get("City facades") or B.vmat("City facades", 0.78)
    mat_win = bpy.data.materials.get("City window colour") or B.vmat("City window colour", 0.40, 0.14)
    mat_metal = bpy.data.materials.get("CityMetal") or B.vmat("CityMetal", 0.45, 0.55)
    mat_warm = bpy.data.materials.get("CityWarm") or B.mat("CityWarm", "#ffbe78", rough=0.5, emission="#ffb86a", emis_strength=1.55)
    mat_cool = bpy.data.materials.get("CityCool") or B.mat("CityCool", "#a9dcff", rough=0.4, emission="#a8d8ff", emis_strength=1.15)
    mat_red = bpy.data.materials.get("RedLight") or B.mat("RedLight", "#ff3b30", rough=0.4, emission="#ff2a20", emis_strength=5.0)

    out = [
        masonry.object("Skyscraper masonry", mat_masonry),
        windows.object("Skyscraper curtain glass", mat_win),
    ]
    if metal.vertices:
        out.append(metal.object("Skyscraper mullions and spires", mat_metal))
    if warm_trim.vertices:
        out.append(warm_trim.object("Skyscraper warm crown coves", mat_warm))
    if cool_trim.vertices:
        out.append(cool_trim.object("Skyscraper cool crown coves", mat_cool))
    if beacon.vertices:
        out.append(beacon.object("Skyscraper aviation beacons", mat_red))
    return out


def noodle_corner():
    """Refined crisp corner apartment walk-up above the preserved ground-floor noodle arcade."""
    masonry, glass, metal, warm_trim = Batch(), Batch(), Batch(), Batch()
    outline = chamfer_plan(19, -18, 11.8, 14.0, 0.85)
    level(masonry, outline, 0.12, 15.6, "#788492")
    rng = random.Random(37)
    for i in range(3):
        z = 4.45 + 3.60 * i
        _curtain_bay_panes(
            glass, metal, masonry, outline,
            z, 2.25, 0.55, rng, "res", i, 19 + i * 7,
            glass_offset=0.05, bay_target=1.35, mullions=True
        )
        # Split tall corner-building apartment casements with horizontal middle transom
        level(metal, inset_plan(outline, -0.07), z + 1.05, z + 1.15, "#879099", cap_top=False)
        # Architectural floor ledge cornices
        ledge = chamfer_plan(19, -18, 12.5, 14.7, 0.95)
        level(masonry, ledge, z - 0.56, z - 0.24, "#b4a795")
    # Roof parapet + stairhead + slim side AC cages
    level(masonry, chamfer_plan(19, -18, 12.5, 14.7, 0.95), 15.30, 15.85, "#b0a490")
    level(masonry, chamfer_plan(19, -18, 12.1, 14.3, 0.90), 15.85, 16.45, "#78838e", cap_top=False)
    level(masonry, chamfer_plan(19.9, -18.3, 7.6, 9.6, 0.65), 15.85, 17.65, "#6c7883")
    metal.box((19.9, -18.3, 17.75), (7.9, 9.9, 0.20), "#9da19c")

    # Preserve ground-floor arcade geometry & furnish the noodle shop arcade warmly
    for y in (-21.0, -15.0):
        metal.rod((10.80, y, 0.17), (10.80, y, 3.73), 0.18, "#948673", 10)
    masonry.box((12.45, -18, 3.79), (4.0, 8.32, 0.35), "#778281")
    warm_trim.box((12.45, -18, 3.58), (3.4, 7.2, 0.08), "#ffd89e")
    for y in (-21.86, -14.14):
        masonry.box((12.28, y, 1.92), (3.62, 0.19, 3.55), "#8c827b")
        for z in (0.56, 0.71, 3.26):
            masonry.box((12.26, y, z), (3.68, 0.23, 0.12), "#b09d81")
    for i in range(4):
        y = -23.3 + i * 3.23
        metal.rod((13.15, y, 0.18), (13.15, y, 3.64), 0.092, "#79654e", 8)
    metal.pipe([(14.13, -24.30, 14.89), (14.13, -24.30, 4.04), (13.81, -24.30, 3.83), (13.81, -24.30, 0.20)], 0.089, "#9b847c", 8)

    # Cozy sidewalk tables, stools, ceramic noodle bowls & warm enamel pendant lamps under the arcade
    for ty in (-20.1, -15.8):
        metal.rod((11.82, ty, 3.56), (11.82, ty, 2.86), 0.025, "#3b4248", 6)
        metal.rod((11.82, ty, 2.74), (11.82, ty, 2.86), 0.25, "#2f5a57", 12, end_radius=0.05)
        warm_trim.rod((11.82, ty, 2.63), (11.82, ty, 2.77), 0.085, "#ffe4ab", 10, end_radius=0.05)
        masonry.box((11.95, ty, 0.78), (0.76, 0.76, 0.06), "#a67b4d")
        metal.rod((11.95, ty, 0.18), (11.95, ty, 0.76), 0.055, "#4c4338", 8)
        masonry.box((11.95, ty, 0.21), (0.48, 0.48, 0.05), "#4c4338")
        masonry.rod((11.85, ty - 0.12, 0.81), (11.85, ty - 0.12, 0.90), 0.06, "#f1ead8", 10, end_radius=0.095)
        masonry.rod((12.04, ty + 0.14, 0.81), (12.04, ty + 0.14, 0.89), 0.055, "#efe5d0", 10, end_radius=0.09)
        for sy in (-0.58, 0.58):
            masonry.box((11.92, ty + sy, 0.46), (0.34, 0.34, 0.05), "#9e7346")
            masonry.rod((11.92, ty + sy, 0.18), (11.92, ty + sy, 0.44), 0.032, "#6b5036", 6)

    mat_masonry = bpy.data.materials.get("City facades") or B.vmat("City facades", 0.78)
    mat_win = bpy.data.materials.get("City window colour") or B.vmat("City window colour", 0.40, 0.14)
    mat_metal = bpy.data.materials.get("CityMetal") or B.vmat("CityMetal", 0.45, 0.55)
    mat_warm = bpy.data.materials.get("CityWarm") or B.mat("CityWarm", "#ffbe78", rough=0.5, emission="#ffb86a", emis_strength=1.55)
    out = [
        masonry.object("Corner apartment masonry and shop arcade", mat_masonry),
        glass.object("Corner bay windows", mat_win),
    ]
    if metal.vertices:
        out.append(metal.object("Corner apartment metal trim", mat_metal))
    if warm_trim.vertices:
        out.append(warm_trim.object("Corner arcade canopy light", mat_warm))
    return out
