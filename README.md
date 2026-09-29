# Chromatic Forms

An audio reactive four panel canvas inspired by soft chromatic gradients, overlapping forms, arches, and optical repetition. The artwork is drawn procedurally, with colors specified in OKLCH and converted for canvas output. Reference images are not included in the repository.

## Run

```sh
npm install
npm run dev
```

Open the local URL, then drop an audio file or MP4 onto the canvas (or use **Load audio / MP4**). Playback, pause, and seeking use the loaded file. The app opens with an explicitly labeled demo motion until a file is loaded. Files remain local to the browser; the app has no upload endpoint or telemetry.

For an MP4, your browser must support its audio codec. An MP4 with AAC audio is the most compatible choice.

## Visual mapping

| Audio feature | Visual response |
| --- | --- |
| RMS loudness | Breathing and glow |
| Bass | Form size and depth |
| Midrange | Shape displacement |
| Treble | Color edges and fine texture |
| Onset / beat | Brief accents and rhythmic shifts |

The mappings are intentionally restrained so each composition remains coherent through a whole song. Audio analysis uses the browser's Web Audio API, and rendering uses the Canvas 2D API. The MCP from `touchdesigner-mcp` is not needed at runtime; this is a standalone browser prototype.

## Checkpoints

1. App shell and local media transport.
2. Four procedural OKLCH visual compositions and audio mapping.
3. Browser verification and production build.

## Verify

```sh
npm test
npm run build
```

The browser verification script in `tests/` also exercises file loading and playback with generated audio.
