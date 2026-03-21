from playwright.sync_api import sync_playwright
from .config import Config

class BrowserManager:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None

    def start(self):
        """Starts the Playwright engine and browser."""
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=Config.HEADLESS)
        
        # FIXED: Added device_scale_factor for High-Res Screenshots
        self.context = self.browser.new_context(
            viewport=Config.VIEWPORT,
            device_scale_factor=Config.SCALE_FACTOR
        )
        return self

    def create_page(self):
        """Creates a new page in the current context."""
        if not self.context:
            raise RuntimeError("Browser not started. Call start() first.")
        return self.context.new_page()

    def stop(self):
        """Stops the browser and Playwright engine."""
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()

    def __enter__(self):
        return self.start()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()
