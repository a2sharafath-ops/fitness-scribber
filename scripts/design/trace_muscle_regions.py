"""Trace the supplied illustration into interactive SVG paths; never alter its pixels.

Requires Pillow and NumPy. Run from the repository root. Region labels are
coaching groups, not a claim that the reference is a validated anatomy atlas.
"""
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

image = np.array(Image.open('docs/assets/muscle-body-outline.png').convert('RGB'))
r, g, b = [image[:, :, i].astype(int) for i in range(3)]
mask = ((r > 85) & (r < 220) & (abs(r-g) < 25)) | ((r > 180) & (g < 130) & (b < 130))
seen = np.zeros(mask.shape, bool)
components = []
for y, x in zip(*np.where(mask)):
    if seen[y, x]:
        continue
    queue = [(int(x), int(y))]
    seen[y, x] = True
    pixels = set()
    while queue:
        xx, yy = queue.pop()
        pixels.add((xx, yy))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = xx+dx, yy+dy
            if 0 <= nx < mask.shape[1] and 0 <= ny < mask.shape[0] and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((nx, ny))
    if len(pixels) > 80:
        components.append(pixels)


def simplify(points, tolerance=.55):
    if len(points) < 3:
        return points
    a, z = np.array(points[0]), np.array(points[-1])
    delta = z-a
    length = np.linalg.norm(delta)
    distances = [abs(delta[0]*(p[1]-a[1])-delta[1]*(p[0]-a[0]))/length if length else np.linalg.norm(np.array(p)-a) for p in points]
    index = int(np.argmax(distances))
    if distances[index] <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[:index+1], tolerance)[:-1]+simplify(points[index:], tolerance)


def trace(pixels):
    edges = defaultdict(list)
    for x, y in sorted(pixels):
        for neighbor, start, end in (
            ((x, y-1), (x, y), (x+1, y)),
            ((x+1, y), (x+1, y), (x+1, y+1)),
            ((x, y+1), (x+1, y+1), (x, y+1)),
            ((x-1, y), (x, y+1), (x, y)),
        ):
            if neighbor not in pixels:
                edges[start].append(end)
    contours = []
    while edges:
        start = next(iter(edges))
        point = start
        loop = [start]
        while True:
            nxt = edges[point].pop()
            if not edges[point]:
                del edges[point]
            loop.append(nxt)
            point = nxt
            if point == start:
                break
        if len(loop) > 8:
            # Split the closed contour before RDP to avoid coincident endpoints.
            mid = len(loop)//2
            pts = simplify(loop[:mid+1])[:-1]+simplify(loop[mid:])
            contours.append('M'+' L'.join(f'{x} {y}' for x, y in pts)+' Z')
    return ' '.join(contours)


groups = {
    'Chest': [12, 13], 'Front delts': [4, 5], 'Side delts': [6, 7, 8, 11],
    'Rear delts': [9, 10], 'Biceps': [18, 19], 'Triceps': [16, 17, 20, 21],
    'Forearms': [30, 31, 32, 33, 34, 35, 40, 41],
    'Abdominals': [24, 25, 28, 29, 38, 39, 44, 45],
    'Quadriceps': [50, 51, 54, 55, 62, 63], 'Adductors': [52, 53],
    'Tibialis anterior': [66, 69], 'Trapezius': [0, 1, 2, 3],
    'Upper back': [14, 15], 'Lats': [22, 23], 'Spinal erectors': [36, 37],
    'Glutes': [46, 47], 'Hip abductors': [48, 49],
    'Hamstrings': [56, 57, 60, 61], 'Calves': [64, 65, 67, 68, 70, 71, 72, 73],
}
regions = [[name, trace(components[i])] for name, ids in groups.items() for i in ids]
# The source joins serratus and lateral abdominal wall. Keep a narrow separation.
for i in [26, 27]:
    regions.append(['Serratus anterior', trace({p for p in components[i] if p[1] < 253})])
    regions.append(['Abdominals', trace({p for p in components[i] if p[1] > 254})])
output = Path('docs/assets/muscle-body-regions.json')
output.write_text(json.dumps(regions, indent=2), encoding='utf-8')
page = Path('docs/muscle-volume-body-design.html')
html = page.read_text(encoding='utf-8')
start = html.index('const regions=')
end = html.index("el('interactiveBody').innerHTML", start)
html = html[:start]+'const regions='+json.dumps(regions)+';\n'+html[end:]
page.write_text(html, encoding='utf-8')
print(f'Traced {len(regions)} surface regions from {len(components)} enclosed shapes.')
