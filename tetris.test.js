'use strict';

const {
  COLS,
  ROWS,
  BLOCK,
  COLORS,
  TETROMINOES,
  KICKS,
  KICKS_I,
  LINE_POINTS,
  dropInterval,
  Bag,
  Piece,
  Board,
} = require('./tetris');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('Constants', () => {
  test('COLS is 10 and ROWS is 20', () => {
    expect(COLS).toBe(10);
    expect(ROWS).toBe(20);
  });

  test('BLOCK size is 30', () => {
    expect(BLOCK).toBe(30);
  });

  test('COLORS has entries for all 7 tetrominoes and ghost', () => {
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (const t of types) {
      expect(COLORS[t]).toBeDefined();
    }
    expect(COLORS.ghost).toBeDefined();
  });

  test('TETROMINOES has 7 piece types, each with 4 rotation states', () => {
    const types = Object.keys(TETROMINOES);
    expect(types).toHaveLength(7);
    for (const t of types) {
      expect(TETROMINOES[t]).toHaveLength(4);
      for (const rot of TETROMINOES[t]) {
        expect(rot).toHaveLength(4);
        for (const row of rot) {
          expect(row).toHaveLength(4);
        }
      }
    }
  });

  test('LINE_POINTS awards correct points per line count', () => {
    expect(LINE_POINTS).toEqual([0, 100, 300, 500, 800]);
  });

  test('KICKS has entries for all standard rotation transitions', () => {
    const keys = ['0>1', '1>0', '1>2', '2>1', '2>3', '3>2', '3>0', '0>3'];
    for (const k of keys) {
      expect(KICKS[k]).toHaveLength(5);
      expect(KICKS_I[k]).toHaveLength(5);
    }
  });
});

