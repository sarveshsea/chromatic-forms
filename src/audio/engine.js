const SUPPORTED_EXTENSIONS = /\.(mp3|m4a|mp4|wav|ogg|oga|webm|aac|flac)$/i;
const EMPTY_FEATURES = Object.freeze({ rms: 0, bass: 0, mid: 0, treble: 0, beat: 0, onset: 0 });

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function bandEnergy(bins, sampleRate, fftSize, lowerHz, upperHz) {
  const first = Math.max(0, Math.floor(lowerHz * fftSize / sampleRate));
  const last = Math.min(bins.length - 1, Math.ceil(upperHz * fftSize / sampleRate));
  if (last < first) return 0;
  let sum = 0;
  for (let index = first; index <= last; index += 1) sum += bins[index] / 255;
  return sum / (last - first + 1);
}

/**
 * Plays a local song and exposes a small, normalized feature vector for a render loop.
 * The browser decodes the file; unsupported codecs produce an actionable load error.
 */
export function createAudioEngine({ onFeatures = () => {}, onState = () => {} } = {}) {
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.playsInline = true;
  let context;
  let analyser;
  let bins;
  let waveform;
  let objectUrl;
  let previousEnergy = 0;
  let smoothedEnergy = 0;
  let beat = 0;
  let lastOnsetAt = -Infinity;
  let fileName = '';
  let error = '';

  const getState = () => ({
    fileName,
    duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    currentTime: audio.currentTime || 0,
    playing: !audio.paused && !audio.ended,
    ready: audio.readyState >= HTMLMediaElement.HAVE_METADATA,
    error,
  });
  const emitState = () => onState(getState());

  function ensureGraph() {
    if (context) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');
    context = new AudioContextClass();
    analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.72;
    bins = new Uint8Array(analyser.frequencyBinCount);
    waveform = new Uint8Array(analyser.fftSize);
    const source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);
  }

  function load(file) {
    if (!(file instanceof File)) return Promise.reject(new TypeError('Choose a local audio or MP4 file.'));
    if (!file.type.startsWith('audio/') && file.type !== 'video/mp4' && !SUPPORTED_EXTENSIONS.test(file.name)) {
      return Promise.reject(new TypeError('Choose an audio file or an MP4 with an audio track.'));
    }
    audio.pause();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    fileName = file.name;
    error = '';
    previousEnergy = smoothedEnergy = beat = 0;
    lastOnsetAt = -Infinity;
    audio.src = objectUrl;
    audio.load();
    emitState();
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', ready);
        audio.removeEventListener('error', failed);
      };
      const ready = () => { cleanup(); emitState(); resolve(getState()); };
      const failed = () => {
        cleanup();
        error = 'This file could not be decoded. Try an MP4 with AAC audio, or an MP3/WAV file.';
        emitState();
        reject(new Error(error));
      };
      audio.addEventListener('loadedmetadata', ready, { once: true });
      audio.addEventListener('error', failed, { once: true });
    });
  }

  async function play() {
    if (!audio.src) throw new Error('Choose a song first.');
    ensureGraph();
    await context.resume();
    await audio.play();
    emitState();
  }

  function pause() { audio.pause(); emitState(); }

  function seek(seconds) {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!duration) return;
    audio.currentTime = Math.min(duration, Math.max(0, Number(seconds) || 0));
    previousEnergy = smoothedEnergy = beat = 0;
    lastOnsetAt = -Infinity;
    emitState();
  }

  function update() {
    if (!analyser || audio.paused || audio.ended) {
      onFeatures(EMPTY_FEATURES);
      return EMPTY_FEATURES;
    }
    analyser.getByteFrequencyData(bins);
    analyser.getByteTimeDomainData(waveform);
    let squares = 0;
    for (const sample of waveform) {
      const amplitude = (sample - 128) / 128;
      squares += amplitude * amplitude;
    }
    const rms = clamp01(Math.sqrt(squares / waveform.length) * 2.2);
    const bass = clamp01(bandEnergy(bins, context.sampleRate, analyser.fftSize, 30, 180) * 2.2);
    const mid = clamp01(bandEnergy(bins, context.sampleRate, analyser.fftSize, 180, 2200) * 2.5);
    const treble = clamp01(bandEnergy(bins, context.sampleRate, analyser.fftSize, 2200, 10000) * 3.5);
    const energy = bass * 0.55 + mid * 0.3 + treble * 0.15;
    smoothedEnergy = smoothedEnergy * 0.92 + energy * 0.08;
    const novelty = Math.max(0, energy - previousEnergy);
    const now = audio.currentTime;
    const onset = novelty > 0.045 && energy > smoothedEnergy * 1.18 && now - lastOnsetAt > 0.16 ? 1 : 0;
    if (onset) { lastOnsetAt = now; beat = 1; }
    else beat *= 0.86;
    previousEnergy = energy;
    const features = { rms, bass, mid, treble, beat, onset };
    onFeatures(features);
    return features;
  }

  function destroy() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (context) void context.close();
  }

  for (const event of ['timeupdate', 'durationchange', 'ended', 'pause', 'play']) audio.addEventListener(event, emitState);
  return { load, play, pause, seek, getState, update, destroy };
}
