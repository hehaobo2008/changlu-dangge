"""Biomimetic coastal parametric architecture for Act 5 (Future City). All dimensions in metres."""
import math
import bpy
import blib as B
from model_craft import Batch
from city_architecture import footprint

CERAMIC = "#f8faf5"
CERAMIC_SOFT = "#e3ebe7"
OAK = "#deb076"
BRONZE = "#9a7e5e"
REVEAL = "#253b45"
GLASS_COOL = "#2e5c6b"
GLASS_SKY = "#3f7382"
GLASS_WARM = "#e2b87a"
GLASS_AMBER = "#cc9e6a"
METAL_CHAMP = "#dad2c2"
METAL_STEEL = "#a6b8be"
PV_DARK = "#1f3743"
LEAF_A = "#4f7c46"
LEAF_B = "#679454"
LEAF_C = "#81a862"


def between(a, b, t):
    return tuple(u + (v - u) * t for u, v in zip(a, b))


def _mat(name, *args, **kwargs):
    m = bpy.data.materials.get(name)
    if m is not None:
        return m
    return B.vmat(name, *args, **kwargs)


def _petal_point(cx, cy, w, d, theta, pin=0.16, rot=0.0):
    c, s = math.cos(theta), math.sin(theta)
    lx = (w * 0.5) * c * (1.0 - pin * (s * s))
    ly = (d * 0.5) * s * (1.0 - 0.35 * pin * (c * c))
    co, si = math.cos(rot), math.sin(rot)
    return (cx + lx * co - ly * si, cy + lx * si + ly * co)


def petal_ring(cx, cy, w, d, n=24, pin=0.16, rot=0.0):
    """Sleek aerodynamic lens / petal closed loop in CCW order."""
    return [_petal_point(cx, cy, w, d, math.tau * i / n, pin=pin, rot=rot) for i in range(n)]


def wave_slab_ring(cx, cy, w, d, n=28, amp=0.20, phase=0.0, exp_x=0.66, exp_y=0.66):
    """Fluid organic superellipse-wave perimeter loop strictly bounded near (w, d)."""
    rx, ry = w * 0.5, d * 0.5
    pts = []
    for i in range(n):
        a = math.tau * i / n
        c, s = math.cos(a), math.sin(a)
        ripple = 1.0 + amp * 0.035 * math.cos(3.0 * a + phase)
        sx = math.copysign(abs(c) ** exp_x, c) * rx * ripple
        sy = math.copysign(abs(s) ** exp_y, s) * ry * ripple
        pts.append((cx + sx, cy + sy))
    return pts


def _scale_ring(ring, cx, cy, sx, sy=None):
    if sy is None:
        sy = sx
    return [(cx + (x - cx) * sx, cy + (y - cy) * sy) for x, y in ring]


def _ribbon_slab(batch, ring, z_bot, z_top, color_side, color_cap=None, smooth=True):
    rings = [[(x, y, z_bot) for x, y in ring], [(x, y, z_top) for x, y in ring]]
    batch.rings(rings, color_side, smooth=smooth, caps=False)
    if color_cap:
        batch.panel(rings[-1], color_cap)
    return rings[-1]


def _bevel_slab(batch, ring_outer, ring_inner, z_bot, z_mid, z_top, col_main, col_soffit=None):
    """Sculpted overhanging nose profile from recessed soffit up to outer slab lip."""
    r0 = [(x, y, z_bot) for x, y in ring_inner]
    r1 = [(x, y, z_mid) for x, y in ring_outer]
    r2 = [(x, y, z_top) for x, y in ring_outer]
    batch.rings([r0, r1], col_soffit or col_main, smooth=True, caps=False)
    batch.rings([r1, r2], col_main, smooth=True, caps=False)
    batch.panel(r2, col_main)
    batch.panel(list(reversed(r0)), col_soffit or col_main)