// ---------------------------------------------------------------------------
// dropInterval
// ---------------------------------------------------------------------------
describe('dropInterval', () => {
  test('level 1 returns 1000ms', () => {
    expect(dropInterval(1)).toBe(1000);
  });

  test('level 2 returns 935ms', () => {
    expect(dropInterval(2)).toBe(935);
  });

  test('speed increases with level', () => {
    expect(dropInterval(5)).toBeLessThan(dropInterval(1));
  });

  test('never goes below 50ms', () => {
    expect(dropInterval(100)).toBe(50);
    expect(dropInterval(1000)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Bag
// ---------------------------------------------------------------------------
describe('Bag', () => {
  test('produces exactly 7 unique pieces per cycle', () => {
    const bag = new Bag();
    const pieces = [];
    for (let i = 0; i < 7; i++) {
      pieces.push(bag.next());
    }
    const unique = new Set(pieces);
    expect(unique.size).toBe(7);
    for (const t of Object.keys(TETROMINOES)) {
      expect(unique.has(t)).toBe(true);
    }
  });

  test('second cycle also contains all 7 pieces', () => {
    const bag = new Bag();
    // exhaust first bag
    for (let i = 0; i < 7; i++) bag.next();
    // collect second bag
    const pieces = [];
    for (let i = 0; i < 7; i++) pieces.push(bag.next());
    expect(new Set(pieces).size).toBe(7);
  });

  test('next always returns a valid tetromino type', () => {
    const bag = new Bag();
    const validTypes = Object.keys(TETROMINOES);
    for (let i = 0; i < 21; i++) {
      expect(validTypes).toContain(bag.next());
    }
  });
});

// ---------------------------------------------------------------------------
// Piece
// ---------------------------------------------------------------------------
describe('Piece', () => {
  test('constructor sets initial position and rotation', () => {
    const p = new Piece('T');
    expect(p.type).toBe('T');
    expect(p.x).toBe(3);
    expect(p.y).toBe(0);
    expect(p.rotIdx).toBe(0);
  });

  test('shape getter returns the correct rotation matrix', () => {
    const p = new Piece('I');
    expect(p.shape).toBe(TETROMINOES.I[0]);
    p.rotIdx = 1;
    expect(p.shape).toBe(TETROMINOES.I[1]);
  });

  test('all piece types can be created', () => {
    for (const t of Object.keys(TETROMINOES)) {
      const p = new Piece(t);
      expect(p.type).toBe(t);
      expect(p.shape).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
describe('Board', () => {
  describe('constructor', () => {
    test('creates an empty grid of ROWS x COLS', () => {
      const board = new Board();
      expect(board.grid).toHaveLength(ROWS);
      for (const row of board.grid) {
        expect(row).toHaveLength(COLS);
        expect(row.every(c => c === null)).toBe(true);
      }
    });
  });

  describe('collides', () => {
    test('piece does not collide on empty board at spawn', () => {
      const board = new Board();
      const piece = new Piece('T');
      expect(board.collides(piece)).toBe(false);
    });

    test('piece collides when moving past left wall', () => {
      const board = new Board();
      const piece = new Piece('T');
      piece.x = -2;
      expect(board.collides(piece)).toBe(true);
    });

    test('piece collides when moving past right wall', () => {
      const board = new Board();
      const piece = new Piece('T');
      piece.x = COLS - 1;
      expect(board.collides(piece)).toBe(true);
    });

    test('piece collides when moving past bottom', () => {
      const board = new Board();
      const piece = new Piece('T');
      piece.y = ROWS;
      expect(board.collides(piece)).toBe(true);
    });

    test('piece collides with locked blocks', () => {
      const board = new Board();
      // Place a block in the grid where a T piece at spawn would overlap
      board.grid[1][4] = 'T';
      const piece = new Piece('T');
      expect(board.collides(piece)).toBe(true);
    });

    test('dx and dy offsets are respected', () => {
      const board = new Board();
      const piece = new Piece('O');
      piece.y = ROWS - 2;
      // No collision at current position
      expect(board.collides(piece, 0, 0)).toBe(false);
      // Collision moving down by 1
      expect(board.collides(piece, 0, 1)).toBe(true);
    });

    test('rotIdx parameter is respected', () => {
      const board = new Board();
      const piece = new Piece('I');
      piece.x = 0;
      piece.y = 0;
      // Rotation 0 of I-piece has blocks at row 1, cols 0-3 => no collision
      expect(board.collides(piece, 0, 0, 0)).toBe(false);
      // Rotation 1 of I-piece has blocks at col 2, rows 0-3 => no collision on empty board
      expect(board.collides(piece, 0, 0, 1)).toBe(false);
    });
  });

  describe('lock', () => {
    test('locks a piece onto the grid', () => {
      const board = new Board();
      const piece = new Piece('O');
      piece.y = 0;
      board.lock(piece);
      // O piece at rotation 0, rows 0-1, cols 4-5
      expect(board.grid[0][4]).toBe('O');
      expect(board.grid[0][5]).toBe('O');
      expect(board.grid[1][4]).toBe('O');
      expect(board.grid[1][5]).toBe('O');
    });

    test('returns true when piece is locked normally', () => {
      const board = new Board();
      const piece = new Piece('T');
      piece.y = 5;
      expect(board.lock(piece)).toBe(true);
    });

    test('returns false when piece is above the board (game over)', () => {
      const board = new Board();
      const piece = new Piece('T');
      piece.y = -1; // T piece row 0 has a block, so y=-1 means that block is at row -1
      expect(board.lock(piece)).toBe(false);
    });
  });

  describe('clearLines', () => {
    test('clears a single full line', () => {
      const board = new Board();
      // Fill the bottom row
      board.grid[ROWS - 1] = Array(COLS).fill('I');
      const cleared = board.clearLines();
      expect(cleared).toBe(1);
      // Bottom row should now be empty
      expect(board.grid[ROWS - 1].every(c => c === null)).toBe(true);
    });

    test('clears multiple full lines', () => {
      const board = new Board();
      board.grid[ROWS - 1] = Array(COLS).fill('I');
      board.grid[ROWS - 2] = Array(COLS).fill('J');
      const cleared = board.clearLines();
      expect(cleared).toBe(2);
    });

    test('does not clear incomplete lines', () => {
      const board = new Board();
      board.grid[ROWS - 1] = Array(COLS).fill('I');
      board.grid[ROWS - 1][0] = null; // leave one gap
      const cleared = board.clearLines();
      expect(cleared).toBe(0);
    });

    test('shifts rows down after clearing', () => {
      const board = new Board();
      // Place a block above the bottom row
      board.grid[ROWS - 2][3] = 'T';
      // Fill the bottom row
      board.grid[ROWS - 1] = Array(COLS).fill('I');
      board.clearLines();
      // The T block should have shifted down from ROWS-2 to ROWS-1
      expect(board.grid[ROWS - 1][3]).toBe('T');
    });

    test('clears 4 lines (tetris)', () => {
      const board = new Board();
      for (let r = ROWS - 4; r < ROWS; r++) {
        board.grid[r] = Array(COLS).fill('L');
      }
      const cleared = board.clearLines();
      expect(cleared).toBe(4);
    });
  });

  describe('isAboveBoard', () => {
    test('returns false when piece is fully on the board', () => {
      const board = new Board();
      const piece = new Piece('T');
      piece.y = 5;
      expect(board.isAboveBoard(piece)).toBe(false);
    });

    test('returns true when piece has cells above row 0', () => {
      const board = new Board();
      const piece = new Piece('T');
      piece.y = -1; // The first row of T has a block at (1,0), so y=-1 means row index -1
      expect(board.isAboveBoard(piece)).toBe(true);
    });

    test('returns false at y=0 for piece starting at row 0', () => {
      const board = new Board();
      const piece = new Piece('T');
      piece.y = 0;
      expect(board.isAboveBoard(piece)).toBe(false);
    });
  });
});
