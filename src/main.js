import './style.css';
import { createRenderer } from './render/index.js';
import { createAudioEngine } from './audio/index.js';

const canvas = document.querySelector('#art');
const renderer = createRenderer(canvas);
const fileInput = document.querySelector('#file');
const playButton = document.querySelector('#play');
const seek = document.querySelector('#seek');
const elapsed = document.querySelector('#elapsed');
const duration = document.querySelector('#duration');
const filename = document.querySelector('#filename');
const note = document.querySelector('#stage-note');
let features = { rms: 0, bass: 0, mid: 0, treble: 0, beat: 0, onset: 0 };
let loaded = false;
let seeking = false;
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const audio = createAudioEngine({
  onFeatures: (next) => { features = next; },
  onState: (state) => {
    loaded = Boolean(state.duration);
    playButton.textContent = state.playing ? 'Ⅱ' : '▶';
    seek.disabled = !loaded;
    duration.textContent = formatTime(state.duration || 0);
    if (!seeking) seek.value = state.duration ? Math.round(state.currentTime / state.duration * 1000) : 0;
    elapsed.textContent = formatTime(state.currentTime || 0);
  },
});

async function loadFile(file) {
  if (!file) return;
  try {
    note.textContent = 'DECODING AUDIO…';
    await audio.load(file);
    filename.textContent = file.name.toUpperCase();
    note.textContent = 'LIVE AUDIO REACTIVE';
    await audio.play();
  } catch (error) {
    note.textContent = `COULD NOT READ AUDIO: ${error.message}`;
  }
}
fileInput.addEventListener('change', () => loadFile(fileInput.files?.[0]));
playButton.addEventListener('click', async () => { if (loaded) await (audio.getState().playing ? audio.pause() : audio.play()); });
seek.addEventListener('input', () => { seeking = true; elapsed.textContent = formatTime(Number(seek.value) / 1000 * audio.getState().duration); });
seek.addEventListener('change', () => { audio.seek(Number(seek.value) / 1000 * audio.getState().duration); seeking = false; });
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('drop', (event) => { event.preventDefault(); loadFile(event.dataTransfer?.files?.[0]); });
window.addEventListener('resize', renderer.resize);

const start = performance.now();
function frame(now) {
  audio.update();
  const time = loaded ? audio.getState().currentTime : (now - start) / 1000;
  const demo = { rms: .28 + .09 * Math.sin(time * 1.2), bass: .36 + .2 * Math.sin(time * .77), mid: .36 + .16 * Math.sin(time * 1.12), treble: .35 + .18 * Math.sin(time * 1.83), beat: Math.max(0, Math.sin(time * 4.2)) ** 8, onset: Math.max(0, Math.sin(time * 4.2)) ** 12 };
  renderer.render(loaded ? features : demo, time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