def _greenery_bed(shell, foliage, ring, z, height=0.80, seed=0):
    """Curved bronze planter kerb with soft organic billowing hedge strip and pillowed foliage mounds."""
    outer = ring
    cx = sum(p[0] for p in outer) / len(outer)
    cy = sum(p[1] for p in outer) / len(outer)
    inner = _scale_ring(outer, cx, cy, 0.85)
    mid_ring = _scale_ring(outer, cx, cy, 0.925)
    _ribbon_slab(shell, outer, z, z + 0.34, BRONZE, None, smooth=True)

    # Continuous rounded organic hedge bank following terrace perimeter smoothly (zero pointy cones!)
    n = len(outer)
    cols = [LEAF_A, LEAF_B, LEAF_C]
    soil_lo_out = [(p[0], p[1], z + 0.30) for p in outer]
    soil_lo_in = [(p[0], p[1], z + 0.30) for p in inner]
    crown_mid = [
        (
            mid_ring[i][0],
            mid_ring[i][1],
            z + 0.34 + height * (0.48 + 0.30 * math.sin(i * 1.45 + seed * 1.3) ** 2),
        )
        for i in range(n)
    ]
    edge_out = [
        (
            cx + (outer[i][0] - cx) * 0.97,
            cy + (outer[i][1] - cy) * 0.97,
            z + 0.34 + height * (0.28 + 0.22 * abs(math.cos(i * 0.9 + seed))),
        )
        for i in range(n)
    ]
    edge_in = [
        (
            cx + (inner[i][0] - cx) * 1.03,
            cy + (inner[i][1] - cy) * 1.03,
            z + 0.34 + height * (0.28 + 0.22 * abs(math.sin(i * 0.9 + seed))),
        )
        for i in range(n)
    ]
    for i in range(n):
        j = (i + 1) % n
        col = cols[(i + seed) % 3]
        foliage.panel([soil_lo_out[i], soil_lo_out[j], edge_out[j], edge_out[i]], col)
        foliage.panel([edge_out[i], edge_out[j], crown_mid[j], crown_mid[i]], cols[(i + seed + 1) % 3])
        foliage.panel([crown_mid[i], crown_mid[j], edge_in[j], edge_in[i]], col)
        foliage.panel([edge_in[i], edge_in[j], soil_lo_in[j], soil_lo_in[i]], cols[(i + seed + 2) % 3])

        # Soft rounded billowing foliage pillows spaced asymmetrically
        if i % 3 == (seed % 3):
            px, py = mid_ring[i]
            rad = min(1.05, math.dist(outer[i], outer[j]) * 0.55)
            if rad > 0.28:
                r_low = petal_ring(px, py, rad * 1.8, rad * 1.35, n=8, pin=0.05, rot=i * 0.7)
                r_mid = petal_ring(px, py, rad * 1.45, rad * 1.1, n=8, pin=0.05, rot=i * 0.7)
                r_top = petal_ring(px, py, rad * 0.75, rad * 0.58, n=8, pin=0.05, rot=i * 0.7)
                h0 = z + 0.34
                h1 = h0 + height * 0.58
                h2 = h0 + height * 0.96
                foliage.rings(
                    [
                        [(a, b, h0) for a, b in r_low],
                        [(a, b, h1) for a, b in r_mid],
                        [(a, b, h2) for a, b in r_top],
                    ],
                    cols[(i + seed + 1) % 3],
                    smooth=True,
                    caps=True,
                )


def _wing_xy_z(cx, cy, w, d, u, v, z_eave, arch, cant, pitch):
    """Smooth elliptical disk mapping (u,v in [-1,1]) onto sculpted gull-wing aerodynamic shell."""
    hx, hy = w * 0.5, d * 0.5
    rad = math.hypot(u, v)
    if rad > 1.0:
        u /= rad
        v /= rad
    # Subtle petal tapering toward wing tips
    x = cx + hx * u * (1.0 - 0.14 * (v * v))
    y = cy + hy * v * (1.0 - 0.08 * (u * u))
    r2 = min(1.0, u * u * 0.65 + v * v * 0.85)
    z = z_eave + arch * (0.45 * (1.0 - r2) + 0.55 * (1.0 - v * v) * (0.75 + 0.25 * u * u)) + cant * v + pitch * u
    return x, y, z


