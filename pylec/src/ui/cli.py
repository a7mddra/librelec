import sys
import questionary
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn

class CLI:
    def __init__(self):
        self.console = Console()
        self.success_count = 0

    def show_welcome(self):
        self.console.clear()
        self.console.print("\n\n")
        banner_text = (
            "██╗      ██╗     ██╗██████╗ ██████╗ ███████╗██╗     ███████╗ ██████╗\n"
            "╚██╗     ██║     ██║██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝██╔════╝\n"
            " ╚██╗    ██║     ██║██████╔╝██████╔╝█████╗  ██║     █████╗  ██║     \n"
            " ██╔╝    ██║     ██║██╔══██╗██╔══██╗██╔══╝  ██║     ██╔══╝  ██║     \n"
            "██╔╝     ███████╗██║██████╔╝██║  ██║███████╗███████╗███████╗╚██████╗\n"
            "╚═╝      ╚══════╝╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝ ╚═════╝"
        )
        
        # Gradient: Cyan -> Blue -> Purple (Cyberpunk/Ink style)
        # We'll do a simple interpolate across the length of each line
        styled_text = self._apply_gradient(banner_text, ["#00FFFF", "#0080FF", "#8000FF", "#FF00FF"])
        self.console.print(styled_text)      
        self.console.print()

    def _apply_gradient(self, text, hex_colors):
        """Applies a multi-stop horizontal gradient to each line of text."""
        lines = text.splitlines()
        result = Text()
        
        for line in lines:
            line_len = len(line)
            if line_len == 0:
                result.append("\n")
                continue
                
            for i, char in enumerate(line):
                # Calculate global position in gradient (0.0 to 1.0)
                t = i / max(line_len - 1, 1)
                
                # Determine which segment of the gradient we are in
                # if we have N colors, we have N-1 segments
                if len(hex_colors) == 1:
                    color = hex_colors[0]
                else:
                    segment_count = len(hex_colors) - 1
                    segment_index = min(int(t * segment_count), segment_count - 1)
                    segment_t = (t * segment_count) - segment_index
                    
                    start_color = self._hex_to_rgb(hex_colors[segment_index])
                    end_color = self._hex_to_rgb(hex_colors[segment_index + 1])
                    
                    current_rgb = self._interpolate_rgb(start_color, end_color, segment_t)
                    color = self._rgb_to_hex(current_rgb)
                
                result.append(char, style=color)
            result.append("\n")
        return result

    def _hex_to_rgb(self, hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def _rgb_to_hex(self, rgb):
        return '#{:02x}{:02x}{:02x}'.format(*rgb)

    def _interpolate_rgb(self, start, end, t):
        return tuple(int(s + (e - s) * t) for s, e in zip(start, end))

    def get_initial_choice(self):
        return questionary.select(
            "What type of lecture do you want to extract?",
            choices=[
                "PDF Document",
                questionary.Choice("Video Stream", disabled="(Soon)"),
                "Exit"
            ],
            pointer=">"
        ).ask()

    def get_url(self):
        return questionary.text(
            "Paste the University Login URL [e.g. DMU SML4]:",
            default="https://sml4.dmu.edu.eg/my/courses.php"
        ).ask()

    def show_launching_message(self):
        self.console.print("[dim]Launching Chromium Hook...[/dim]")

    def show_manual_login_instructions(self):
        self.console.print("\n[bold yellow]⚠ ACTION REQUIRED:[/]")
        self.console.print("1. Log in manually in the browser window.")
        self.console.print("2. Navigate to the page containing the Locked PDF.")
        self.console.print("\n[bold cyan]--- READY FOR EXTRACTION ---[/]")

    def wait_for_enter(self):
        input("Press [ENTER] when the PDF page is open on screen...")

    def show_drm_found(self, src):
        self.console.print(f"[green]✔ DRM Source Found:[/green] [dim]{src}[/dim]")

    def show_isolation_message(self):
        self.console.print("[italic]Isolating viewer...[/]")

    def ask_confirm_extraction(self):
        # Fallback to input() to avoid async conflicts inside loop
        res = input("Try extraction anyway on current view? [y/N]: ").strip().lower()
        return res == 'y'

    def get_pdf_name(self):
        # Fallback to input() to avoid async conflicts inside loop
        next_num = self.success_count + 1
        suggestion = f"Lec{next_num}"
        prompt = f"Enter Output Filename [e.g. {suggestion}]: "
        name = input(prompt).strip()
        return name if name else suggestion

    def show_extraction_start(self, pdf_name):
        self.console.clear()
        self.console.print("\n\n")
        self.console.print(Panel(Text(" INITIATING CANVAS HIJACK PROTOCOL ", style="bold green on black"), border_style="green"))

    def create_progress_context(self):
        return Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(bar_width=None, style="green"),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=self.console
        )

    def show_error(self, message):
        self.console.print(f"[bold red]❌ ERROR: {message}[/]")

    def show_success(self, path):
        self.success_count += 1
        self.console.print(f"\n[bold green]SUCCESS[/] 🔓 \nArtifact saved to: [underline]{path}[/]")

    def ask_next_step(self):
        # Fallback to input() to avoid async conflicts inside loop
        print("\nOperation Complete.")
        res = input("Extract Another PDF? [Y/n]: ").strip().lower()
        if res == 'n':
            return "Quit"
        return "Extract Another PDF"
