# Ganda Pani, Saaf Bijli: scroll film website

A battery-free drain monitor powered by microbial fuel cells, told as a scroll-driven film.
Project for **National Innovators Battle 2026**, Future Innovators Exhibition (theme: Society Welfare).

## Run locally
```bash
python -m http.server 5173
# open http://localhost:5173
```
(Any static server works. Opening `index.html` directly mostly works, but credits load via `fetch`, so use a server.)

## Motion stack
| Effect | How |
|---|---|
| Inertial smooth scroll | Lenis, driving GSAP ScrollTrigger |
| Particle river (hero) | Three.js `Points` + custom GLSL shader: 3,600 particles, cursor repulsion, scroll morphs mud to energy |
| Iris reveal (Gomti) | Scrubbed `clip-path: inset()` + image push-out |
| Horizontal tracking shot | Pinned section, vertical scroll to `x` translation, nested `containerAnimation` parallax |
| Word-by-word light-up | Custom text splitter + scrubbed stagger |
| Microbe and electron simulation | Canvas2D particle system; emission rate tied to scroll progress |
| Self-drawing diagram and map | SVG `stroke-dashoffset` scrub, pins pop with `back.out` ease |
| Multi-plane parallax | Per-element `data-speed` |
| Scroll timecode | Scroll progress mapped to the film's 02:56 runtime (HH:MM:SS:FF) |
| Director's cut | Embedded film + clickable EDL that seeks the player |

Each section carries an **editor's note** explaining the shot the way a video editor would.

## Credits
Photos: Wikimedia Commons contributors under their free licences (full list in `assets/credits.json` and the site footer).
Diagrams, animation, music and sound made for this project. Narration: synthesised voice.
