import sys
import time
import tempfile
from .core.config import Config
from .core.browser import BrowserManager
from .core.scraper import SlideScraper
from .ui.cli import CLI
from .utils.pdf import PDFMerger

def main():
    cli = CLI()
    cli.show_welcome()

    # --- MENU STEP 1: SELECT TYPE ---
    action = cli.get_initial_choice()
    if action == "Exit" or not action:
        sys.exit()

    # --- MENU STEP 2: SETUP ---
    uni_url = cli.get_url()
    if not uni_url:
        print("URL required.")
        sys.exit()

    cli.show_launching_message()

    with BrowserManager() as browser:
        page = browser.create_page()

        # Navigate to login
        try:
            page.goto(uni_url)
        except:
            cli.show_error("Invalid URL or Network Error.")
            return

        cli.show_manual_login_instructions()
        
        # --- LOOP FOR MULTIPLE PDFS ---
        while True:
            cli.wait_for_enter()

            # --- AUTO-DISCOVERY MAGIC ---
            cli.console.print("[italic]Scanning frames for DRM container...[/italic]")
            scraper = SlideScraper(page)
            raw_src = scraper.find_target_frame()

            if raw_src:
                cli.show_drm_found(raw_src)
                
                # Navigate if needed (Context Trap Fix)
                if page.url != raw_src:
                    cli.show_isolation_message()
                    page.goto(raw_src)
                    try:
                        page.wait_for_selector(Config.SELECTOR_VIEWER_CONTAINER, timeout=10000)
                    except:
                        cli.show_error("Timeout loading raw viewer.")
                        continue
            else:
                cli.show_error("Could not auto-detect PDF frame.")
                if not cli.ask_confirm_extraction():
                    continue

            # --- NAME CONFIG ---
            pdf_name = cli.get_pdf_name()

            # --- EXECUTE ---
            cli.show_extraction_start(pdf_name)
            
            with tempfile.TemporaryDirectory() as temp_dir:
                # 1. Analysis Phase (Count pages first)
                with cli.console.status("[bold cyan]Analyzing DOM Structure...", spinner="dots"):
                    # We peek at the count to set up the progress bar
                    page_elements = scraper.get_slide_elements()
                    total_pages = page_elements.count()
                    
                    # Retry logic if 0 (Lazy loading delay)
                    if total_pages == 0:
                        time.sleep(3)
                        page_elements = scraper.get_slide_elements()
                        total_pages = page_elements.count()

                if total_pages > 0:
                    # 2. Extraction Phase
                    with cli.create_progress_context() as progress:
                         task = progress.add_task(f"[green]Extracting {pdf_name}...", total=total_pages)
                         
                         # Define callback to update UI from inside the scraper
                         def update_progress(advance):
                             progress.update(task, advance=advance)
                             
                         scraper.extract_slides(temp_dir, progress_callback=update_progress)

                    # 3. Merging Phase
                    with cli.console.status("[bold yellow]Compiling PDF Artifact...", spinner="material"):
                        final_path = PDFMerger.merge_to_pdf(temp_dir, pdf_name)
                    
                    if final_path:
                        cli.show_success(final_path)
                    else:
                        cli.show_error("Merge Failed.")
                else:
                    cli.show_error("No slides detected. Is the document fully loaded?")

            # --- REPEAT? ---
            keep_going = cli.ask_next_step()

            if keep_going == "Quit":
                break
            else:
                cli.console.print("[yellow]Navigate to the next lecture in the browser, then come back here.[/yellow]")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit()