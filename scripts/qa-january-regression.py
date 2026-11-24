"""Replay the previously shipped modes, keeping their historical evidence intact."""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
parser.add_argument('mode',choices=['defense','fleet','field'])
opt=parser.parse_args()
files={
    'defense':('qa-defense-play.py',['--rate','5']),
}
if opt.mode in ('fleet','field'):
    script=Path(__file__).with_name(f'qa-january-legacy-{opt.mode}.py')
    subprocess.run([sys.executable,'-u',str(script),'--base',opt.base],check=True)
    sys.exit()
name,extra=files[opt.mode]
with tempfile.TemporaryDirectory(prefix='slime-january-qa-') as scratch:
    root=Path(scratch)
    (root/'qa'/'evidence').mkdir(parents=True)
    (root/'scripts').mkdir()
    script=root/'scripts'/name
    shutil.copyfile(Path(__file__).with_name(name),script)
    subprocess.run([sys.executable,'-u',str(script),'--base',opt.base,*extra],check=True)
