'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLS = 10;
const ROWS = 20;
const BLOCK = 30; // pixel size of one cell

const COLORS = {
  I: '#00cfcf',
  O: '#f5e642',
  T: '#a000f0',
  S: '#00c000',
  Z: '#e02020',
  J: '#0000e0',
  L: '#f0a000',
  ghost: 'rgba(255,255,255,0.15)',
};

// Tetromino shapes (rotation states, each is a 4x4 matrix of 0/1)
const TETROMINOES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  S: [
    [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  Z: [
    [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
  ],
  J: [
    [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
  ],
  L: [
    [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
};

// SRS wall-kick offsets (non-I pieces)
const KICKS = {
  '0>1': [[ 0,0],[-1,0],[-1, 1],[ 0,-2],[-1,-2]],
  '1>0': [[ 0,0],[ 1,0],[ 1,-1],[ 0, 2],[ 1, 2]],
  '1>2': [[ 0,0],[ 1,0],[ 1,-1],[ 0, 2],[ 1, 2]],
  '2>1': [[ 0,0],[-1,0],[-1, 1],[ 0,-2],[-1,-2]],
  '2>3': [[ 0,0],[ 1,0],[ 1, 1],[ 0,-2],[ 1,-2]],
  '3>2': [[ 0,0],[-1,0],[-1,-1],[ 0, 2],[-1, 2]],
  '3>0': [[ 0,0],[-1,0],[-1,-1],[ 0, 2],[-1, 2]],
  '0>3': [[ 0,0],[ 1,0],[ 1, 1],[ 0,-2],[ 1,-2]],
};

// SRS wall-kick offsets for I piece
const KICKS_I = {
  '0>1': [[ 0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
  '1>0': [[ 0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
  '1>2': [[ 0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]],
  '2>1': [[ 0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
  '2>3': [[ 0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
  '3>2': [[ 0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
  '3>0': [[ 0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
  '0>3': [[ 0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]],
};

// Points per number of lines cleared at once
const LINE_POINTS = [0, 100, 300, 500, 800];

// Drop interval in ms per level (level index = level-1, capped at 15)
function dropInterval(level) {
  return Math.max(50, 1000 - (level - 1) * 65);
}

// ---------------------------------------------------------------------------
// Bag randomizer (7-bag)
// ---------------------------------------------------------------------------
class Bag {
  constructor() {
    this._bag = [];
  }
  next() {
    if (this._bag.length === 0) {
      this._bag = Object.keys(TETROMINOES);
      for (let i = this._bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._bag[i], this._bag[j]] = [this._bag[j], this._bag[i]];
      }
    }
    return this._bag.pop();
  }
}

// ---------------------------------------------------------------------------
// Piece
// ---------------------------------------------------------------------------
class Piece {
  constructor(type) {
    this.type = type;
    this.rotIdx = 0;
    this.x = 3;
    this.y = 0;
  }
  get shape() {
    return TETROMINOES[this.type][this.rotIdx];
  }
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
class Board {
  constructor() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  // Returns true if piece collides at given offset
  collides(piece, dx = 0, dy = 0, rotIdx = piece.rotIdx) {
    const shape = TETROMINOES[piece.type][rotIdx];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!shape[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && this.grid[ny][nx]) return true;
      }
    }
    return false;
  }

  lock(piece) {
    const shape = piece.shape;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!shape[r][c]) continue;
        const ny = piece.y + r;
        if (ny < 0) return false; // piece locked above board = game over
        this.grid[ny][piece.x + c] = piece.type;
      }
    }
    return true;
  }

  clearLines() {
    let count = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== null)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(COLS).fill(null));
        count++;
        r++; // re-check same row index
      }
    }
    return count;
  }

  isAboveBoard(piece) {
    // Check if any occupied cell is above row 0
    const shape = piece.shape;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c] && piece.y + r < 0) return true;
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
class Renderer {
  constructor(boardCanvas, nextCanvas, holdCanvas) {
    this.boardCtx = boardCanvas.getContext('2d');
    this.nextCtx = nextCanvas.getContext('2d');
    this.holdCtx = holdCanvas.getContext('2d');
  }

  drawBlock(ctx, x, y, color, size = BLOCK) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    ctx.fillRect(x * size + 1, y * size + 1, 4, size - 2);
  }

  drawGrid(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, h);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(w, r * BLOCK);
      ctx.stroke();
    }
  }

  renderBoard(board, current, ghost) {
    const ctx = this.boardCtx;
    const w = COLS * BLOCK;
    const h = ROWS * BLOCK;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, w, h);
    this.drawGrid(ctx, w, h);

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board.grid[r][c]) {
          this.drawBlock(ctx, c, r, COLORS[board.grid[r][c]]);
        }
      }
    }

    // Ghost piece
    if (ghost) {
      const shape = ghost.shape;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (shape[r][c]) {
            const gx = ghost.x + c;
            const gy = ghost.y + r;
            if (gy >= 0) {
              ctx.fillStyle = COLORS.ghost;
              ctx.fillRect(gx * BLOCK + 1, gy * BLOCK + 1, BLOCK - 2, BLOCK - 2);
            }
          }
        }
      }
    }

    // Current piece
    if (current) {
      const shape = current.shape;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (shape[r][c]) {
            const px = current.x + c;
            const py = current.y + r;
            if (py >= 0) this.drawBlock(ctx, px, py, COLORS[current.type]);
          }
        }
      }
    }
  }

  renderPreview(ctx, type, canvasW, canvasH) {
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, canvasW, canvasH);
    if (!type) return;

    const shape = TETROMINOES[type][0];
    const size = 24;
    // Find bounding box
    let minR = 4, maxR = -1, minC = 4, maxC = -1;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    const w = (maxC - minC + 1) * size;
    const h = (maxR - minR + 1) * size;
    const offX = Math.floor((canvasW - w) / 2 / size) - minC;
    const offY = Math.floor((canvasH - h) / 2 / size) - minR;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          this.drawBlock(ctx, c + offX, r + offY, COLORS[type], size);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
