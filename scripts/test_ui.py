import os
import sys
from playwright.sync_api import sync_playwright

scratch_dir = os.environ.get('DELTA_SCRATCH_DIR', '/tmp')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 1. Desktop Test: Initial Board
    context = browser.new_context(viewport={'width': 1280, 'height': 850})
    page = context.new_page()
    page.goto('http://localhost:5199')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)

    page.screenshot(path=os.path.join(scratch_dir, 'desktop_home.png'), full_page=True)
    print("Desktop screenshot captured.")

    # 2. Test Rules Modal
    page.click('button:has-text("Rules")')
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(scratch_dir, 'rules_modal.png'))
    print("Rules modal screenshot captured.")
    # Click close on rules modal
    page.locator('.fixed button[aria-label="Close"]').click()
    page.wait_for_timeout(400)

    # 3. Test Hint
    page.locator('footer button:has-text("Hint")').click()
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(scratch_dir, 'hint_displayed.png'))
    print("Hint screenshot captured.")
    # Close hint banner
    page.locator('button[aria-label="Dismiss hint"]').click()
    page.wait_for_timeout(300)

    # 4. Test Solving the Board to trigger Victory Modal
    solution = [
        ['lumen', 'lumen', 'eclipse', 'lumen'],
        ['eclipse', 'lumen', 'lumen', 'lumen'],
        ['lumen', 'eclipse', 'lumen', 'lumen'],
        ['lumen', 'lumen', 'eclipse', 'lumen'],
    ]

    # Fill Lumen cells
    page.locator('button:has-text("Lumen")').first.click()
    page.wait_for_timeout(100)
    for r in range(4):
        for c in range(4):
            if solution[r][c] == 'lumen':
                cell = page.locator(f'button[data-row="{r}"][data-col="{c}"]')
                cell.click()
                page.wait_for_timeout(60)

    # Fill Eclipse cells
    page.locator('button:has-text("Eclipse")').first.click()
    page.wait_for_timeout(100)
    for r in range(4):
        for c in range(4):
            if solution[r][c] == 'eclipse':
                cell = page.locator(f'button[data-row="{r}"][data-col="{c}"]')
                cell.click()
                page.wait_for_timeout(60)

    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(scratch_dir, 'after_clicks.png'))
    print("after_clicks.png captured")

    # Check cell states from DOM
    for r in range(4):
        row_str = []
        for c in range(4):
            label = page.locator(f'button[data-row="{r}"][data-col="{c}"]').get_attribute('aria-label')
            row_str.append(label)
        print(f"Row {r}: {row_str}")

    # Wait for Victory Modal
    page.wait_for_selector('text=Constellation Aligned!', timeout=5000)
    page.wait_for_timeout(600)
    page.screenshot(path=os.path.join(scratch_dir, 'victory_celebration.png'))
    print("Victory screenshot captured.")

    # In victory modal, click "Levels"
    page.locator('.fixed button:has-text("Levels")').click()
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(scratch_dir, 'levels_modal.png'))
    print("Levels modal screenshot captured.")
    page.locator('.fixed button[aria-label="Close"]').click()
    page.wait_for_timeout(300)

    # 5. Open Daily modal
    page.locator('header button:has-text("Daily")').click()
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(scratch_dir, 'daily_modal.png'))
    print("Daily modal screenshot captured.")
    page.locator('.fixed button[aria-label="Close"]').click()
    page.wait_for_timeout(300)

    # 6. Open Builder modal
    page.locator('header button:has-text("Builder")').click()
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(scratch_dir, 'builder_modal.png'))
    print("Builder modal screenshot captured.")
    page.locator('.fixed button[aria-label="Close"]').click()
    page.wait_for_timeout(300)

    # 7. Mobile Viewport Test
    mobile_context = browser.new_context(viewport={'width': 390, 'height': 844})
    mobile_page = mobile_context.new_page()
    mobile_page.goto('http://localhost:5199')
    mobile_page.wait_for_load_state('networkidle')
    mobile_page.wait_for_timeout(500)
    mobile_page.screenshot(path=os.path.join(scratch_dir, 'mobile_home.png'), full_page=True)
    print("Mobile screenshot captured.")

    browser.close()
    print("All UI and gameplay tests finished with 100% success!")


    # Click "Levels" inside victory modal
    page.click('button:has-text("Levels")')
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(scratch_dir, 'levels_modal.png'))
    print("Levels modal screenshot captured.")
    page.click('button[aria-label="Close"]')
    page.wait_for_timeout(300)

    # Open Daily modal from header
    page.click('button:has-text("Daily")')
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(scratch_dir, 'daily_modal.png'))
    print("Daily modal screenshot captured.")
    page.click('button[aria-label="Close"]')
    page.wait_for_timeout(300)

    # Open Builder modal from header
    page.click('button:has-text("Builder")')
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(scratch_dir, 'builder_modal.png'))
    print("Builder modal screenshot captured.")
    page.click('button[aria-label="Close"]')
    page.wait_for_timeout(300)

    browser.close()
    print("All UI and gameplay tests finished successfully!")

