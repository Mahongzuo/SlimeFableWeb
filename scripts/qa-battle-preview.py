"""Run both October 21 campaigns through the production entry points."""
import argparse
import subprocess
import sys
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:5190')
args=parser.parse_args()
for suite in ('qa-battle-fleet-play.py','qa-battle-rpg-campaign.py'):
    subprocess.run([sys.executable,str(Path(__file__).with_name(suite)),'--base',args.base],check=True)
