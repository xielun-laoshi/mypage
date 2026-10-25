"""Builds the site's web fonts from the upstream variable TTFs.

Each font is cut down to the axis ranges the site uses and to Latin-1 plus
typographic punctuation, then saved as WOFF2. Mona Sans and Monaspace reserve
their names under the OFL, so their modified (subset) versions are renamed;
copyright and license records are kept.

Requires fontTools and brotli:  pip install fonttools brotli
Usage:  python build.py <MonaSans[wdth,wght].ttf> <Newsreader[opsz,wght].ttf>
                        <Monaspace Neon Var.ttf>
Sources: github.com/github/mona-sans, github.com/productiontype/Newsreader,
         github.com/githubnext/monaspace (see the OFL-*.txt files here).
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUT = Path(__file__).parent

CHARS = (
    [*range(0x20, 0x7F), *range(0xA0, 0x100)]
    + [0x131, 0x152, 0x153, 0x160, 0x161, 0x178, 0x17D, 0x17E, 0x192, 0x2C6, 0x2DC]
    + [*range(0x2010, 0x2016), *range(0x2018, 0x201F), 0x2020, 0x2021, 0x2022, 0x2026,
       0x2030, 0x2032, 0x2033, 0x2039, 0x203A, 0x20AC, 0x2116, 0x2122]
    + [*range(0x2190, 0x219A), 0x2212, 0x221E, 0x2248, 0x2260, 0x2264, 0x2265]
)

FONTS = [
    # (source arg index, output file, axis limits, new family name or None)
    (0, "SYDisplay.woff2", {"wdth": (100, 125), "wght": (200, 600)}, "SY Display"),
    (1, "Newsreader.woff2", {"opsz": 16, "wght": (300, 500)}, None),
    (2, "SYMono.woff2", {"wdth": 100, "slnt": 0, "wght": (400, 600)}, "SY Mono"),
]


def rename(font, family):
    """Replace every name record that carries the (reserved) family name."""
    postscript = family.replace(" ", "")
    name = font["name"]
    for record in name.names:
        if record.nameID in (1, 16):
            record.string = family
        elif record.nameID in (3, 4):
            record.string = f"{family} {name.getDebugName(17) or name.getDebugName(2) or 'Regular'}"
        elif record.nameID in (6, 25):
            record.string = postscript


def build(src, out, limits, family):
    # Subset before instancing: the other order trips a fontTools KeyError on
    # Monaspace's contextual-alternate glyphs.
    font = TTFont(src)
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=CHARS)
    subsetter.subset(font)
    font = instantiateVariableFont(font, limits)
    if family:
        rename(font, family)
    font.flavor = "woff2"
    font.save(OUT / out)
    print(f"{out}: {(OUT / out).stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    for index, out, limits, family in FONTS:
        build(sys.argv[1 + index], out, limits, family)
