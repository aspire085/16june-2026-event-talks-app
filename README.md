# BQ Pulse — BigQuery Release Tracker

BQ Pulse is a premium, lightweight release notes dashboard for Google Cloud BigQuery. It aggregates, parses, categorizes, and displays Google's official release notes in an elegant, responsive interface with fast, in-memory caching and real-time frontend search.

---

## ⚡ Features

*   **Caching & Optimization:** Fetches the official Atom XML feed and caches it in memory for 1 hour, minimizing network load and ensuring instant page loads.
*   **Offline Fallback:** Automatically falls back to the previously cached release notes if the upstream Google feed is unreachable.
*   **Real-time Live Search:** Instantly filters release notes by keywords with debounced keystroke handling.
*   **Category Pills:** Automatically parses update content to classify updates into **Features**, **Fixes**, **Changes**, **Deprecations**, and **Security** announcements.
*   **Social & Copy Utilities:**
    *   One-click direct URL copy for any specific release card.
    *   Twitter (X) share intent integration.
    *   **Highlight-to-Tweet:** Highlighting text inside any release card spawns a floating bubble to tweet the selection automatically.
*   **Premium Visuals:** Modern dark dashboard UI featuring glassmorphism elements, staggered entry animations, and skeleton loading templates.

---

## 📁 Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask application backend (caching, feed parser, endpoints)
├── templates/
│   └── index.html          # Main HTML structure of the dashboard
└── static/
    ├── css/
    │   └── style.css       # Core layout styling, custom properties, and animations
    └── js/
        └── app.js          # Client-side state, API integration, filters, and sharing
```

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.8 or higher
*   `pip` (Python package installer)

### 1. Clone & Navigate
Navigate into your project folder:
```bash
cd bq-releases-notes
```

### 2. Set Up Virtual Environment (Recommended)
Create and activate a virtual environment:
```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
Install Flask:
```bash
pip install flask
```

### 4. Run the Application
Start the Flask dev server:
```bash
python app.py
```
The server will run on [http://127.0.0.1:5000](http://127.0.0.1:5000). Open this address in your web browser.

---

## ⚙️ How it Works Under the Hood

1.  **Backend Fetching:** The backend ([app.py](./app.py)) queries the BigQuery Atom feed. It parses the returned XML using standard library `xml.etree.ElementTree`, mapping Atom namespaces to extract the date, links, and content block.
2.  **In-Memory Cache:** The backend checks the age of the cached feed list. If it's less than 1 hour old, it returns cached records.
3.  **Dynamic Rendering:** The frontend script ([app.js](./static/js/app.js)) processes HTML contents and maps category tags (e.g., `<h3>feature</h3>`) to structured UI elements.
