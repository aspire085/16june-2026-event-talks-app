import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

# In-memory cache for release notes
# Cache format: { "timestamp": float, "data": list }
_cache = {
    "timestamp": 0.0,
    "data": None
}
CACHE_DURATION_SEC = 3600  # Cache for 1 hour by default

def fetch_and_parse_feed():
    """Fetches the Atom feed and parses it into a list of dictionaries."""
    req = urllib.request.Request(FEED_URL, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('atom:entry', namespaces):
        # Extract title
        title_el = entry.find('atom:title', namespaces)
        title = title_el.text.strip() if title_el is not None and title_el.text else ""
        
        # Extract ID
        id_el = entry.find('atom:id', namespaces)
        entry_id = id_el.text.strip() if id_el is not None and id_el.text else ""
        
        # Extract updated timestamp
        updated_el = entry.find('atom:updated', namespaces)
        updated = updated_el.text.strip() if updated_el is not None and updated_el.text else ""
        
        # Extract link
        link_el = entry.find('atom:link', namespaces)
        link = ""
        if link_el is not None:
            link = link_el.attrib.get('href', '')
            
        # Extract content (HTML)
        content_el = entry.find('atom:content', namespaces)
        content = content_el.text if content_el is not None and content_el.text else ""
        
        entries.append({
            "id": entry_id,
            "title": title,
            "updated": updated,
            "link": link,
            "content": content
        })
        
    return entries

def get_release_notes(force_refresh=False):
    """Retrieves release notes from cache or fetches them if expired/forced."""
    now = time.time()
    
    if force_refresh or _cache["data"] is None or (now - _cache["timestamp"] > CACHE_DURATION_SEC):
        print(f"Fetching fresh data... (force_refresh={force_refresh})")
        try:
            data = fetch_and_parse_feed()
            _cache["data"] = data
            _cache["timestamp"] = now
        except Exception as e:
            # If fetch fails and we have cached data, fall back to cache
            print(f"Error fetching feed: {e}")
            if _cache["data"] is not None:
                print("Falling back to cached data.")
                return _cache["data"], True  # Data, is_fallback=True
            raise e
            
    return _cache["data"], False

@app.route('/')
def index():
    """Serves the main frontend page."""
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    """API endpoint to get release notes."""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, is_fallback = get_release_notes(force_refresh)
        return jsonify({
            "success": True,
            "data": data,
            "cached_at": _cache["timestamp"],
            "fallback": is_fallback
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Run on localhost:5000
    app.run(debug=True, host='127.0.0.1', port=5000)
