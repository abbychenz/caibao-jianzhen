"""
財富管家 - 個股新聞擷取模組

資料來源：Google 新聞 RSS（https://news.google.com/rss/search）。
完全免費、不需要 API 金鑰。根據 Google 官方 RSS feed 的版權聲明：
「僅供個人非商業用途的個人動態消息閱讀器使用」——這款財富管家是你
個人自用的工具，符合這個使用條件；如果之後想把這個功能做成多人使用
的公開服務，就需要另外評估是否要換成正式的新聞 API 授權。

用法：
    from news_client import fetch_news
    fetch_news("台積電")
"""

from __future__ import annotations

import time
import xml.etree.ElementTree as ET
from urllib.parse import quote

import requests

RSS_BASE_URL = "https://news.google.com/rss/search"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# 新聞更新頻繁但也不需要每次都重打，快取 15 分鐘
_cache: dict[str, dict] = {}
_CACHE_TTL_SECONDS = 900


def fetch_news(query: str, limit: int = 15) -> list[dict]:
    """
    查詢跟 query（通常是公司名稱，例如「台積電」）相關的新聞。
    回傳依時間新到舊排序的新聞清單：{title, link, pubDate, source}
    查詢失敗或查無資料時回傳空清單，不拋例外（新聞不是核心財務功能，不該讓整頁掛掉）。
    """
    cache_key = query
    now = time.time()
    cached = _cache.get(cache_key)
    if cached is not None and (now - cached["fetched_at"]) < _CACHE_TTL_SECONDS:
        return cached["items"][:limit]

    url = f"{RSS_BASE_URL}?q={quote(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
    except Exception:  # noqa: BLE001 - 新聞來源不穩定時，安靜地回傳空清單就好
        return []

    items = []
    for item in root.findall(".//item"):
        title_el = item.find("title")
        link_el = item.find("link")
        date_el = item.find("pubDate")
        source_el = item.find("source")

        raw_title = title_el.text if title_el is not None else ""
        source = source_el.text if source_el is not None else ""
        # Google News 的標題結尾會重複帶一次來源名稱（例如「... - news.cnyes.com」），
        # 這裡已經有獨立的 source 欄位了，把標題裡重複的部分去掉比較乾淨。
        title = raw_title
        if source and title.endswith(f" - {source}"):
            title = title[: -(len(source) + 3)]

        items.append(
            {
                "title": title,
                "link": link_el.text if link_el is not None else "",
                "pubDate": date_el.text if date_el is not None else "",
                "source": source,
            }
        )

    _cache[cache_key] = {"items": items, "fetched_at": now}
    return items[:limit]
