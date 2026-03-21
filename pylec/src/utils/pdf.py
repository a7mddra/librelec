import os
from PIL import Image
from .system import SystemUtils

class PDFMerger:
    @staticmethod
    def merge_to_pdf(image_folder, output_filename):
        """Merges PNGs to PDF."""
        try:
            # 1. Find and sort the images
            files = sorted([f for f in os.listdir(image_folder) if f.endswith('.png')], 
                           key=lambda x: int(x.split('_')[1].split('.')[0]))
            
            if not files:
                print("   [!] No images found to merge.")
                return None

            print(f"   [DEBUG] Found {len(files)} slides. Preparing PDF...")
            images = [Image.open(os.path.join(image_folder, f)).convert('RGB') for f in files]
            
            # 2. Get the target directory (Robust check)
            docs_path = SystemUtils.get_documents_path()
            print(f"   [INFO] Saving to directory: {docs_path}")

            # 3. Clean the filename (remove illegal characters)
            safe_name = "".join([c for c in output_filename if c.isalpha() or c.isdigit() or c in (' ', '-', '_')]).strip()
            if not safe_name: safe_name = "lecture_slides"
            
            output_path = docs_path / f"{safe_name}.pdf"
            
            # 4. Save the PDF
            images[0].save(str(output_path), "PDF", resolution=100.0, save_all=True, append_images=images[1:])
            
            print(f"   [SUCCESS] PDF saved successfully at: {output_path}")
            return str(output_path)

        except Exception as e:
            print(f"\n   [ERROR] Merge failed details: {e}")
            return None