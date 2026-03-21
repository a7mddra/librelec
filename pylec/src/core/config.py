class Config:
    # Browser Settings
    # device_scale_factor=2.0 is the "Retina" fix for clear text
    VIEWPORT = {'width': 1600, 'height': 1200} 
    SCALE_FACTOR = 2.5 
    HEADLESS = False
    
    # Timeouts (ms)
    TIMEOUT_PAGE_LOAD = 5000
    TIMEOUT_CANVAS = 15000 # Increased for high-res rendering
    TIMEOUT_FRAME_SEARCH = 4000
    
    # Selectors
    SELECTOR_PAGE = "#viewer .page"
    SELECTOR_CANVAS = ".canvasWrapper canvas"
    SELECTOR_VIEWER_CONTAINER = "#viewerContainer"
    
    # NEW: Specific selector for your uni's iframe
    SELECTOR_IFRAME_PROTECT = "#pdfprotect-iframe"
    
    # DRM/Viewer Keywords
    VIEWER_KEYWORDS = ["pdfjs-drm", "viewer.html", "content/1/", "mod/pdfprotect"]
    
    # Defaults
    DEFAULT_OUTPUT_FOLDER_NAME = "output_slides"