class Game {
  constructor() {
    this.boardCanvas = document.getElementById('board');
    this.nextCanvas = document.getElementById('next');
    this.holdCanvas = document.getElementById('hold');
    this.scoreEl = document.getElementById('score');
    this.levelEl = document.getElementById('level');
    this.linesEl = document.getElementById('lines');
    this.overlay = document.getElementById('overlay');
    this.overlayMsg = document.getElementById('overlay-message');
    this.startBtn = document.getElementById('start-btn');

    this.renderer = new Renderer(this.boardCanvas, this.nextCanvas, this.holdCanvas);
    this.bag = new Bag();

    this.state = 'idle'; // 'idle' | 'playing' | 'paused' | 'gameover'
    this._rafId = null;
    this._lastTime = 0;
    this._dropCounter = 0;
    this._lockDelay = 0;
    this._lockDelayMax = 500;
    this._lockMoves = 0;
    this._lockMovesMax = 15;
    this._onGround = false;

    this.showOverlay('テトリスへようこそ！');
    this.startBtn.addEventListener('click', () => this.start());
    document.addEventListener('keydown', e => this.handleKey(e));
  }

  showOverlay(msg) {
    this.overlayMsg.textContent = msg;
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  start() {
    this.board = new Board();
    this.bag = new Bag();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.holdType = null;
    this.holdUsed = false;
    this._dropCounter = 0;
    this._lockDelay = 0;
    this._lockMoves = 0;
    this._onGround = false;

    this.updateUI();
    this.nextType = this.bag.next();
    this.spawnPiece();

    this.state = 'playing';
    this.hideOverlay();
    this._lastTime = performance.now();
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(ts => this.loop(ts));
  }

  spawnPiece() {
    this.current = new Piece(this.nextType);
    this.nextType = this.bag.next();
    this.holdUsed = false;

    // If spawned piece immediately collides, game over
    if (this.board.collides(this.current)) {
      this.gameOver();
    }
  }

  calcGhost() {
    const ghost = new Piece(this.current.type);
    ghost.rotIdx = this.current.rotIdx;
    ghost.x = this.current.x;
    ghost.y = this.current.y;
    while (!this.board.collides(ghost, 0, 1)) {
      ghost.y++;
    }
    return ghost;
  }

  loop(timestamp) {
    if (this.state !== 'playing') return;

    const delta = timestamp - this._lastTime;
    this._lastTime = timestamp;

    this._dropCounter += delta;
    const interval = dropInterval(this.level);

    if (this._onGround) {
      this._lockDelay += delta;
      if (this._lockDelay >= this._lockDelayMax || this._lockMoves >= this._lockMovesMax) {
        this.lockPiece();
      }
    } else if (this._dropCounter >= interval) {
      this.moveDown();
      this._dropCounter = 0;
    }

    this.render();
    this._rafId = requestAnimationFrame(ts => this.loop(ts));
  }

  moveDown() {
    if (!this.board.collides(this.current, 0, 1)) {
      this.current.y++;
      this._onGround = false;
      this._lockDelay = 0;
    } else {
      this._onGround = true;
    }
  }

  lockPiece() {
    const ok = this.board.lock(this.current);
    if (!ok || this.board.isAboveBoard(this.current)) {
      this.gameOver();
      return;
    }

    const cleared = this.board.clearLines();
    if (cleared > 0) {
      this.lines += cleared;
      this.score += LINE_POINTS[cleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.updateUI();
    }

    this._dropCounter = 0;
    this._lockDelay = 0;
    this._lockMoves = 0;
    this._onGround = false;
    this.spawnPiece();
  }

  tryMove(dx, dy) {
    if (!this.board.collides(this.current, dx, dy)) {
      this.current.x += dx;
      this.current.y += dy;
      this._dropCounter = 0;
      if (this._onGround) {
        this._lockMoves++;
        this._lockDelay = 0;
      }
      this.checkGround();
      return true;
    }
    return false;
  }

  checkGround() {
    this._onGround = this.board.collides(this.current, 0, 1);
  }

  tryRotate(dir) {
    const oldRot = this.current.rotIdx;
    const newRot = (oldRot + dir + 4) % 4;
    const key = `${oldRot}>${newRot}`;
    const kicks = this.current.type === 'I' ? KICKS_I[key] : KICKS[key];

    for (const [kx, ky] of kicks) {
      if (!this.board.collides(this.current, kx, -ky, newRot)) {
        this.current.x += kx;
        this.current.y -= ky;
        this.current.rotIdx = newRot;
        if (this._onGround) {
          this._lockMoves++;
          this._lockDelay = 0;
        }
        this.checkGround();
        return;
      }
    }
  }

  hardDrop() {
    let dropped = 0;
    while (!this.board.collides(this.current, 0, 1)) {
      this.current.y++;
      dropped++;
    }
    this.score += dropped * 2;
    this.updateUI();
    this.lockPiece();
  }

  holdPiece() {
    if (this.holdUsed) return;
    const prev = this.holdType;
    this.holdType = this.current.type;
    this.holdUsed = true;
    if (prev) {
      this.current = new Piece(prev);
    } else {
      this.spawnPiece();
      return;
    }
    if (this.board.collides(this.current)) {
      this.gameOver();
    }
  }

  gameOver() {
    this.state = 'gameover';
    cancelAnimationFrame(this._rafId);
    this.render();
    this.startBtn.textContent = 'もう一度';
    this.showOverlay(`ゲームオーバー\nスコア: ${this.score}`);
  }

  updateUI() {
    this.scoreEl.textContent = this.score;
    this.levelEl.textContent = this.level;
    this.linesEl.textContent = this.lines;
  }

  render() {
    const ghost = this.state === 'playing' ? this.calcGhost() : null;
    this.renderer.renderBoard(this.board, this.current, ghost);
    this.renderer.renderPreview(this.renderer.nextCtx, this.nextType, 120, 120);
    this.renderer.renderPreview(this.renderer.holdCtx, this.holdType, 120, 120);
  }

  handleKey(e) {
    if (this.state === 'gameover' || this.state === 'idle') return;

    if (e.code === 'KeyP') {
      if (this.state === 'playing') {
        this.state = 'paused';
        this.showOverlay('一時停止中');
        this.startBtn.textContent = '再開';
      } else if (this.state === 'paused') {
        this.state = 'playing';
        this.hideOverlay();
        this.startBtn.textContent = 'スタート';
        this._lastTime = performance.now();
        this._rafId = requestAnimationFrame(ts => this.loop(ts));
      }
      return;
    }

    if (this.state !== 'playing') return;

    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        this.tryMove(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.tryMove(1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!this.board.collides(this.current, 0, 1)) {
          this.current.y++;
          this.score += 1;
          this.updateUI();
          this._dropCounter = 0;
          this.checkGround();
        }
        break;
      case 'ArrowUp':
      case 'KeyX':
        e.preventDefault();
        this.tryRotate(1);
        break;
      case 'KeyZ':
        e.preventDefault();
        this.tryRotate(-1);
        break;
      case 'Space':
        e.preventDefault();
        this.hardDrop();
        break;
      case 'KeyC':
        e.preventDefault();
        this.holdPiece();
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
