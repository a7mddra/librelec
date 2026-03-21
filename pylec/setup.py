import sys
import subprocess
import platform
import os

REQUIRED_PACKAGES = [
    "playwright",
    "pillow",
    "rich",
    "questionary",
    "nest_asyncio"
]

def print_step(msg):
    print(f"\n[+] {msg}")

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

def main():
    print("::: UNLK-LEC INSTALLER :::")
    print(f"Detected OS: {platform.system()}")

    # 1. Install Python Libs
    print_step("Installing Python dependencies...")
    for package in REQUIRED_PACKAGES:
        print(f"   -> {package}")
        try:
            install(package)
        except subprocess.CalledProcessError:
            print(f"   [!] Failed to install {package}. Check permissions.")
            sys.exit(1)

    # 2. Install Playwright Browsers
    print_step("Bootstrapping Chromium Engine...")
    try:
        # This calls the playwright module directly to install the browser
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    except subprocess.CalledProcessError:
        print("   [!] Playwright install failed. Try running 'playwright install chromium' manually.")

    print_step("Installation Complete!")
    print("You can now run the tool using: python librelec.py")

if __name__ == "__main__":
    main()