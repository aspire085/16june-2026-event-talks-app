import urllib.request
import xml.etree.ElementTree as ET

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
namespaces = {'atom': 'http://www.w3.org/2005/Atom'}

try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        
        # Get first entry
        entry = root.find('atom:entry', namespaces)
        if entry is not None:
            print(f"Entry children and contents:")
            for child in entry:
                # remove namespace prefix for cleaner logging
                tag_name = child.tag.split('}')[-1]
                print(f"- {tag_name}: attributes={child.attrib}, text_length={len(child.text or '')}")
                if tag_name in ['title', 'id', 'updated', 'published']:
                    print(f"  value: '{child.text.strip()}'")
                elif tag_name == 'content':
                    print(f"  value preview: '{child.text[:200].strip()}...'")
        else:
            print("No entry found")
        
except Exception as e:
    print(f"Error: {e}")
