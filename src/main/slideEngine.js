let getDeck = () => null;
let onChange = () => {};
let timer = null;

const state = {
  currentIndex: 0,
  autopilot: 'off', // off | forward | reverse | random
  duration: 5,
  loop: true,
};

export function init(options) {
  getDeck = options.getDeck;
  onChange = options.onChange;
  Object.assign(state, {
    autopilot: 'off', // never resume autopilot on start; the operator arms it
    duration: options.settings.duration,
    loop: options.settings.loop,
  });
}

export function getState() {
  return { ...state };
}

function slideCount() {
  return getDeck()?.slideCount ?? 0;
}

function commit() {
  onChange(state.currentIndex);
}

export function reset() {
  state.currentIndex = 0;
  commit();
}

export function playAt(index) {
  const count = slideCount();
  if (count === 0) return;
  state.currentIndex = Math.max(0, Math.min(index, count - 1));
  commit();
}

export function next() {
  const count = slideCount();
  if (count === 0) return;
  const last = state.currentIndex === count - 1;
  if (last && !state.loop) {
    setAutopilot('off');
    return;
  }
  state.currentIndex = (state.currentIndex + 1) % count;
  commit();
}

export function prev() {
  const count = slideCount();
  if (count === 0) return;
  const first = state.currentIndex === 0;
  if (first && !state.loop) {
    setAutopilot('off');
    return;
  }
  state.currentIndex = (state.currentIndex - 1 + count) % count;
  commit();
}

function randomSlide() {
  const count = slideCount();
  if (count <= 1) return;
  let index = state.currentIndex;
  while (index === state.currentIndex) {
    index = Math.floor(Math.random() * count);
  }
  state.currentIndex = index;
  commit();
}

function tick() {
  if (state.autopilot === 'forward') next();
  else if (state.autopilot === 'reverse') prev();
  else if (state.autopilot === 'random') randomSlide();
}

function restartTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (state.autopilot === 'off') return;
  timer = setInterval(tick, Math.max(0.1, state.duration) * 1000);
}

export function setAutopilot(mode) {
  state.autopilot = mode;
  restartTimer();
}

export function setDuration(seconds) {
  state.duration = seconds;
  restartTimer();
}

export function setLoop(enabled) {
  state.loop = enabled;
}

export function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  state.autopilot = 'off';
}