def _curved_wing_canopy(shell, metal, solar, warm, cx, cy, w, d, z_eave, arch=2.0, cant=0.8, pitch=0.0, foot_z=None):
    """Watertight structured multi-quad double-curved wing shell + flush PV slats + champagne V-struts."""
    fz = (z_eave - 2.35) if foot_z is None else foot_z
    # 4 paired V-struts supporting wing cleanly from foot_z up to canopy belly
    for sx in (-1, 1):
        px = cx + sx * w * 0.26
        for sy in (-1, 1):
            py = cy + sy * d * 0.16
            foot = (px * 0.86 + cx * 0.14, py, fz)
            _, _, z_a = _wing_xy_z(cx, cy, w, d, sx * 0.64, -sy * 0.34, z_eave, arch, cant, pitch)
            _, _, z_b = _wing_xy_z(cx, cy, w, d, sx * 0.44, sy * 0.42, z_eave, arch, cant, pitch)
            head_a = (cx + sx * w * 0.30, cy - sy * d * 0.15, z_a - 0.15)
            head_b = (cx + sx * w * 0.20, cy + sy * d * 0.19, z_b - 0.15)
            metal.rod(foot, head_a, 0.125, METAL_CHAMP, 6)
            metal.rod(foot, head_b, 0.105, METAL_STEEL, 6)

    # Structured 10x8 polar-mapped oval quad grid (top skin, oak soffit skin, stitched outer rim)
    nu, nv = 10, 8
    top_grid = []
    bot_grid = []
    for iu in range(nu + 1):
        u = -1.0 + 2.0 * iu / nu
        top_row, bot_row = [], []
        for iv in range(nv + 1):
            v = -1.0 + 2.0 * iv / nv
            # Map square [-1,1]^2 smoothly onto unit disk cleanly via elliptical grid transform
            du = u * math.sqrt(max(0.0, 1.0 - 0.5 * v * v))
            dv = v * math.sqrt(max(0.0, 1.0 - 0.5 * u * u))
            px, py, pz = _wing_xy_z(cx, cy, w, d, du, dv, z_eave, arch, cant, pitch)
            edge_taper = 0.20 * (1.0 - 0.45 * min(1.0, du * du + dv * dv))
            top_row.append((px, py, pz + edge_taper))
            bot_row.append((px, py, pz - edge_taper))
        top_grid.append(top_row)
        bot_grid.append(bot_row)

    for iu in range(nu):
        for iv in range(nv):
            # Top pearl-ceramic skin (+Z normal)
            shell.panel([
                top_grid[iu][iv],
                top_grid[iu + 1][iv],
                top_grid[iu + 1][iv + 1],
                top_grid[iu][iv + 1],
            ], CERAMIC)
            # Bottom warm oak soffit (-Z normal)
            shell.panel([
                bot_grid[iu][iv],
                bot_grid[iu][iv + 1],
                bot_grid[iu + 1][iv + 1],
                bot_grid[iu + 1][iv],
            ], OAK)

    # Stitch closed beveled perimeter edge cleanly
    rim_top = (
        [top_grid[i][0] for i in range(nu)]
        + [top_grid[nu][j] for j in range(nv)]
        + [top_grid[i][nv] for i in range(nu, 0, -1)]
        + [top_grid[0][j] for j in range(nv, 0, -1)]
    )
    rim_bot = (
        [bot_grid[i][0] for i in range(nu)]
        + [bot_grid[nu][j] for j in range(nv)]
        + [bot_grid[i][nv] for i in range(nu, 0, -1)]
        + [bot_grid[0][j] for j in range(nv, 0, -1)]
    )
    shell.rings([rim_bot, rim_top], CERAMIC_SOFT, smooth=True, caps=False)

    # Indirect warm soffit light strip & continuous swept dual-flank PV wings along curved shell
    _, _, z_mid = _wing_xy_z(cx, cy, w, d, 0.0, 0.0, z_eave, arch, cant, pitch)
    warm.box((cx, cy, z_mid - 0.24), (w * 0.40, 0.26, 0.08), "#ffdca6")
    for iv_band in (1, 5):
        for iu in range(2, nu - 2):
            for iv in (iv_band, iv_band + 1):
                p0 = top_grid[iu][iv]
                p1 = top_grid[iu + 1][iv]
                p2 = top_grid[iu + 1][iv + 1]
                p3 = top_grid[iu][iv + 1]
                lift = 0.085
                solar.panel(
                    [(p0[0], p0[1], p0[2] + lift), (p1[0], p1[1], p1[2] + lift),
                     (p2[0], p2[1], p2[2] + lift), (p3[0], p3[1], p3[2] + lift)],
                    PV_DARK,
                )


