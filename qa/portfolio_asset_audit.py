import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


def settle(page):
    page.evaluate("""()=>{
      document.body.classList.remove('is-cover-pending');
      var cover=document.querySelector('.Cover__Wrapper');
      if(cover)cover.classList.add('is-done');
      document.querySelectorAll('.sectionIntroVideo').forEach(function(e){
        e.classList.remove('is-visible');
        e.hidden=true;
        e.setAttribute('aria-hidden','true');
      });
    }""")


def inspect(page, base_url, output_dir, label):
    origin = urlparse(base_url).netloc
    errors = []
    local_failures = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.on('requestfailed', lambda request: local_failures.append({'url': request.url, 'error': request.failure}) if urlparse(request.url).netloc == origin else None)
    page.on('response', lambda response: local_failures.append({'url': response.url, 'status': response.status}) if urlparse(response.url).netloc == origin and response.status >= 400 else None)
    page.goto(base_url + '/', wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(7000)
    settle(page)
    expected = ['hero', 'profile', 'poster-examples', 'section2', 'section3', 'section4']
    progression = [page.locator('.deck-panel.is-active').first.get_attribute('id')]
    for next_id in expected[1:]:
        active = page.locator('.deck-panel.is-active').first
        active.evaluate('e=>e.scrollTop=e.scrollHeight')
        page.wait_for_timeout(400)
        active.evaluate('e=>e.scrollTop=e.scrollHeight')
        page.keyboard.press('ArrowDown')
        page.wait_for_timeout(1000)
        settle(page)
        progression.append(page.locator('.deck-panel.is-active').first.get_attribute('id'))
    page.wait_for_timeout(5000)
    broken_images = page.evaluate("""()=>Array.from(document.images).filter(function(img){
      return img.getAttribute('src') && img.complete && img.naturalWidth===0;
    }).map(function(img){return img.getAttribute('src');})""")
    videos = page.evaluate("""()=>Array.from(document.querySelectorAll('video')).map(function(video){
      return {className:video.className,readyState:video.readyState,networkState:video.networkState,currentSrc:video.currentSrc};
    })""")
    page.keyboard.press('Home')
    page.wait_for_timeout(900)
    settle(page)
    shot = output_dir / f'{label}.png'
    page.screenshot(path=str(shot))
    return {
        'url': page.url,
        'progression': progression,
        'expectedProgression': expected,
        'pageErrors': errors,
        'localFailures': local_failures,
        'brokenImages': broken_images,
        'videos': videos,
        'screenshot': str(shot),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8899')
    parser.add_argument('--output-dir', default='qa/results/assets')
    parser.add_argument('--strict', action='store_true')
    args = parser.parse_args()
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    results = {}
    with sync_playwright() as p:
        configs = [
            ('chromium_desktop', p.chromium, {'viewport': {'width': 1440, 'height': 900}}),
            ('webkit_desktop', p.webkit, {'viewport': {'width': 1440, 'height': 900}}),
            ('chromium_mobile', p.chromium, {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True}),
            ('webkit_mobile', p.webkit, {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True}),
        ]
        for label, engine, context_args in configs:
            browser = engine.launch(headless=True)
            context = browser.new_context(**context_args)
            results[label] = inspect(context.new_page(), args.base_url.rstrip('/'), out, label)
            context.close()
            browser.close()
    print(json.dumps(results, ensure_ascii=False, indent=2))
    (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    if args.strict:
        failures = []
        for label, result in results.items():
            if result['progression'] != result['expectedProgression']:
                failures.append(f'{label}: progression {result["progression"]}')
            if result['pageErrors']:
                failures.append(f'{label}: page errors {result["pageErrors"]}')
            if result['localFailures']:
                failures.append(f'{label}: local failures {result["localFailures"]}')
            if result['brokenImages']:
                failures.append(f'{label}: broken images {result["brokenImages"]}')
        if failures:
            raise SystemExit('\n'.join(failures))


if __name__ == '__main__':
    main()
