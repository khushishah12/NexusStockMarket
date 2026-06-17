import json, io, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from regime_predict import main
sys.stdin = io.StringIO(json.dumps({"symbols": ["RELIANCE.NS", "TCS.NS"]}))
main()
