import os
from PIL import Image, ImageDraw

def main():
    # Ensure the 'apples' directory exists (idempotent)
    apples_dir = "apples"
    os.makedirs(apples_dir, exist_ok=True)

    # Create a blank white image
    width, height = 200, 250
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)

    # Draw apple body (green circle with slight shading)
    body_bbox = [30, 60, 170, 190]  # left, top, right, bottom
    green = (0, 150, 0)
    draw.ellipse(body_bbox, fill=green, outline=(0, 100, 0))

    # Draw leaf on top-left
    leaf_points = [(90, 50), (110, 30), (120, 60)]
    draw.polygon(leaf_points, fill=(34, 139, 34))

    # Optional: add a subtle highlight to give depth
    highlight_bbox = [80, 70, 100, 90]
    draw.ellipse(highlight_bbox, fill=(220, 255, 220))

    # Save the image inside the 'apples' directory
    output_path = os.path.join(apples_dir, "apple.png")
    img.save(output_path)
    print(f"Apple image saved to {output_path}")

if __name__ == "__main__":
    main()
