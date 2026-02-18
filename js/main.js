/* ============================================================
   CHROMEBOOK TESTER — MAIN JS
   ============================================================ */
'use strict';

const $ = id => document.getElementById(id);

/* ── Click Sound ── */
let clickReady = false;
const clickBuf = new Audio('Click.mp3');
clickBuf.preload = 'auto';
clickBuf.load();
clickBuf.addEventListener('canplaythrough', () => { clickReady = true; }, { once: true });

function playClick() {
  try {
    const s = new Audio('Click.mp3');
    s.volume = 0.7;
    s.play().catch(() => {});
  } catch(e) {}
}

/* ============================================================
   LAYOUT MANAGER — sizes all cards so nothing scrolls
   ============================================================ */
function doLayout() {
  const appEl   = $('app');
  const topGrid = $('top-grid');
  const kbSect  = $('keyboard-section');

  const totalH  = appEl.clientHeight;       // inner height
  const totalW  = appEl.clientWidth;
  const pad     = 7;   // padding on each side
  const gap     = 7;   // gap between top and keyboard
  const innerH  = totalH - (pad * 2) - gap; // actual usable height for both rows
  const innerW  = totalW - (pad * 2);

  // Keyboard gets ~32%, top grid gets ~68%
  const kbH   = Math.max(130, Math.floor(innerH * 0.32));
  const topH  = innerH - kbH;

  // Square card side = topH (1:1)
  const sqSide = topH;
  // Video card width = 16/9 * sqSide
  const vidW   = Math.floor(sqSide * 16 / 9);

  // Total required width for 5 cards + 4 gaps
  const required = vidW + (sqSide * 4) + (4 * 7);

  // If it doesn't fit, scale everything down proportionally
  let scale = 1;
  if (required > innerW) {
    scale = innerW / required;
  }

  const finalSq  = Math.floor(sqSide  * scale);
  const finalVid = Math.floor(vidW    * scale);
  const finalH   = finalSq; // top grid height = square card height

  // Apply top grid height
  topGrid.style.height = finalH + 'px';

  // Apply video card size
  const vc = $('video-card');
  vc.style.width  = finalVid + 'px';
  vc.style.height = finalH   + 'px';

  // Apply square cards
  document.querySelectorAll('.square-card').forEach(c => {
    c.style.width  = finalSq + 'px';
    c.style.height = finalH  + 'px';
  });

  // Keyboard height
  kbSect.style.height = kbH + 'px';
}

window.addEventListener('resize', doLayout);

/* ============================================================
   1. VIDEO / AUDIO TESTER
   ============================================================ */
(function initVideo() {
  const video   = $('main-video');
  const overlay = $('video-unmute-overlay');
  const btn     = $('unmute-btn');

  // Start muted and paused - only play with audio after user interaction
  video.muted  = true;
  video.volume = 0.8;
  video.loop   = false;

  // Don't autoplay - wait for user interaction
  // Show the overlay so user must click to enable sound
  overlay.classList.remove('hidden');

  btn.addEventListener('click', () => {
    video.muted  = false;
    video.volume = 0.8;
    overlay.classList.add('hidden');
    video.play().catch(() => {});
  });
})();

/* ============================================================
   2. MICROPHONE TESTER
   ============================================================ */
