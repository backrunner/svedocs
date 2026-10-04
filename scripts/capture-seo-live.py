"""Read-only live snapshot. Run the static SEO audit first to select all site routes."""
import concurrent.futures
import datetime
import json
from html.parser import HTMLParser
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

root = Path(__file__).resolve().parent.parent
baseline = json.loads((root / "artifacts/seo-audit.json").read_text())
origin = urllib.parse.urlsplit(baseline["pages"][0]["canonical"][0])
origin = f"{origin.scheme}://{origin.netloc}"
directory = root / "artifacts/seo-live-input"
directory.mkdir(parents=True, exist_ok=True)


class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == "meta" and attributes.get("property") == "og:image":
            self.urls.append(attributes["content"])


def fetch(task):
    url, file, route = task
    redirects = []

    class Redirects(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, request, response, code, message, headers, new_url):
            redirects.append({"status": code, "location": new_url})
            return super().redirect_request(request, response, code, message, headers, new_url)

    entry = {"url": url, "file": file, **({"route": route} if route else {})}
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Googlebot", "Accept": "text/html,application/xml,*/*"})
        try:
            response = urllib.request.build_opener(Redirects()).open(request, timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            body = response.read()
            (directory / file).write_bytes(body)
            entry.update(status=response.status, finalUrl=response.url, redirects=redirects,
                         contentType=response.headers.get("content-type", ""),
                         cacheControl=response.headers.get("cache-control", ""),
                         robotsHeader=response.headers.get("x-robots-tag", ""))
            if route:
                parser = Images()
                parser.feed(body.decode("utf-8"))
                entry["images"] = parser.urls
    except Exception as error:
        entry["error"] = str(error)
    return entry


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    pages = list(pool.map(fetch, [(origin + page["route"], f"page-{index}.html", page["route"])
                                 for index, page in enumerate(baseline["pages"])]))
    image_urls = sorted({url for page in pages for url in page.pop("images", [])})
    images = list(pool.map(fetch, [(url, f"image-{index}.png", None) for index, url in enumerate(image_urls)]))
    endpoints = list(pool.map(fetch, [(f"{origin}/{name}", name, None)
                                     for name in ["robots.txt", "sitemap.xml", "feed.xml", "llms.txt", "llms-full.txt"]]))
    paths = ["/docs/seo-audit-missing", "/docs/zh/seo-audit-missing",
             "/docs/integrations/seo-og/", "/docs/zh/integrations/seo-og/"]
    probes = list(pool.map(fetch, [(origin + route, f"probe-{index}.html", None) for index, route in enumerate(paths)]))

snapshot = {"origin": origin, "capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "pages": pages, "images": images, "endpoints": endpoints, "probes": probes}
(directory / "index.json").write_text(json.dumps(snapshot, indent=2) + "\n")
failures = [entry for entry in pages + images + endpoints + probes if "error" in entry]
print(json.dumps({"pages": len(pages), "images": len(images), "failures": failures}, indent=2))
if failures:
    raise SystemExit(1)
