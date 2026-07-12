import argparse
import hashlib
import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright


def measure(page, output_dir, label):
    page.wait_for_timeout(5000)
    page.evaluate("document.body.classList.remove('is-cover-pending')")
    page.evaluate("var c=document.querySelector('.Cover__Wrapper');if(c)c.classList.add('is-done')")
    modal = page.locator('.graphicModal').first
    panel = page.locator('.graphicModal__panel').first
    modal.evaluate("e=>{e.classList.add('is-open');e.setAttribute('aria-hidden','false')}")
    touch_result = panel.evaluate("""e=>{
      var touch;
      try { touch = new Touch({identifier:1,target:e,clientX:100,clientY:300}); }
      catch (_) { touch = {identifier:1,target:e,clientX:100,clientY:300}; }
      var ev;
      try { ev = new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[touch],changedTouches:[touch]}); }
      catch (_) { ev = new Event('touchmove',{bubbles:true,cancelable:true}); Object.defineProperty(ev,'touches',{value:[touch]}); }
      var dispatched=e.dispatchEvent(ev);
      return {dispatched:dispatched,defaultPrevented:ev.defaultPrevented};
    }""")
    dimensions = panel.evaluate("e=>({scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollTop:e.scrollTop,overflowY:getComputedStyle(e).overflowY,touchAction:getComputedStyle(e).touchAction})")
    panel.evaluate("e=>{e.scrollTop=900}")
    page.wait_for_timeout(100)
    after_wheel = panel.evaluate("e=>e.scrollTop")
    modal.evaluate("e=>{e.classList.remove('is-open');e.setAttribute('aria-hidden','true')}")
    active_before = page.locator('.deck-panel.is-active').first.get_attribute('id')
    page.keyboard.press('End')
    page.wait_for_timeout(700)
    active_after_end = page.locator('.deck-panel.is-active').first.get_attribute('id')
    page.keyboard.press('Home')
    page.wait_for_timeout(700)
    active_after_home = page.locator('.deck-panel.is-active').first.get_attribute('id')
    text = page.locator('body').inner_text()
    shot = output_dir / f'{label}.png'
    page.screenshot(path=str(shot), full_page=False)
    return {
        'url': page.url,
        'readyState': page.evaluate('document.readyState'),
        'touchMoveDefaultPrevented': touch_result['defaultPrevented'],
        'modal': dimensions,
        'modalScrollTopAfterWheel': after_wheel,
        'activeBefore': active_before,
        'activeAfterEnd': active_after_end,
        'activeAfterHome': active_after_home,
        'visibleTextSha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
        'screenshot': str(shot),
    }


def run(base_url, output_dir):
    results = {}
    with sync_playwright() as p:
        engines = {'chromium': p.chromium, 'webkit': p.webkit}
        for name, engine in engines.items():
            browser = engine.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 390, 'height': 844},
                device_scale_factor=1,
                is_mobile=True,
                has_touch=True,
                user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) '
                            'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'),
            )
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda exc: errors.append(str(exc)))
            page.route('**/fonts.googleapis.com/**', lambda route: route.abort())
            page.route('**/fonts.gstatic.com/**', lambda route: route.abort())
            page.route(re.compile(r'.*\.(?:png|webp|gif|mp4|webm)(?:\?.*)?$', re.I), lambda route: route.abort())
            page.goto(base_url + '/', wait_until='domcontentloaded', timeout=30000)
            results[name] = measure(page, output_dir, name)
            results[name]['pageErrors'] = errors
            context.close()
            browser.close()
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8765')
    parser.add_argument('--output-dir', default='qa/results')
    parser.add_argument('--strict', action='store_true')
    args = parser.parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    results = run(args.base_url.rstrip('/'), output_dir)
    print(json.dumps(results, ensure_ascii=False, indent=2))
    if args.strict:
        failures = []
        for engine, result in results.items():
            if '/mobile/' in result['url']:
                failures.append(f'{engine}: mobile redirect remains')
            if result['touchMoveDefaultPrevented']:
                failures.append(f'{engine}: modal touchmove is canceled')
            if result['modal']['scrollHeight'] > result['modal']['clientHeight'] + 2 and result['modalScrollTopAfterWheel'] <= 0:
                failures.append(f'{engine}: modal did not scroll')
            if result['activeAfterEnd'] == result['activeBefore']:
                failures.append(f'{engine}: deck did not move to end')
            if result['activeAfterHome'] != 'hero':
                failures.append(f'{engine}: deck did not return home')
            if result['pageErrors']:
                failures.append(f'{engine}: page errors: {result["pageErrors"]}')
        if failures:
            raise SystemExit('\n'.join(failures))


if __name__ == '__main__':
    main()
