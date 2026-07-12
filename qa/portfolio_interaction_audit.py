import argparse
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright


def hide_transients(page):
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


def swipe_up(page):
    return page.evaluate("""()=>{
      var target=document.querySelector('.deck-panel.is-active')||document.body;
      function make(type,y){
        var touch;
        try{touch=new Touch({identifier:7,target:target,clientX:195,clientY:y});}
        catch(_){touch={identifier:7,target:target,clientX:195,clientY:y};}
        try{return new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[touch],changedTouches:[touch]});}
        catch(_){var ev=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(ev,'touches',{value:type==='touchend'?[]:[touch]});Object.defineProperty(ev,'changedTouches',{value:[touch]});return ev;}
      }
      target.dispatchEvent(make('touchstart',700));
      var move=make('touchmove',120);
      target.dispatchEvent(move);
      target.dispatchEvent(make('touchend',120));
      return move.defaultPrevented;
    }""")


def modal_cases(page):
    cases = [
        ('.js-aboutModalOpen', '.aboutModal', '.js-aboutModalClose'),
        ('.js-favoriteItemModalOpen', '.favoriteItemModal', '.js-favoriteItemModalClose'),
        ('.js-commentOpen[data-comment="profile"]', '#comment-profile', '.js-commentClose'),
        ('.js-commentOpen[data-comment="works"]', '#comment-works', '.js-commentClose'),
        ('.js-aniameModalOpen', '.aniameModal', '.js-aniameModalClose'),
        ('.js-graphicModalOpen', '.graphicModal', '.js-graphicModalClose'),
        ('.js-photoModalOpen', '.photoModal', '.js-photoModalClose'),
    ]
    results = []
    page.keyboard.press('Home')
    page.wait_for_timeout(700)
    page.keyboard.press('ArrowDown')
    page.wait_for_timeout(900)
    hide_transients(page)
    for opener_selector, modal_selector, close_selector in cases:
        opener = page.locator(opener_selector).first
        modal = page.locator(modal_selector).first
        opened = False
        closed = False
        error = ''
        try:
            opener.scroll_into_view_if_needed(timeout=5000)
            opener.tap(force=True, timeout=5000)
            page.wait_for_timeout(150)
            opened = modal.evaluate("e=>e.classList.contains('is-open')")
            if opened:
                close = modal.locator('button' + close_selector).first
                close.tap(force=True, timeout=5000)
                page.wait_for_timeout(150)
                closed = not modal.evaluate("e=>e.classList.contains('is-open')")
        except Exception as exc:
            error = str(exc)
        results.append({'opener': opener_selector, 'opened': opened, 'closed': closed, 'error': error})
    return results


def viewer_cases(page):
    results = []
    pairs = [
        ('.js-aniameModalOpen', '.aniameModal', '.js-aniameZoom', '.aniameModal__viewer', '.js-aniameZoomClose', '.js-aniameModalClose'),
        ('.js-graphicModalOpen', '.graphicModal', '.js-graphicZoom', '.graphicModal__viewer', '.js-graphicZoomClose', '.js-graphicModalClose'),
        ('.js-photoModalOpen', '.photoModal', '.js-photoZoom', '.photoModal__viewer', '.js-photoZoomClose', '.js-photoModalClose'),
    ]
    for open_sel, modal_sel, zoom_sel, viewer_sel, zoom_close_sel, modal_close_sel in pairs:
        entry = {'viewer': viewer_sel, 'opened': False, 'closed': False, 'error': ''}
        try:
            page.locator(open_sel).first.tap(force=True, timeout=5000)
            page.wait_for_timeout(100)
            modal = page.locator(modal_sel).first
            modal.locator(zoom_sel).first.tap(force=True, timeout=5000)
            page.wait_for_timeout(100)
            viewer = modal.locator(viewer_sel).first
            entry['opened'] = viewer.evaluate("e=>e.classList.contains('is-open')")
            modal.locator(zoom_close_sel).first.tap(force=True, timeout=5000)
            page.wait_for_timeout(100)
            entry['closed'] = not viewer.evaluate("e=>e.classList.contains('is-open')")
            modal.locator('button' + modal_close_sel).first.tap(force=True, timeout=5000)
        except Exception as exc:
            entry['error'] = str(exc)
        results.append(entry)
    return results