def _curtain_band(shell, glass, metal, outer, inner, z0, z1, row_idx, seed, spacing, bay_wood=False):
    """Curved continuous curtain wall band between two perimeter loops with mullions & louvers."""
    n = len(outer)
    sill = z0 + (z1 - z0) * 0.24
    shell.rings([[(p[0], p[1], z0) for p in outer], [(p[0], p[1], sill) for p in outer]],
                CERAMIC if row_idx % 2 == 0 else CERAMIC_SOFT, smooth=True, caps=False)
    for j in range(n):
        k = (j + 1) % n
        a, b = outer[j], outer[k]
        ia, ib = inner[j], inner[k]
        bays = max(1, round(math.dist(a, b) / spacing))
        for m in range(bays):
            f0, f1 = m / bays, (m + 1) / bays
            grp = (j * 5 + m // 2 + row_idx * 7 + seed * 11)
            h = (grp * 2654435761) & 0xFFFFFFFF
            v = (h % 1000) / 1000.0
            if v < 0.14:
                col = GLASS_WARM if (row_idx + m) % 3 == 0 else GLASS_AMBER
            elif v < 0.23 and m % 2 == 0:
                col = "#a8927b"  # subtle soft warm twilight reflection
            elif j < n // 2:
                col = GLASS_COOL
            else:
                col = GLASS_SKY
            p0 = between(ia, ib, f0)
            p1 = between(ia, ib, f1)
            glass.panel([
                (p0[0], p0[1], sill),
                (p1[0], p1[1], sill),
                (p1[0], p1[1], z1),
                (p0[0], p0[1], z1),
            ], col)
            if m > 0:
                mx, my = between(ia, ib, f0)
                metal.rod((mx, my, sill), (mx, my, z1), 0.055, METAL_STEEL, 4)
        # Warm vertical oak brise-soleil blades shading sunlit outer ribs
        if bay_wood and (j + row_idx) % 2 == 0:
            fx, fy = between(a, b, 0.5)
            shell.rod((fx, fy, sill - 0.08), (fx, fy, z1 + 0.06), 0.09, OAK, 4)


def research(shell, glass, metal, foliage, solar, cyan, warm, x, y, w, d, height, lean, base, spacing, variant):
    """Iconic biomimetic twisting petal research tower with smooth helical exoskeleton & sky-gardens."""
    count = round(height / 3.75)
    n_pts = 24
    atrium_floors = set()
    if height >= 70:
        atrium_floors.update([round(count * 0.38), round(count * 0.38) + 1, round(count * 0.70), round(count * 0.70) + 1])
    elif height >= 52:
        atrium_floors.update([round(count * 0.48), round(count * 0.48) + 1])
    else:
        atrium_floors.update([round(count * 0.54)])

    d_trim = 0.90 if variant == 1 else 1.0
    twist_total = 0.26 if lean < 0 else -0.22

    # Sculpted grounded podium skirt + double-height arrival wave portico
    plinth_outer = petal_ring(x, y, w + 1.4, (d + 1.4) * d_trim, n=n_pts, pin=0.14)
    _ribbon_slab(shell, plinth_outer, base - 2.8, base + 0.60, CERAMIC_SOFT, CERAMIC)
    portico = petal_ring(x + lean * 0.04, y - d * 0.08, w + 2.2, d * 0.90, n=n_pts, pin=0.16)
    _bevel_slab(shell, portico, _scale_ring(portico, x, y, 0.86), base + 4.90, base + 5.20, base + 5.50, CERAMIC, OAK)
    warm.box((x, y - d * 0.34, base + 4.84), (w * 0.48, 0.32, 0.12), "#ffdca6")
    for k in (-0.36, -0.14, 0.14, 0.36):
        px = x + k * w
        py = y - d * 0.38 * d_trim
        metal.rod((px, py, base + 0.50), (px * 0.98 + x * 0.02, py - 0.55, base + 5.05), 0.17, METAL_CHAMP, 6)

    shapes_out = []
    shapes_in = []
    centers = []
    params = []
    for i in range(count + 1):
        t = i / count
        cx = x + lean * (t ** 1.35)
        cy = y
        ww = w * (1.0 - 0.28 * (t ** 1.25))
        dd = d * (1.0 - 0.20 * (t ** 1.15)) * (d_trim if t < 0.35 else 1.0 - 0.04)
        rot = twist_total * t
        out_r = petal_ring(cx, cy, ww, dd, n=n_pts, pin=0.17, rot=rot)
        in_r = _scale_ring(out_r, cx, cy, 0.93)
        shapes_out.append(out_r)
        shapes_in.append(in_r)
        centers.append((cx, cy, base + t * height))
        params.append((cx, cy, ww, dd, rot, base + t * height))

    # Curtain wall + bold luminous white ceramic floor belts + recessed botanical sky-gardens
    for f in range(count):
        z0 = base + (f / count) * height
        z1 = base + ((f + 1) / count) * height
        out_f = shapes_out[f]
        in_f = shapes_in[f]
        cx, cy, _ = centers[f]
        if f in atrium_floors:
            core = _scale_ring(in_f, cx, cy, 0.70)
            _curtain_band(shell, glass, metal, core, _scale_ring(core, cx, cy, 0.95), z0, z1, f, variant + 3, spacing * 0.9)
            if (f - 1) not in atrium_floors:
                _bevel_slab(shell, out_f, core, z0, z0 + 0.22, z0 + 0.44, CERAMIC, OAK)
                _greenery_bed(shell, foliage, _scale_ring(out_f, cx, cy, 0.90), z0 + 0.40, height=1.10, seed=f + variant)
            else:
                warm.box((cx, cy - d * 0.24, z1 - 0.14), (w * 0.38, 0.32, 0.12), "#ffdca6")
        else:
            _curtain_band(shell, glass, metal, out_f, in_f, z0, z1, f, variant + 1, spacing * 0.72, bay_wood=(f % 4 == 0))
            if f % 2 == 0 and f > 0:
                _bevel_slab(shell, out_f, in_f, z0 - 0.14, z0 + 0.08, z0 + 0.30, CERAMIC, CERAMIC_SOFT)

    # Butter-smooth parametric helical pearl-ceramic exoskeleton ribs & metallic sun-blades (no integer jumps!)
    num_ribs = 8
    helix_sweep = 0.85 if variant in (0, 2) else -0.75
    for r_idx in range(num_ribs):
        theta0 = math.tau * r_idx / num_ribs
        pts_rib = []
        pts_fin = []
        for f in range(count + 1):
            t = f / count
            cx, cy, ww, dd, rot, z = params[f]
            th = theta0 + helix_sweep * t
            p = _petal_point(cx, cy, ww, dd, th, pin=0.17, rot=rot)
            pts_rib.append((p[0], p[1], z))
            vx, vy = p[0] - cx, p[1] - cy
            vl = math.hypot(vx, vy) or 1.0
            pts_fin.append((p[0] + vx / vl * 0.24, p[1] + vy / vl * 0.24, z))
        shell.pipe(pts_rib, 0.23, CERAMIC, 5)
        if r_idx % 2 == 0:
            metal.pipe(pts_fin, 0.095, METAL_CHAMP, 4)

    # Crown deck + iconic landmark crown assemblies
    top_out = shapes_out[-1]
    top_cx, top_cy, top_z = centers[-1]
    _ribbon_slab(shell, top_out, top_z - 0.45, top_z + 0.42, CERAMIC, CERAMIC)
    _greenery_bed(shell, foliage, _scale_ring(top_out, top_cx, top_cy, 0.85), top_z + 0.38, height=1.05, seed=variant * 7)

    if variant == 0:
        for side in (-1, 1):
            sail_pts = []
            for s in range(9):
                u = s / 8
                sx = top_cx + side * (w * 0.28 * (1.0 - 0.42 * u * u))
                sy = top_cy + d * 0.34 * (u - 0.5)
                sz = top_z + u * 15.5
                sail_pts.append((sx, sy, sz))
            shell.pipe(sail_pts, 0.45, CERAMIC, 6)
            metal.pipe([(p[0] + side * 0.34, p[1], p[2]) for p in sail_pts], 0.14, METAL_CHAMP, 5)
        halo_r = min(w, d) * 0.34
        halo_pts, cyan_pts = [], []
        for k in range(29):
            a = math.tau * k / 28
            hx = top_cx + halo_r * math.cos(a) * 0.92
            hy = top_cy + halo_r * math.sin(a)
            hz = top_z + 8.8 + 1.8 * math.cos(a)
            halo_pts.append((hx, hy, hz))
            cyan_pts.append((top_cx + (hx - top_cx) * 0.92, top_cy + (hy - top_cy) * 0.92, hz))
        metal.pipe(halo_pts, 0.26, METAL_CHAMP, 6)
        cyan.pipe(cyan_pts, 0.11, "#bff7ff", 5)
        metal.rod((top_cx - 1.2, top_cy, top_z + 1.0), (top_cx - 1.2, top_cy, top_z + 21.5), 0.19, METAL_CHAMP, 5, 0.04)
        metal.rod((top_cx + 1.1, top_cy + 0.6, top_z + 1.0), (top_cx + 1.1, top_cy + 0.6, top_z + 16.0), 0.14, METAL_STEEL, 5, 0.03)
        cyan.box((top_cx - 1.2, top_cy, top_z + 21.6), (0.32, 0.32, 0.35), "#bff7ff")

    elif variant == 1:
        _curved_wing_canopy(shell, metal, solar, warm, top_cx, top_cy, w * 0.72, d * 0.72, top_z + 2.4, arch=2.2, cant=1.2, pitch=-1.0, foot_z=top_z + 0.38)
        metal.rod((top_cx + 0.8, top_cy, top_z + 3.0), (top_cx + 0.8, top_cy, top_z + 15.8), 0.16, METAL_CHAMP, 5, 0.035)
        cyan.box((top_cx + 0.8, top_cy, top_z + 15.9), (0.28, 0.28, 0.30), "#bff7ff")

    elif variant == 2:
        _curved_wing_canopy(shell, metal, solar, warm, top_cx, top_cy, w * 0.76, d * 0.76, top_z + 2.2, arch=1.8, cant=0.9, pitch=0.7, foot_z=top_z + 0.38)
        cyan_ring = _scale_ring(top_out, top_cx, top_cy, 1.01)
        cyan.pipe([(a, b, top_z + 0.12) for a, b in cyan_ring + [cyan_ring[0]]], 0.08, "#bff7ff", 4)

    else:
        for ang in (0.35, 1.92):
            ca, sa = math.cos(ang), math.sin(ang)
            arc = []
            for s in range(11):
                u = (s / 10) * 2.0 - 1.0
                r_len = w * 0.39 * u
                hz = top_z + 0.35 + 5.6 * (1.0 - u * u)
                arc.append((top_cx + r_len * ca, top_cy + r_len * sa, hz))
            shell.pipe(arc, 0.30, CERAMIC, 5)
            metal.pipe([(p[0], p[1], p[2] + 0.25) for p in arc], 0.10, METAL_CHAMP, 4)
        metal.rod((top_cx, top_cy, top_z + 5.9), (top_cx, top_cy, top_z + 13.5), 0.14, METAL_CHAMP, 5, 0.03)


def housing(shell, glass, metal, foliage, solar, warm, x, y, w, d, tiers, base, seed=0, plinth_bot=None):
    """Luminous pearl-ceramic wave terraces with open champagne guardrails, oak soffits & cascading greenery."""
    # Deep grounded foundation plinth so hillside buildings never float on downhill edges
    base_ring = wave_slab_ring(x, y, w + 0.6, d + 0.6, n=26, amp=0.18, phase=seed)
    z_skirt = (base - 4.0) if plinth_bot is None else plinth_bot
    _ribbon_slab(shell, base_ring, z_skirt, base + 0.08, CERAMIC_SOFT, None, smooth=True)

    cur_z = base
    cx = x
    for i, n_floors in enumerate(tiers):
        tw = w - i * 1.45
        td = d - i * 2.40
        cy = y + i * 1.15
        floor_h = 3.25
        h = n_floors * floor_h
        for f in range(n_floors):
            fz0 = cur_z + f * floor_h
            fz1 = fz0 + floor_h
            slab_out = wave_slab_ring(cx, cy, tw + 0.55, td + 0.55, n=26, amp=0.20, phase=seed + f * 0.8 + i)
            slab_in = _scale_ring(slab_out, cx, cy, 0.89)
            core_ring = _scale_ring(slab_out, cx, cy, 0.85)
            # Bold overhanging luminous pearl ceramic floor ribbon + warm oak soffit
            _bevel_slab(shell, slab_out, slab_in, fz0, fz0 + 0.28, fz0 + 0.58, CERAMIC, OAK)
            # Recessed panoramic residential glazing + warm oak sun-breakers
            _curtain_band(shell, glass, metal, core_ring, _scale_ring(core_ring, cx, cy, 0.95),
                          fz0 + 0.52, fz1 - 0.06, f + i * 5, seed + i * 3, 1.85, bay_wood=(f % 2 == 0))
            # Open airy champagne-metal twin-rail balustrades (zero opaque blue glass blocking balconies!)
            rail_ring = _scale_ring(slab_out, cx, cy, 0.97)
            metal.pipe([(a, b, fz0 + 1.00) for a, b in rail_ring + [rail_ring[0]]], 0.042, METAL_STEEL, 4)
            metal.pipe([(a, b, fz0 + 1.42) for a, b in rail_ring + [rail_ring[0]]], 0.055, METAL_CHAMP, 4)
            for p in rail_ring[::2]:
                metal.rod((p[0], p[1], fz0 + 0.55), (p[0], p[1], fz0 + 1.42), 0.040, METAL_STEEL, 4)
        cur_z += h
        cap_out = wave_slab_ring(cx, cy, tw + 0.65, td + 0.65, n=26, amp=0.20, phase=seed + i)
        _bevel_slab(shell, cap_out, _scale_ring(cap_out, cx, cy, 0.88), cur_z - 0.14, cur_z + 0.18, cur_z + 0.52, CERAMIC, OAK)
        if i < len(tiers) - 1:
            _greenery_bed(shell, foliage, _scale_ring(cap_out, cx, cy, 0.93), cur_z + 0.48, height=0.85, seed=seed + i)
        else:
            _greenery_bed(shell, foliage, _scale_ring(cap_out, cx, cy, 0.88), cur_z + 0.48, height=0.72, seed=seed + 9)
            _curved_wing_canopy(shell, metal, solar, warm, cx, cy, tw * 0.84, td * 0.82, cur_z + 2.45,
                                arch=1.45, cant=0.75, pitch=0.32 if seed % 2 else -0.32, foot_z=cur_z + 0.50)


def link(shell, glass, metal, foliage, cyan, warm, x, y1, y2, floor, width):
    """Graceful cambered aerodynamic skybridge joining (-50,26) and (-54,47) with green roof walk."""
    spans = 10
    long = y2 - y1
    pts = []
    for i in range(spans + 1):
        t = i / spans
        yy = y1 + long * t
        arch = 1.45 * math.sin(math.pi * t)
        xx = x + math.sin(math.pi * t) * (-0.8)
        pts.append((xx, yy, floor + arch))

    for i in range(spans):
        a, b = pts[i], pts[i + 1]
        mid = between(a, b, 0.5)
        seg_l = math.dist(a, b) + 0.15
        ang = math.atan2(b[1] - a[1], b[0] - a[0]) - math.pi / 2
        shell.box((mid[0], mid[1], mid[2] + 0.25), (width, seg_l, 0.55), CERAMIC, angle=ang)
        shell.box((mid[0], mid[1], mid[2] + 3.65), (width + 0.45, seg_l, 0.34), CERAMIC, angle=ang)
        cyan.box((mid[0], mid[1], mid[2] - 0.06), (0.36, seg_l, 0.08), "#bff7ff", angle=ang)
        warm.box((mid[0], mid[1], mid[2] + 3.44), (width * 0.45, seg_l * 0.8, 0.08), "#ffdca6", angle=ang)
        for side in (-1, 1):
            gx = mid[0] + math.cos(ang) * side * (width * 0.46)
            gy = mid[1] + math.sin(ang) * side * (width * 0.46)
            glass.box((gx, gy, mid[2] + 1.95), (0.14, seg_l, 2.85), GLASS_SKY if i % 3 else GLASS_WARM, angle=ang)
        if i % 2 == 1:
            ring_pts = []
            ca, sa = math.cos(ang), math.sin(ang)
            for s in range(13):
                theta = math.tau * s / 12
                lx = (width * 0.58) * math.cos(theta)
                lz = 2.0 + 2.15 * math.sin(theta)
                ring_pts.append((mid[0] + lx * ca, mid[1] + lx * sa, mid[2] + lz))
            metal.pipe(ring_pts, 0.12, METAL_CHAMP, 5)
        foliage.box((mid[0], mid[1], mid[2] + 4.00), (width * 0.48, seg_l * 0.92, 0.36), LEAF_B if i % 2 else LEAF_A, angle=ang)


def civic(shell, glass, metal, foliage, solar, warm, cyan, x, y, w, d, base, plinth_bot=None):
    """Coastal cultural reading pavilion: floating curved wing canopy, oak brise-soleil & panoramic glass."""
    plinth = wave_slab_ring(x, y, w + 3.0, d + 3.0, n=26, amp=0.16, phase=0.4)
    z_skirt = (base - 3.6) if plinth_bot is None else plinth_bot
    _bevel_slab(shell, plinth, _scale_ring(plinth, x, y, 0.89), z_skirt, base + 0.10, base + 0.42, CERAMIC_SOFT, CERAMIC)

    body = wave_slab_ring(x, y, w, d, n=26, amp=0.16, phase=0.4)
    _curtain_band(shell, glass, metal, body, _scale_ring(body, x, y, 0.94),
                  base + 0.42, base + 5.15, 0, int(abs(x + y)), 1.9, bay_wood=True)
    for p in body[::2]:
        vx, vy = p[0] - x, p[1] - y
        vl = math.hypot(vx, vy) or 1.0
        ox, oy = p[0] + vx / vl * 0.85, p[1] + vy / vl * 0.85
        shell.rod((ox, oy, base + 0.42), (ox - vx / vl * 0.22, oy - vy / vl * 0.22, base + 5.40), 0.14, OAK, 5)

    roof_rim = wave_slab_ring(x, y, w + 1.0, d + 1.0, n=26, amp=0.16, phase=0.4)
    _bevel_slab(shell, roof_rim, _scale_ring(roof_rim, x, y, 0.90), base + 5.10, base + 5.30, base + 5.52, CERAMIC, OAK)
    _curved_wing_canopy(shell, metal, solar, warm, x, y, w + 3.6, d + 3.2, base + 7.15, arch=1.65, cant=0.85, pitch=0.45, foot_z=base + 5.50)
    _greenery_bed(shell, foliage, _scale_ring(roof_rim, x, y, 0.94), base + 5.48, height=0.68, seed=int(abs(x)))
    cyan.box((x, y - d * 0.52, base + 5.30), (w * 0.46, 0.10, 0.08), "#bff7ff")


def waterfront_shelter(shell, metal, foliage, solar, warm, x, y, base):
    """Sculptural coastal wave-canopy shelter with timber benching and planted windbreak."""
    plinth = wave_slab_ring(x, y, 13.6, 6.4, n=24, amp=0.14)
    _bevel_slab(shell, plinth, _scale_ring(plinth, x, y, 0.91), base - 1.8, base + 0.16, base + 0.40, CERAMIC, OAK)
    _curved_wing_canopy(shell, metal, solar, warm, x, y, 13.8, 6.4, base + 3.60, arch=1.10, cant=0.50, pitch=0.0, foot_z=base + 0.38)
    for dx in (-3.2, 3.2):
        shell.box((x + dx, y + 1.15, base + 0.72), (4.4, 0.72, 0.22), OAK)
        shell.box((x + dx, y + 1.44, base + 1.12), (4.4, 0.12, 0.56), OAK)
    _greenery_bed(shell, foliage, wave_slab_ring(x, y - 2.25, 7.6, 1.3, n=16, amp=0.1), base + 0.38, height=0.62, seed=39)


def install(ground):
    shell = Batch()
    glass = Batch()
    metal = Batch()
    foliage = Batch()
    solar = Batch()
    cyan = Batch()
    warm = Batch()

    def g(x, y):
        return ground(x, y) - 0.13

    def g_min(x, y, w, d):
        pts = [(x + sx * w * 0.52, y + sy * d * 0.52) for sx in (-1, 0, 1) for sy in (-1, 0, 1)]
        return min(ground(px, py) for px, py in pts) - 1.6

    towers = [
        (-50, 26, 20, 15, 84, -5, 3.1, 0),
        (-54, 47, 15, 13, 65, 3, 2.8, 1),
        (-18, 24, 18, 13, 48, 3, 3.1, 2),
        (-73, 0, 17, 14, 58, 2.8, 3.3, 3),
    ]
    for x, y, w, d, h, lean, sp, var in towers:
        research(shell, glass, metal, foliage, solar, cyan, warm, x, y, w, d, h, lean, g(x, y), sp, var)

    link(shell, glass, metal, foliage, cyan, warm, -51, 31, 43, g(-50, 26) + 38, 3.8)

    for idx, (x, y, w, d, floors) in enumerate([
        (30, -8, 17, 14, (3, 2, 2)),
        (36, 15, 21, 16, (3, 2, 2, 1)),
        (14, 45, 20, 15, (2, 2, 2)),
        (-40, -26, 21, 13, (3, 2, 2)),
        (-105, 47, 19, 13, (2, 2, 1)),
        (-125, 53, 16, 12, (2, 1)),
        (38, 80, 19, 13, (2, 2)),
    ]):
        housing(shell, glass, metal, foliage, solar, warm, x, y, w, d, floors, g(x, y), seed=idx + 11, plinth_bot=g_min(x, y, w, d))

    for x, y, w, d in [(-17, -27, 16, 10), (-16, 47, 20, 12), (-128, 16, 17, 10)]:
        civic(shell, glass, metal, foliage, solar, warm, cyan, x, y, w, d, g(x, y), plinth_bot=g_min(x, y, w, d))

    waterfront_shelter(shell, metal, foliage, solar, warm, 39, -29, g(39, -29))

    shell.object("Coastal district structure and sunshades", _mat("Port ceramic, oak and aluminium", 0.66, 0.12))
    glass.object("Coastal district glazing", _mat("Coastal low emissivity glass", 0.31, 0.23))
    if metal.vertices:
        metal.object("Coastal district titanium structure", _mat("F_Metal", 0.38, 0.45))
    if foliage.vertices:
        foliage.object("Coastal district sky gardens", _mat("F_Foliage", 0.95))
    if solar.vertices:
        solar.object("Coastal district photovoltaic wings", _mat("F_Panel", 0.30, 0.35))
    if cyan.vertices:
        cyan.object("Coastal district twilight horizon trims", _mat("EmisCyan", 0.5))
    if warm.vertices:
        warm.object("Coastal district warm atrium coves", _mat("EmisWarm", 0.5))
