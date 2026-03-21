import time
import os
from .config import Config

class SlideScraper:
    def __init__(self, page):
        self.page = page

    def find_target_frame(self):
        """Intelligently hunts for the DRM-protected viewer URL."""
        print("   [DEBUG] Hunting for iframe...")
        time.sleep(1)
        
        # STRATEGY 1: Look for the specific 'pdfprotect' iframe element explicitly
        # This fixes the issue where page.frames hasn't loaded the cross-origin frame yet
        try:
            iframe_element = self.page.locator(Config.SELECTOR_IFRAME_PROTECT)
            if iframe_element.count() > 0:
                src = iframe_element.get_attribute("src")
                if src:
                    print(f"   [DEBUG] Found via ID selector: {src[:50]}...")
                    return src
        except Exception as e:
            print(f"   [DEBUG] Selector check failed: {e}")

        # STRATEGY 2: Check all loaded frames for keywords
        for frame in self.page.frames:
            try:
                src = frame.url
                for k in Config.VIEWER_KEYWORDS:
                    if k in src:
                        print(f"   [DEBUG] Found via frame loop: {src[:50]}...")
                        return src
            except:
                continue
                
        # STRATEGY 3: Check current URL (in case user pasted the direct link)
        for k in Config.VIEWER_KEYWORDS:
            if k in self.page.url:
                return self.page.url
                
        return None

    def get_slide_elements(self):
        """Finds all page elements in the DOM."""
        # Using .locator ensure fresh elements
        return self.page.locator(Config.SELECTOR_PAGE)

    def extract_slides(self, temp_dir, progress_callback=None):
        # We assume main.py navigated us to the correct context
        page_locators = self.get_slide_elements()
        total_pages = page_locators.count()
        
        for i in range(total_pages):
            page_num = i + 1
            # Fetch fresh handle to avoid StaleElementReference
            page_handle = page_locators.nth(i)
            
            page_handle.scroll_into_view_if_needed()
            
            try:
                # Wait for canvas render
                canvas = page_handle.locator(Config.SELECTOR_CANVAS)
                canvas.wait_for(state="visible", timeout=Config.TIMEOUT_CANVAS)
                
                # Wait for the High-DPI renderer to sharpen the text
                time.sleep(0.75) 
                
                output_path = os.path.join(temp_dir, f"slide_{page_num:03d}.png")
                
                # Screenshot the CANVAS only (cleaner)
                canvas.screenshot(path=output_path)
                
            except Exception:
                # Fallback: Screenshot the whole page container
                fallback_path = os.path.join(temp_dir, f"slide_{page_num:03d}.png") # Keep name consistent for merger
                page_handle.screenshot(path=fallback_path)

            if progress_callback:
                progress_callback(1)
                
        return total_pages
