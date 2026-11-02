"""Draws the Huddle Duel icon and launch screen and writes every size the
iOS and Android projects need into assets/generated/. Run: python3 scripts/make-icons.py"""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'generated')
os.makedirs(OUT, exist_ok=True)

NAVY_TOP = (22, 36, 60)
NAVY_BOT = (9, 15, 26)
BULB = (255, 181, 71)
TURF = (46, 122, 60)
TURF2 = (40, 108, 53)
LEATHER = (139, 74, 34)
LEATHER_DK = (84, 40, 14)
CHALK = (238, 241, 234)
PIP = (22, 32, 46)
SS = 4  # supersampling


def gradient(size, top, bot):
    w, h = size
    g = Image.new('RGB', (1, h))
    for y in range(h):
        t = y / (h - 1)
        g.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return g.resize((w, h))


def draw_emblem(S, with_turf=True):
    """Return an RGBA emblem of size S x S (transparent background)."""
    W = S * SS
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    if with_turf:
        # turf band with yard stripes and chalk lines, lower third
        top = int(W * .66)
        for i in range(12):
            x0 = int(W * i / 12)
            d.rectangle([x0, top, int(W * (i + 1) / 12), W], fill=TURF if i % 2 else TURF2)
        for i in range(1, 6):
            x = int(W * i / 6)
            d.line([(x, top), (x, W)], fill=CHALK + (150,), width=int(W * .006))
        d.line([(0, top), (W, top)], fill=CHALK, width=int(W * .012))

    # amber glow behind the ball
    glow = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    r = W * .34
    gd.ellipse([W * .5 - r, W * .43 - r, W * .5 + r, W * .43 + r], fill=BULB + (120,))
    glow = glow.filter(ImageFilter.GaussianBlur(W * .07))
    im = Image.alpha_composite(im, glow)

    # football, tilted
    ball = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    bd = ImageDraw.Draw(ball)
    bw, bh = W * .62, W * .36
    cx, cy = W * .5, W * .45
    # pointed football silhouette: intersection of two big circles
    pts = []
    for t in range(0, 361, 2):
        a = math.radians(t)
        x = math.cos(a) * bw / 2
        y = math.sin(a) * bh / 2 * (abs(math.cos(a)) ** .0) * (1 - .18 * abs(math.cos(a)) ** 6)
        pts.append((cx + x, cy + y))
    bd.polygon(pts, fill=LEATHER_DK)
    inner = [(cx + (x - cx) * .955, cy + (y - cy) * .9) for x, y in pts]
    bd.polygon(inner, fill=LEATHER)
    # highlight
    hl = [(cx + (x - cx) * .7, cy - bh * .12 + (y - cy) * .38) for x, y in pts]
    bd.polygon(hl, fill=(170, 98, 52))
    # end stripes
    for side in (-1, 1):
        x = cx + side * bw * .31
        bd.line([(x - side * W * .015, cy - bh * .36), (x + side * W * .015, cy + bh * .36)], fill=CHALK, width=int(W * .022))
    # laces
    bd.line([(cx - bw * .17, cy - bh * .05), (cx + bw * .17, cy - bh * .05)], fill=CHALK, width=int(W * .02))
    for i in range(-3, 4):
        x = cx + i * bw * .05
        bd.line([(x, cy - bh * .15), (x, cy + bh * .05)], fill=CHALK, width=int(W * .018))
    ball = ball.rotate(28, resample=Image.BICUBIC, center=(cx, cy))
    shadow = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 140), mask=ball.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(W * .02))
    im = Image.alpha_composite(im, shadow.transform((W, W), Image.AFFINE, (1, 0, -W * .015, 0, 1, -W * .025)))
    im = Image.alpha_composite(im, ball)

    # two dice, bottom right, overlapping the turf
    def die(center, size, angle, n):
        D = Image.new('RGBA', (W, W), (0, 0, 0, 0))
        dd = ImageDraw.Draw(D)
        x, y = center
        s = size / 2
        dd.rounded_rectangle([x - s, y - s + size * .07, x + s, y + s + size * .07], radius=size * .2, fill=(150, 160, 160))
        dd.rounded_rectangle([x - s, y - s, x + s, y + s], radius=size * .2, fill=CHALK)
        spots = {1: [(0, 0)], 3: [(-1, -1), (0, 0), (1, 1)], 5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)], 6: [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)], 4: [(-1, -1), (1, -1), (-1, 1), (1, 1)]}[n]
        pr = size * .085
        for gx, gy in spots:
            px, py = x + gx * size * .26, y + gy * size * .26
            dd.ellipse([px - pr, py - pr, px + pr, py + pr], fill=PIP)
        D = D.rotate(angle, resample=Image.BICUBIC, center=center)
        sh = Image.new('RGBA', (W, W), (0, 0, 0, 0))
        sh.paste((0, 0, 0, 120), mask=D.split()[3])
        sh = sh.filter(ImageFilter.GaussianBlur(W * .012))
        return Image.alpha_composite(sh.transform((W, W), Image.AFFINE, (1, 0, -W * .01, 0, 1, -W * .015)), D)

    im = Image.alpha_composite(im, die((W * .30, W * .76), W * .2, -14, 6))
    im = Image.alpha_composite(im, die((W * .70, W * .74), W * .2, 12, 6))
    return im.resize((S, S), Image.LANCZOS)


