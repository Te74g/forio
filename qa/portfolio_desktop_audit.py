import argparse
import json
from pathlib import Path

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


def run_page(page, base_url, output_dir, label):
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.goto(base_url + '/', wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(5000)
    settle(page)
    expected = ['hero', 'profile', 'poster-examples', 'section2', 'section3', 'section4']
    progression = [page.locator('.deck-panel.is-active').first.get_attribute('id')]
    for next_id in expected[1:]:
        active = page.locator('.deck-panel.is-active').first
        active.evaluate('e=>e.scrollTop=e.scrollHeight')
        page.wait_for_timeout(300)
        active.evaluate('e=>e.scrollTop=e.scrollHeight')
        page.keyboard.press('ArrowDown')
        page.wait_for_timeout(900)
        settle(page)
        progression.append(page.locator('.deck-panel.is-active').first.get_attribute('id'))
    cases = [
        ('.js-aboutModalOpen', '.aboutModal', '.js-aboutModalClose', False),
        ('.js-favoriteItemModalOpen', '.favoriteItemModal', '.js-favoriteItemModalClose', False),
        ('.js-commentOpen[data-comment="profile"]', '#comment-profile', '.js-commentClose', True),
        ('.js-commentOpen[data-comment="works"]', '#comment-works', '.js-commentClose', False),
        ('.js-aniameModalOpen', '.aniameModal', '.js-aniameModalClose', False),
        ('.js-graphicModalOpen', '.graphicModal', '.js-graphicModalClose', False),
        ('.js-photoModalOpen', '.photoModal', '.js-photoModalClose', False),
    ]
    page.keyboard.press('Home')
    page.wait_for_timeout(700)
    page.keyboard.press('ArrowDown')
    page.wait_for_timeout(700)
    settle(page)
    modals = []
    for opener_sel, modal_sel, close_sel, skip_scroll in cases:
        entry = {'modal': modal_sel, 'opened': False, 'closed': False, 'wheelScrolled': True, 'error': ''}
        try:
            opener = page.locator(opener_sel).first
            opener.scroll_into_view_if_needed(timeout=5000)
            opener.click(force=True, timeout=5000)
            page.wait_for_timeout(150)
            modal = page.locator(modal_sel).first
            entry['opened'] = modal.evaluate("e=>e.classList.contains('is-open')")
            panel = modal.locator('[class$="Modal__panel"]').first
            if panel.count() and not skip_scroll:
                before = panel.evaluate('e=>e.scrollTop')
                panel.hover(force=True)
                page.mouse.wheel(0, 600)
                page.wait_for_timeout(150)
                dims = panel.evaluate('e=>({top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight})')
                entry['wheelScrolled'] = dims['total'] <= dims['height'] + 2 or dims['top'] > before
            modal.locator('button' + close_sel).first.click(force=True, timeout=5000)
            page.wait_for_timeout(150)
            entry['closed'] = not modal.evaluate("e=>e.classList.contains('is-open')")
        except Exception as exc:
            entry['error'] = str(exc)
        modals.append(entry)
    page.keyboard.press('Home')
    page.wait_for_timeout(700)
    settle(page)
    shot = output_dir / f'{label}.png'
    page.screenshot(path=str(shot))
    return {
        'url': page.url,
        'progression': progression,
        'expectedProgression': expected,
        'modals': modals,
        'pageErrors': errors,
        'documentWidth': page.evaluate("({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})"),
        'screenshot': str(shot),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8899')
    parser.add_argument('--output-dir', default='qa/results/desktop')
    parser.add_argument('--strict', action='store_true')
    args = parser.parse_args()
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    results = {}
    with sync_playwright() as p:
        for name, engine in [('chromium', p.chromium), ('webkit', p.webkit)]:
            browser = engine.launch(headless=True)
            context = browser.new_context(viewport={'width': 1440, 'height': 900})
            results[name] = run_page(context.new_page(), args.base_url.rstrip('/'), out, name)
            context.close()
            browser.close()
    print(json.dumps(results, ensure_ascii=False, indent=2))
    (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    if args.strict:
        failures = []
        for engine, result in results.items():
            if result['progression'] != result['expectedProgression']:
                failures.append(f'{engine}: progression {result["progression"]}')
            for modal in result['modals']:
                if not modal['opened'] or not modal['closed'] or not modal['wheelScrolled'] or modal['error']:
                    failures.append(f'{engine}: modal {modal}')
            if result['pageErrors']:
                failures.append(f'{engine}: page errors {result["pageErrors"]}')
            if result['documentWidth']['scroll'] > result['documentWidth']['client']:
                failures.append(f'{engine}: horizontal overflow {result["documentWidth"]}')
        if failures:
            raise SystemExit('\n'.join(failures))


if __name__ == '__main__':
    main()