(function initMic() {
  const canvas   = $('mic-canvas');
  const ctx      = canvas.getContext('2d');
  const recBtn   = $('record-btn');
  const playBtn  = $('play-btn');
  const statusEl = $('mic-status');
  const audioEl  = $('playback-audio');

  let analyser, dataArray, rafId;
  let mediaRecorder = null;
  let chunks = [];
  let isRecording = false;
  let blobURL = null;

  // Draw empty bars while waiting
  function drawEmpty() {
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    // Draw idle flatline
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    rafId = requestAnimationFrame(drawEmpty);
  }
  drawEmpty();

  function drawViz() {
    cancelAnimationFrame(rafId);
    function frame() {
      rafId = requestAnimationFrame(frame);
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      if (!analyser) return;
      analyser.getByteFrequencyData(dataArray);
      const bw = W / dataArray.length;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 255;
        const bh = v * H;
        const hue = 210;
        const sat = 70 + v * 30;
        const lit = 50 + v * 30;
        ctx.fillStyle = `hsl(${hue},${sat}%,${lit}%)`;
        ctx.fillRect(i * bw, H - bh, bw - 1, bh);
      }
    }
    frame();
  }

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      statusEl.textContent = 'Microphone active';
      const aCtx   = new (window.AudioContext || window.webkitAudioContext)();
      const source = aCtx.createMediaStreamSource(stream);
      analyser     = aCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      cancelAnimationFrame(rafId);
      drawViz();

      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blobURL) URL.revokeObjectURL(blobURL);
        blobURL = URL.createObjectURL(blob);
        audioEl.src = blobURL;
        playBtn.disabled = false;
        statusEl.textContent = 'Recording ready — press Play';
        chunks = [];
      };
    })
    .catch(() => { statusEl.textContent = '⚠ Microphone access denied'; });

  recBtn.addEventListener('click', () => {
    if (!mediaRecorder) return;
    if (!isRecording) {
      chunks = [];
      mediaRecorder.start();
      isRecording = true;
      recBtn.textContent = '⏹ Stop';
      recBtn.classList.add('recording');
      playBtn.disabled = true;
      statusEl.textContent = 'Recording…';
    } else {
      mediaRecorder.stop();
      isRecording = false;
      recBtn.textContent = '⏺ Record';
      recBtn.classList.remove('recording');
      statusEl.textContent = 'Processing…';
    }
  });

  playBtn.addEventListener('click', () => {
    if (!blobURL) return;
    audioEl.currentTime = 0;
    audioEl.play();
    statusEl.textContent = 'Playing back…';
  });

  audioEl.addEventListener('ended', () => { statusEl.textContent = 'Playback finished'; });
})();

/* ============================================================
   3. BATTERY TESTER
   ============================================================ */
