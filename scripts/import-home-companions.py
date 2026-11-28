"""Download the author's CC BY 4.0 glTFs; validate before installing each file."""
import concurrent.futures
import json
import struct
import time
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public/models/companions"
GROUPS = {
    "cats": "orange-tabby", "dogs": "golden-retriever",
    "chickens-ducks-and-geese": "chick duckling hen pekin-duck",
    "rabbits-mice-and-squirrels": "lop-eared-rabbit hamster guinea-pig hedgehog chipmunk",
    "parrots-and-tropical-birds": "budgerigar", "animals": "bear",
    "deer-elk-and-moose": "bull-moose", "eagles-hawks-and-owls": "great-horned-owl golden-eagle",
    "wildlife": "zebra", "safari-animals": "thomsons-gazelle warthog",
    "water-birds": "grey-heron great-crested-grebe mute-swan", "birds": "house-sparrow",
    "farm-animals": "goat", "conifers": "redwood-tree", "grass-and-ground-cover": "reeds cattails moss-patch grass-tuft tall-grass meadow-patch",
}
def download(entry):
    group, slug = entry
    path = OUT / (slug + ".glb")
    for attempt in range(6):
        try:
            host = ["models.vinish.dev", "vinish-models.pages.dev"][attempt % 2]
            data = path.read_bytes() if path.exists() else subprocess.check_output(
                ["curl.exe","-fsSL","--max-time","65",f"https://{host}/{group}/{slug}.glb"])
            assert data[:4] == b"glTF" and len(data) == struct.unpack_from("<I", data, 8)[0]
            doc = json.loads(data[20:20+struct.unpack_from("<I", data, 12)[0]])
            clips = [a.get("name") for a in doc.get("animations", [])]
            assert clips or group in ("conifers", "grass-and-ground-cover")
            if not path.exists():
                path.write_bytes(data)
            if clips and not (OUT / (slug + ".webp")).exists():
                cover = subprocess.check_output(["curl.exe","-fsSL","--max-time","35",f"https://{host}/{group}/{slug}.webp"])
                assert cover[:4] == b"RIFF"
                (OUT / (slug + ".webp")).write_bytes(cover)
            print(slug, len(data), clips, flush=True)
            return
        except Exception as error:
            if attempt == 5:
                raise RuntimeError(slug) from error
            time.sleep(1 + attempt)
if __name__ == "__main__":
    OUT.mkdir(exist_ok=True, parents=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(download, [(g, s) for g, slugs in GROUPS.items() for s in slugs.split()]))