def full_icon(S):
    bg = gradient((S, S), NAVY_TOP, NAVY_BOT).convert('RGBA')
    return Image.alpha_composite(bg, draw_emblem(S)).convert('RGB')


def save(img, *parts):
    p = os.path.join(OUT, *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p, optimize=True)
    return p


# iOS: one 1024px icon (no transparency allowed)
master = full_icon(1024)
save(master, 'ios', 'AppIcon-512@2x.png')
save(master, 'icon-1024.png')
save(master.resize((512, 512), Image.LANCZOS), 'play-store-icon-512.png')

# Android legacy + round + adaptive foreground
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
fg_master = draw_emblem(1024, with_turf=False)
for name, k in DENS.items():
    s = int(48 * k)
    ic = full_icon(s * 2).resize((s, s), Image.LANCZOS)
    save(ic, 'android', f'mipmap-{name}', 'ic_launcher.png')
    mask = Image.new('L', (s * 4, s * 4), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, s * 4 - 1, s * 4 - 1], fill=255)
    rnd = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    rnd.paste(ic, mask=mask.resize((s, s), Image.LANCZOS))
    save(rnd, 'android', f'mipmap-{name}', 'ic_launcher_round.png')
    # adaptive foreground: 108dp canvas, art inside the central 66dp safe zone
    fs = int(108 * k)
    canvas = Image.new('RGBA', (fs, fs), (0, 0, 0, 0))
    art = fg_master.resize((int(fs * .72), int(fs * .72)), Image.LANCZOS)
    canvas.alpha_composite(art, ((fs - art.width) // 2, (fs - art.height) // 2))
    save(canvas, 'android', f'mipmap-{name}', 'ic_launcher_foreground.png')

# Launch screen: emblem + wordmark on navy
def splash(S):
    bg = gradient((S, S), NAVY_TOP, NAVY_BOT).convert('RGBA')
    e = draw_emblem(int(S * .26), with_turf=False)
    bg.alpha_composite(e, ((S - e.width) // 2, int(S * .36)))
    d = ImageDraw.Draw(bg)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', int(S * .045))
    except OSError:
        f = ImageFont.load_default()
    txt = 'HUDDLE DUEL'
    tw = d.textlength(txt, font=f)
    d.text(((S - tw) / 2, S * .36 + e.height + S * .02), txt, font=f, fill=BULB)
    return bg.convert('RGB')

sp = splash(2732)
save(sp, 'splash-2732.png')
save(sp, 'ios', 'splash-2732x2732.png')

# Android legacy splash drawables (Android 12+ shows the icon on the background color)
def crop_to(img, w, h):
    s = max(w / img.width, h / img.height)
    r = img.resize((int(img.width * s + .5), int(img.height * s + .5)), Image.LANCZOS)
    l, t = (r.width - w) // 2, (r.height - h) // 2
    return r.crop((l, t, l + w, t + h))

ANDROID_SPLASH = {'drawable': (480, 320)}
for name, (w, h) in {'mdpi': (320, 480), 'hdpi': (480, 800), 'xhdpi': (720, 1280), 'xxhdpi': (960, 1600), 'xxxhdpi': (1280, 1920)}.items():
    ANDROID_SPLASH[f'drawable-port-{name}'] = (w, h)
    ANDROID_SPLASH[f'drawable-land-{name}'] = (h, w)
for folder, (w, h) in ANDROID_SPLASH.items():
    save(crop_to(sp, w, h), 'android', folder, 'splash.png')
save(sp.resize((1024, 1024), Image.LANCZOS), 'splash-preview.png')
print('done:', OUT)