(function initBattery() {
  const fill   = $('battery-fill');
  const pct    = $('battery-pct');
  const status = $('battery-status');
  const time   = $('battery-time');

  function update(b) {
    const lvl = Math.round(b.level * 100);
    pct.textContent = lvl + '%';
    fill.style.width = lvl + '%';

    if (lvl > 60)       fill.style.background = 'linear-gradient(90deg,#267826,#46b046)';
    else if (lvl > 25)  fill.style.background = 'linear-gradient(90deg,#886600,#d8aa00)';
    else                fill.style.background = 'linear-gradient(90deg,#782020,#d84040)';

    if (b.charging) {
      status.textContent = '⚡ Charging';
      status.style.color = '#60c860';
      const s = b.chargingTime;
      time.textContent = (s && s !== Infinity) ? fmtTime('Full in', s) : '';
    } else {
      status.textContent = '🔋 Discharging';
      status.style.color = '#a0a8c0';
      const s = b.dischargingTime;
      time.textContent = (s && s !== Infinity) ? fmtTime('~', s) + ' left' : '';
    }
  }

  function fmtTime(prefix, secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${prefix} ${h}h ${m}m`;
  }

  if ('getBattery' in navigator) {
    navigator.getBattery().then(b => {
      update(b);
      ['levelchange','chargingchange','chargingtimechange','dischargingtimechange']
        .forEach(ev => b.addEventListener(ev, () => update(b)));
    });
  } else {
    pct.textContent    = 'N/A';
    status.textContent = 'Battery API not supported';
    status.style.color = '#7080a0';
  }
})();

/* ============================================================
   4. CAMERA TESTER
   ============================================================ */
(function initCamera() {
  const feed   = $('camera-feed');
  const status = $('camera-status');

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(stream => {
      feed.srcObject = stream;
      status.textContent = '📷 Camera active';
      setTimeout(() => { status.style.opacity = '0'; }, 2200);
    })
    .catch(() => {
      status.textContent = '⚠ Camera permission denied';
    });
})();

/* ============================================================
   5. TOUCHSCREEN TESTER
   ============================================================ */
(function initTouch() {
  const startBtn  = $('touch-start-btn');
  const overlay   = $('touch-overlay');
  const gridEl    = $('touch-grid-container');
  const exitBtn   = $('touch-exit-btn');
  const successPopup = $('touch-success-popup');
  const successOkBtn = $('touch-success-ok-btn');
  let pointerDown = false;
  let totalCells = 0;

  function buildGrid() {
    const W = window.innerWidth, H = window.innerHeight;
    const CELL = Math.max(40, Math.floor(Math.min(W, H) / 12));
    const cols  = Math.floor(W / CELL);
    const rows  = Math.floor(H / CELL);
    gridEl.style.gridTemplateColumns = `repeat(${cols},1fr)`;
    gridEl.style.gridTemplateRows    = `repeat(${rows},1fr)`;
    gridEl.innerHTML = '';
    totalCells = cols * rows;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'touch-cell';
      gridEl.appendChild(cell);
    }
  }

  function checkAllTouched() {
    const allCells = gridEl.querySelectorAll('.touch-cell');
    const touchedCells = gridEl.querySelectorAll('.touch-cell.touched');
    if (touchedCells.length === allCells.length && allCells.length > 0) {
      // All squares are touched (orange)
      successPopup.classList.remove('hidden');
    }
  }

  function colorAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (el && el.classList.contains('touch-cell')) {
      el.classList.add('touched');
      checkAllTouched();
    }
  }

  function exitTest() {
    overlay.classList.add('hidden');
    successPopup.classList.add('hidden');
    (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen)?.call(document);
  }

  gridEl.addEventListener('pointerdown', e => {
    pointerDown = true;
    gridEl.setPointerCapture?.(e.pointerId);
    colorAt(e.clientX, e.clientY);
  });
  gridEl.addEventListener('pointermove', e => {
    if (e.buttons > 0 || pointerDown) colorAt(e.clientX, e.clientY);
  });
  gridEl.addEventListener('pointerup',   () => { pointerDown = false; });
  gridEl.addEventListener('pointercancel', () => { pointerDown = false; });

  // Also handle multi-touch
  gridEl.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.touches) colorAt(t.clientX, t.clientY);
  }, { passive: false });

  startBtn.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    successPopup.classList.add('hidden');
    buildGrid();
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen)?.call(el);
  });

  exitBtn.addEventListener('click', exitTest);
  successOkBtn.addEventListener('click', exitTest);

  // ESC key handler
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      e.preventDefault();
      exitTest();
    }
  });

  // Rebuild grid on resize (orientation change etc.)
  window.addEventListener('resize', () => {
    if (!overlay.classList.contains('hidden')) buildGrid();
  });
})();

/* ============================================================
   6. KEYBOARD TESTER
   ============================================================ */
(function initKeyboard() {
  const wrap      = $('keyboard-wrap');
  const keyLabel  = $('key-label');
  const codeLabel = $('key-code-label');
  const pctLabel  = $('key-pct-label');
  const video     = $('main-video');
  const videoOverlay = $('video-unmute-overlay');
  let videoAutoplayTriggered = false;

  /*
    Layout definition.
    Each row is an array of key-objects:
      label  : text shown on key (use \n for two-line)
      code   : KeyboardEvent.code value
      w      : flex-width multiplier (default 1)
      sub    : for composite keys containing two stacked halves
               sub = [{ label, code }, { label, code }]
  */
  const ROWS = [
    // ── Row 0: Chromebook function row ──────────────────────
    [
      { label: 'Esc',  code: 'Escape'          },
      { label: '←',    code: 'BrowserBack'     },
      { label: '→',    code: 'BrowserForward'  },
      { label: '↺',    code: 'BrowserRefresh'  },
      { label: '⛶',   code: 'F4'              },
      { label: '☀−',   code: 'F5'              },
      { label: '☀+',   code: 'F6'              },
      { label: '🔇',   code: 'AudioVolumeMute' },
      { label: '🔉',   code: 'AudioVolumeDown' },
      { label: '🔊',   code: 'AudioVolumeUp'   },
      { label: '⏻',    code: 'Power'           },
    ],
    // ── Row 1: Number row ────────────────────────────────────
    [
      { label: '`\n~',     code: 'Backquote'   },
      { label: '1\n!',     code: 'Digit1'      },
      { label: '2\n@',     code: 'Digit2'      },
      { label: '3\n#',     code: 'Digit3'      },
      { label: '4\n$',     code: 'Digit4'      },
      { label: '5\n%',     code: 'Digit5'      },
      { label: '6\n^',     code: 'Digit6'      },
      { label: '7\n&',     code: 'Digit7'      },
      { label: '8\n*',     code: 'Digit8'      },
      { label: '9\n(',     code: 'Digit9'      },
      { label: '0\n)',     code: 'Digit0'      },
      { label: '-\n_',     code: 'Minus'       },
      { label: '=\n+',     code: 'Equal'       },
      { label: '⌫\nBksp',  code: 'Backspace',  w: 2   },
    ],
    // ── Row 2: QWERTY ────────────────────────────────────────
    [
      { label: 'Tab',      code: 'Tab',         w: 1.5 },
      { label: 'Q',        code: 'KeyQ'         },
      { label: 'W',        code: 'KeyW'         },
      { label: 'E',        code: 'KeyE'         },
      { label: 'R',        code: 'KeyR'         },
      { label: 'T',        code: 'KeyT'         },
      { label: 'Y',        code: 'KeyY'         },
      { label: 'U',        code: 'KeyU'         },
      { label: 'I',        code: 'KeyI'         },
      { label: 'O',        code: 'KeyO'         },
      { label: 'P',        code: 'KeyP'         },
      { label: '[\n{',     code: 'BracketLeft'  },
      { label: ']\n}',     code: 'BracketRight' },
      { label: '\\\n|',    code: 'Backslash',   w: 1.5 },
    ],
    // ── Row 3: ASDF ──────────────────────────────────────────
    [
      { label: 'Search\n🔍',code: 'CapsLock',   w: 1.75 },
      { label: 'A',         code: 'KeyA'        },
      { label: 'S',         code: 'KeyS'        },
      { label: 'D',         code: 'KeyD'        },
      { label: 'F',         code: 'KeyF'        },
      { label: 'G',         code: 'KeyG'        },
      { label: 'H',         code: 'KeyH'        },
      { label: 'J',         code: 'KeyJ'        },
      { label: 'K',         code: 'KeyK'        },
      { label: 'L',         code: 'KeyL'        },
      { label: ';\n:',      code: 'Semicolon'   },
      { label: '\'\n"',     code: 'Quote'       },
      { label: '↵\nEnter',  code: 'Enter',      w: 2.25 },
    ],
    // ── Row 4: ZXCV ──────────────────────────────────────────
    [
      { label: '⇧\nShift',  code: 'ShiftLeft',  w: 2.25 },
      { label: 'Z',         code: 'KeyZ'        },
      { label: 'X',         code: 'KeyX'        },
      { label: 'C',         code: 'KeyC'        },
      { label: 'V',         code: 'KeyV'        },
      { label: 'B',         code: 'KeyB'        },
      { label: 'N',         code: 'KeyN'        },
      { label: 'M',         code: 'KeyM'        },
      { label: ',\n<',      code: 'Comma'       },
      { label: '.\n>',      code: 'Period'      },
      { label: '/\n?',      code: 'Slash'       },
      { label: '⇧\nShift',  code: 'ShiftRight', w: 2.75 },
    ],
    // ── Row 5: Bottom ────────────────────────────────────────
    [
      { label: 'Ctrl',      code: 'ControlLeft',  w: 1.5  },
      { label: '⊞\nAlt',   code: 'AltLeft',      w: 1.25 },
      { label: 'Space',     code: 'Space',         w: 6.25 },
      { label: 'Alt',       code: 'AltRight',     w: 1.25 },
      { label: 'Ctrl',      code: 'ControlRight', w: 1.5  },
      // Arrow keys cluster
      { label: '◀',         code: 'ArrowLeft',    w: 1    },
      // Stacked Up/Down
      { label: null, code: null, w: 1, sub: [
          { label: '▲', code: 'ArrowUp'   },
          { label: '▼', code: 'ArrowDown' },
        ]
      },
      { label: '▶',         code: 'ArrowRight',   w: 1    },
    ],
  ];

  // Map: code → [elements]
  const keyMap = {};
  const allCodes = new Set();
  const pressedCodes = new Set();

  function registerEl(code, el) {
    if (!keyMap[code]) keyMap[code] = [];
    keyMap[code].push(el);
    allCodes.add(code);
  }

  // Build DOM
  ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';

    row.forEach(k => {
      // Stacked sub-key container
      if (k.sub) {
        const container = document.createElement('div');
        container.className = 'key';
        container.style.cssText = `flex:${k.w||1}; flex-direction:column; gap:2px; padding:2px; background:transparent; border-color:transparent; cursor:default;`;
        k.sub.forEach(sk => {
          const el = document.createElement('div');
          el.className = 'key';
          el.dataset.code = sk.code;
          el.style.cssText = 'flex:1; min-height:0; font-size:9px; border-radius:4px;';
          el.textContent = sk.label;
          registerEl(sk.code, el);
          container.appendChild(el);
        });
        rowEl.appendChild(container);
        return;
      }

      const el = document.createElement('div');
      el.className = 'key';
      el.dataset.code = k.code;
      if (k.w) el.style.flex = k.w;
      el.textContent = k.label ?? '';
      registerEl(k.code, el);
      rowEl.appendChild(el);
    });

    wrap.appendChild(rowEl);
  });

  const totalKeys = allCodes.size;

  // ── Flash (blue, keydown → keyup) ──
  function setPressed(code, on) {
    (keyMap[code] || []).forEach(el => {
      if (on) el.classList.add('pressed');
      else    el.classList.remove('pressed');
    });
  }

  // ── Activate (green, permanent) ──
  function activate(code) {
    if (pressedCodes.has(code)) return;
    (keyMap[code] || []).forEach(el => el.classList.add('activated'));
    pressedCodes.add(code);
  }

  function updateInfo(keyName, code) {
    keyLabel.textContent  = `Key: ${keyName}`;
    codeLabel.textContent = `Code: ${code}`;
    const pct = Math.round((pressedCodes.size / totalKeys) * 100);
    pctLabel.textContent  = `${pct}% keys pressed  (${pressedCodes.size} / ${totalKeys})`;
  }

  // Track which codes are physically held (for multi-key accuracy)
  const heldCodes = new Set();

  document.addEventListener('keydown', e => {
    e.preventDefault();
    const code = e.code;
    if (heldCodes.has(code)) return; // skip auto-repeat
    heldCodes.add(code);
    setPressed(code, true);
    activate(code);
    const keyName = e.key === ' ' ? 'Space' : e.key;
    updateInfo(keyName, code);
    playClick();
    
    // Auto-play video with audio when any key is pressed
    if (!videoAutoplayTriggered) {
      videoAutoplayTriggered = true;
      video.muted = false;
      video.volume = 0.8;
      videoOverlay.classList.add('hidden');
      video.play().catch(() => {});
    }
  }, true);

  document.addEventListener('keyup', e => {
    const code = e.code;
    heldCodes.delete(code);
    setPressed(code, false);
  }, true);

  // Initial state
  keyLabel.textContent  = 'Press any key…';
  codeLabel.textContent = '';
  pctLabel.textContent  = `0% keys pressed  (0 / ${totalKeys})`;
})();

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  doLayout();
  setTimeout(doLayout, 80);
  setTimeout(doLayout, 350);
});
window.addEventListener('load', () => {
  doLayout();
  setTimeout(doLayout, 150);
});
