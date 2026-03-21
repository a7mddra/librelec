#!/bin/bash

# Definition of colors for prettier output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}::: UNLK-LEC INSTALLER (Linux/Mac) :::${NC}"

# Check for python3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed.${NC}"
    exit 1
fi

# 1. Create Virtual Environment
echo -e "\n${GREEN}[+] Setting up Virtual Environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "    -> Created 'venv' directory."
else
    echo "    -> 'venv' already exists."
fi

# 2. Activate and Install
echo -e "\n${GREEN}[+] Installing Dependencies...${NC}"
source venv/bin/activate

# Install pip dependencies
pip install --upgrade pip --break-system-packages
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt --break-system-packages
else
    pip install playwright pillow rich questionary nest_asyncio --break-system-packages
fi

# 3. Install Playwright Browsers
echo -e "\n${GREEN}[+] Bootstrapping Chromium Engine...${NC}"
# Use python -m playwright to ensure we use the venv's playwright
if ! python3 -m playwright install chromium; then
    echo -e "${RED}Failed to install Playwright browsers.${NC}"
    # Try one more time with system pip if venv failed (though venv should be active)
    exit 1
fi

# 4. Create Launch Shortcut
echo -e "\n${GREEN}[+] Creating Launch Shortcut...${NC}"
cat <<EOT > start.sh
#!/bin/bash
BASEDIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
source "\$BASEDIR/venv/bin/activate"
python3 "\$BASEDIR/librelec.py" "\$@"
EOT
chmod +x start.sh

echo -e "\n${GREEN}✨ Installation Complete! ✨${NC}"
echo -e "To run the app, simply execute:"
echo -e "   ${CYAN}./start.sh${NC}"
