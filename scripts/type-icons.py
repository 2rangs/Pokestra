"""타입 아이콘 만들기: PokeAPI sprites 의 레전드 아르세우스 타입 라벨(types/generation-viii/legends-arceus/{id}.png)에서
왼쪽 네모 아이콘을 잘라 public/assets/types/square/{type}.png (타입 색 네모 + 문양),
문양만 흰색으로 뽑아 public/assets/types/glyph/{type}.png (타입 색 배지 안에서 쓰는 흰 문양)을 만든다.
사용자가 준 레퍼런스(게임 타입 표)와 같은 스타일이다.

실행: python3 scripts/type-icons.py   (curl 로 받는다 — 프록시 설정을 그대로 쓰도록. Pillow 필요)
"""
import io
import os
import subprocess

from PIL import Image, ImageDraw

BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/legends-arceus"
IDS = {
    1: "normal", 2: "fighting", 3: "flying", 4: "poison", 5: "ground", 6: "rock", 7: "bug", 8: "ghost", 9: "steel",
    10: "fire", 11: "water", 12: "grass", 13: "electric", 14: "psychic", 15: "ice", 16: "dragon", 17: "dark", 18: "fairy",
}
ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "types")
SIZE = 36  # 라벨 왼쪽 네모 아이콘 (36×36). 오른쪽은 라벨이 이어지므로 둥근 네모로 다시 깎는다
RADIUS = 6
CREAM = (251, 247, 219)  # 문양 색


def fetch(url: str) -> Image.Image:
    data = subprocess.run(["curl", "-sS", "--fail", "--retry", "3", url], check=True, capture_output=True).stdout
    return Image.open(io.BytesIO(data)).convert("RGBA")


def main() -> None:
    os.makedirs(os.path.join(ROOT, "square"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "glyph"), exist_ok=True)
    for tid, name in IDS.items():
        label = fetch(f"{BASE}/{tid}.png")
        icon = label.crop((0, 0, SIZE, SIZE))
        mask = Image.new("L", (SIZE, SIZE), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=RADIUS, fill=255)
        square = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        square.paste(icon, (0, 0), mask)
        square.save(os.path.join(ROOT, "square", f"{name}.png"), optimize=True)

        # 문양: 바탕색 → 문양 색(크림) 사이에서 문양 쪽에 가까운 만큼 불투명한 흰색 (밝은 바탕의 페어리 등도 또렷하게)
        bg = icon.getpixel((3, SIZE // 2))[:3]
        span = sum((c - b) ** 2 for c, b in zip(CREAM, bg)) ** 0.5 or 1
        glyph = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        for y in range(SIZE):
            for x in range(SIZE):
                r, g, b, a = square.getpixel((x, y))
                if a == 0:
                    continue
                t = (sum((c - k) ** 2 for c, k in zip((r, g, b), bg)) ** 0.5) / span
                alpha = int(max(0.0, min(1.0, (t - 0.25) / 0.6)) * a)
                if alpha:
                    glyph.putpixel((x, y), (255, 255, 255, alpha))
        glyph.save(os.path.join(ROOT, "glyph", f"{name}.png"), optimize=True)
        print(name, "ok", "bg", "#%02x%02x%02x" % bg)


if __name__ == "__main__":
    main()
