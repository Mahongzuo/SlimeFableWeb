"""Exercise real browser mouse/touch gestures inside an isolated headless Chrome."""
import argparse
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright


async def verify(browser, base, mobile, photo):
    viewport = dict(width=390, height=844) if mobile else dict(width=1220, height=820)
    context = await browser.new_context(viewport=viewport, has_touch=mobile, is_mobile=mobile,
                                        device_scale_factor=2 if mobile else 1)
    await context.add_init_script("""Object.defineProperty(Element.prototype, 'requestPointerLock',
        {value: () => Promise.resolve()});
        localStorage.setItem('slimefable.web.save.v1', JSON.stringify({v:1, quality:'low'}));""")
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    cdp = await context.new_cdp_session(page)
    await page.goto(base.rstrip('/') + '/level.html?id=1123-match')
    await page.wait_for_function('window.__slime?.ready')
    await page.locator('[data-match-start]').click()
    await page.locator('[data-rules]').click()
    assert '虹彩' in await page.locator('dialog[open]').inner_text()
    await page.locator('[data-close-guide]').click()

    def cell(i):
        return page.locator(f'[data-cell="{i}"]')

    async def point(i):
        box = await cell(i).bounding_box()
        return [box['x'] + box['width']/2, box['y'] + box['height']/2]

    async def pointer(event, p=None):
        if mobile:
            points = [] if event in ('End', 'Cancel') else [dict(x=p[0], y=p[1], id=1)]
            await cdp.send('Input.dispatchTouchEvent', dict(type='touch' + event, touchPoints=points))
        elif event == 'Start':
            await page.mouse.move(*p)
            await page.mouse.down()
        elif event == 'Move':
            await page.mouse.move(*p)
        else:
            await page.mouse.up()

    async def state():
        return await page.evaluate('() => [__level.board.turn, __level.board.moves, __level.board.cells.join(",")]')

    async def ready():
        await page.wait_for_function("__level.phase === 'play'")

    # The studio has a notch at column 4 in its first row. Drag into it, then off the board.
    original = await state()
    for start, end in [(2, 3), (1, 0)]:
        a, b = await point(start), await point(end)
        if start == 1:
            a, b = b, [2*b[0]-a[0], b[1]]
        await pointer('Start', a)
        await pointer('Move', b)
        await pointer('End')
        await ready()
        assert await state() == original

    invalid = await page.evaluate("""() => {
        const v = __level.board.cells;
        for (let i=0; i<64; i++) for (const j of [i+1,i+8]){
            if (j < 64 && (j===i+8 || (j>>3)===(i>>3)) &&
                v[i]>=0 && v[i]<6 && v[i]===v[j]) return [i,j];
        }
    }""")
    assert invalid, 'Expected adjacent plain pieces of the same colour on the fixed board'
    await pointer('Start', await point(invalid[0]))
    await pointer('Move', await point(invalid[1]))
    await pointer('End')
    await ready()
    assert await state() == original

    pair = await page.evaluate('() => __level.hint()')
    await page.locator('[data-match-hint]').click()
    highlighted = await page.locator('.ml-cell.suggest').evaluate_all(
        '(cells) => cells.map(cell => Number(cell.dataset.cell))')
    assert sorted(highlighted) == sorted(pair)
    assert await state() == original
    a, b = [await point(i) for i in pair]
    middle = [x + .43*(y-x) for x,y in zip(a,b)]
    stride = max(abs(x-y) for x,y in zip(a,b))
    await pointer('Start', a)
    await pointer('Move', [a[0]+stride*.58, a[1]+stride*.58])
    await pointer('End')
    assert await state() == original
    if mobile:
        await pointer('Start', a)
        await pointer('Move', middle)
        await pointer('Cancel')
        assert await state() == original
        assert await page.locator('[data-dragging]').count() == 0
        await pointer('Start', a)
        await cdp.send('Input.dispatchTouchEvent', dict(type='touchStart', touchPoints=[
            dict(x=a[0], y=a[1], id=1), dict(x=b[0], y=b[1], id=2)]))
        await pointer('End')
        assert await state() == original
        assert await page.locator('[data-dragging]').count() == 0
    else:
        await pointer('Start', a)
        await pointer('Move', middle)
        await page.locator('[data-match-hint]').focus()
        await pointer('End')
        assert await state() == original
        assert await page.locator('[data-dragging]').count() == 0

    await pointer('Start', a)
    ink = cell(pair[0]).locator('.ml-jelly')
    initial_box = await ink.bounding_box()
    await pointer('Move', middle)
    await page.locator('[data-dragging]').first.wait_for()
    assert await page.locator('[data-drag-preview]').count() >= 1
    moving_box = await ink.bounding_box()
    assert max(abs(moving_box[k]-initial_box[k]) for k in ('x','y')) > stride*.22
    assert await state() == original
    await pointer('Move', b)
    await pointer('End')
    await ready()
    updated = await state()
    assert updated[:2] == [original[0]+1, original[1]-1], (original[:2], updated[:2])
    assert await page.locator('[data-dragging],[data-drag-preview]').count() == 0
    assert await page.evaluate('scrollX === 0 && scrollY === 0')

    # Two discrete taps/clicks still make one move and cannot duplicate a drag.
    pair = await page.evaluate('() => __level.hint()')
    for i in pair:
        await (cell(i).tap() if mobile else cell(i).click())
    await page.wait_for_function("['play','finale'].includes(__level.phase)")
    assert (await state())[:2] == [original[0]+2, original[1]-2]
    if not mobile:
        for i, key in zip(await page.evaluate('() => __level.hint()'), ['Enter','Space']):
            await cell(i).press(key)
        await page.wait_for_function("['play','finale'].includes(__level.phase)")
        assert (await state())[0] == original[0]+3

    # Fixed practice board: a downward swap earns a five-in-line, then spend the rainbow.
    await page.goto(base.rstrip('/') + '/level.html?id=0101-match&practice=prism-26')
    await page.wait_for_function('window.__slime?.ready')
    await page.locator('[data-match-start]').click()
    if mobile:
        title = await page.locator('.ml-top h1').bounding_box()
        caption = await page.locator('.ml-caption h2').bounding_box()
        assert title['y']+title['height'] <= caption['y'], 'Mobile title overlaps its caption'
        assert await page.locator('.ml-actions button').evaluate_all(
            "buttons=>buttons.every(b=>b.clientHeight<46 && b.scrollWidth<=b.clientWidth+1)")
    await pointer('Start', await point(45))
    await pointer('Move', await point(53))
    await pointer('End')
    await ready()
    assert await cell(53).get_attribute('data-special') == 'rainbow'
    a, b = await point(53), await point(52)
    await pointer('Start', a)
    await pointer('Move', [x + .43*(y-x) for x,y in zip(a,b)])
    await page.locator('[data-drag-preview]').first.wait_for()
    if mobile and photo:
        await page.screenshot(path=photo, type='jpeg', quality=89)
    await pointer('Move', b)
    await pointer('End')
    await ready()
    assert (await state())[0] == 2
    assert await cell(53).get_attribute('data-special') != 'rainbow'
    assert not errors, errors
    print('PASS', 'touch 390x844' if mobile else 'mouse 1220x820',
          'preview, drag, tap, boundaries, invalid swap, earned rainbow and activated it', flush=True)
    await context.close()


async def main(base, photo):
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader'])
        for mobile in (False, True):
            await verify(browser, base, mobile, photo)
        await browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='http://127.0.0.1:5190/')
    parser.add_argument('--photo', type=Path)
    args = parser.parse_args()
    asyncio.run(main(args.base, args.photo))