def inspect_page(page, base_url, output_dir, label):
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.route('**/fonts.googleapis.com/**', lambda route: route.abort())
    page.route('**/fonts.gstatic.com/**', lambda route: route.abort())
    def media_route(route):
        url = route.request.url.lower()
        allowed = ('coma-logo-01.png', '/06.png', 'vrchat-introduction-card.png')
        if any(name in url for name in allowed):
            route.continue_()
        else:
            route.abort()
    page.route(re.compile(r'.*\.(?:png|webp|gif|mp4|webm)(?:\?.*)?$', re.I), media_route)
    page.goto(base_url + '/', wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(4000)
    hide_transients(page)
    expected = ['hero', 'profile', 'poster-examples', 'section2', 'section3', 'section4']
    progression = [page.locator('.deck-panel.is-active').first.get_attribute('id')]
    for next_id in expected[1:]:
        active = page.locator('.deck-panel.is-active').first
        active.evaluate('e=>e.scrollTop=e.scrollHeight')
        swipe_up(page)
        page.wait_for_timeout(750)
        hide_transients(page)
        progression.append(page.locator('.deck-panel.is-active').first.get_attribute('id'))
    modals = modal_cases(page)
    viewers = viewer_cases(page)
    page.keyboard.press('Home')
    page.wait_for_timeout(700)
    hide_transients(page)
    shot = output_dir / f'{label}.png'
    page.screenshot(path=str(shot))
    legacy = page.context.new_page()
    legacy.goto(base_url + '/mobile/?mobile=1', wait_until='domcontentloaded', timeout=30000)
    legacy.wait_for_timeout(300)
    legacy_url = legacy.url
    legacy.close()
    return {
        'url': page.url,
        'legacyMobileUrl': legacy_url,
        'progression': progression,
        'expectedProgression': expected,
        'modals': modals,
        'viewers': viewers,
        'pageErrors': errors,
        'documentWidth': page.evaluate("({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})"),
        'screenshot': str(shot),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8899')
    parser.add_argument('--output-dir', default='qa/results/interactions')
    parser.add_argument('--strict', action='store_true')
    args = parser.parse_args()
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    results = {}
    with sync_playwright() as p:
        for name, engine in [('chromium', p.chromium), ('webkit', p.webkit)]:
            browser = engine.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 390, 'height': 844},
                is_mobile=True,
                has_touch=True,
                user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) '
                            'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'),
            )
            results[name] = inspect_page(context.new_page(), args.base_url.rstrip('/'), out, name)
            context.close()
            browser.close()
    print(json.dumps(results, ensure_ascii=False, indent=2))
    (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    if args.strict:
        failures = []
        for engine, result in results.items():
            if '/mobile/' in result['url'] or '/mobile/' in result['legacyMobileUrl']:
                failures.append(f'{engine}: separate mobile page is still active')
            if result['progression'] != result['expectedProgression']:
                failures.append(f'{engine}: progression {result["progression"]}')
            for modal in result['modals']:
                if not modal['opened'] or not modal['closed'] or modal['error']:
                    failures.append(f'{engine}: modal {modal}')
            for viewer in result['viewers']:
                if not viewer['opened'] or not viewer['closed'] or viewer['error']:
                    failures.append(f'{engine}: viewer {viewer}')
            if result['pageErrors']:
                failures.append(f'{engine}: page errors {result["pageErrors"]}')
            if result['documentWidth']['scroll'] > result['documentWidth']['client']:
                failures.append(f'{engine}: horizontal overflow {result["documentWidth"]}')
        if failures:
            raise SystemExit('\n'.join(failures))


if __name__ == '__main__':
    main()
