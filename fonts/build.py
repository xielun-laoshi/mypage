"""Builds the site's web fonts from the upstream TTFs.

Lekton (a typewriter face drawn after Olivetti machines at ISIA Urbino) is
cut down to Latin-1 plus typographic punctuation and saved as WOFF2. Its
OFL declares no Reserved Font Name, so the subsets keep their name.

Requires fontTools and brotli:  pip install fonttools brotli
Usage:  python build.py <Lekton-Regular.ttf> <Lekton-Bold.ttf>
Source: github.com/google/fonts/tree/main/ofl/lekton (see OFL-Lekton.txt).
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

OUT = Path(__file__).parent

CHARS = (
    [*range(0x20, 0x7F), *range(0xA0, 0x100)]
    + [0x131, 0x152, 0x153, 0x160, 0x161, 0x178, 0x17D, 0x17E, 0x192, 0x2C6, 0x2DC]
    + [*range(0x2010, 0x2016), *range(0x2018, 0x201F), 0x2020, 0x2021, 0x2022, 0x2026,
       0x2030, 0x2032, 0x2033, 0x2039, 0x203A, 0x20AC, 0x2116, 0x2122]
)

FONTS = ["Lekton-Regular.woff2", "Lekton-Bold.woff2"]


def build(src, out):
    font = TTFont(src)
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=CHARS)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(OUT / out)
    print(f"{out}: {(OUT / out).stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    for index, out in enumerate(FONTS):
        build(sys.argv[1 + index], out)
