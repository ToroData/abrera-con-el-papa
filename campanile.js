/* =========================================================
   Campanile — constellation points that trace the bell tower
   of Sant Pere Apòstol d'Abrera.
   Used for: loader reveal + nav/footer logomark.
   Coordinates normalized to a 100 x 115 viewBox.
   ========================================================= */

window.CAMPANILE = {
  viewBox: { w: 100, h: 115 },
  // Ordered points — draws from base up, then cross last
  points: [
    // Base plinth
    { x: 28,  y: 105 }, { x: 72, y: 105 },
    { x: 28,  y: 100 }, { x: 72, y: 100 },
    // Lower body left/right verticals
    { x: 30,  y: 88  }, { x: 70, y: 88  },
    // Door level
    { x: 45,  y: 100 }, { x: 55, y: 100 },
    { x: 45,  y: 86  }, { x: 55, y: 86  },
    // Mid level windows (upper body)
    { x: 30,  y: 72  }, { x: 70, y: 72  },
    { x: 40,  y: 70  }, { x: 60, y: 70  },
    { x: 40,  y: 55  }, { x: 60, y: 55  },
    // Division line
    { x: 28,  y: 50  }, { x: 72, y: 50  },
    // Top arches (belfry)
    { x: 28,  y: 38  }, { x: 72, y: 38  },
    { x: 36,  y: 36  }, { x: 64, y: 36  },
    { x: 36,  y: 22  }, { x: 64, y: 22  },
    // Cornice
    { x: 26,  y: 18  }, { x: 74, y: 18  },
    { x: 30,  y: 14  }, { x: 70, y: 14  },
    // Roof pitch
    { x: 40,  y: 8   }, { x: 60, y: 8   },
    { x: 50,  y: 4   },
    // Cross
    { x: 50,  y: 0   },
    { x: 46,  y: 2   }, { x: 54, y: 2   },
  ],
  // Pairs of indices — lines connecting points to form the outline
  lines: [
    // base
    [0, 1], [2, 3], [0, 2], [1, 3],
    // lower body verticals
    [2, 4], [3, 5],
    // door
    [6, 8], [7, 9], [8, 9],
    // upper body outline
    [4, 10], [5, 11],
    // arches (columns)
    [10, 18], [11, 19],
    // inner belfry windows
    [12, 14], [13, 15], [14, 15],
    // division line
    [16, 17],
    // cornice
    [18, 24], [19, 25],
    [24, 26], [25, 27],
    [26, 28], [27, 29],
    // roof peak
    [28, 30], [29, 30],
    // cross vertical
    [30, 31],
    // cross horizontal
    [32, 33],
  ],
};

// Helper: render as SVG (for nav logo, footer logo, inline)
window.renderCampanileSVG = function (opts) {
  opts = opts || {};
  const stroke = opts.stroke || 'currentColor';
  const strokeWidth = opts.strokeWidth || 1;
  const dots = opts.dots !== false;
  const c = window.CAMPANILE;

  let paths = '';
  c.lines.forEach((l) => {
    const a = c.points[l[0]];
    const b = c.points[l[1]];
    if (!a || !b) return;
    paths += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
  });
  let circles = '';
  if (dots) {
    c.points.forEach((p) => {
      circles += `<circle cx="${p.x}" cy="${p.y}" r="${(opts.dotR || 1.2)}" fill="${stroke}" />`;
    });
  }
  return `<svg viewBox="0 0 ${c.viewBox.w} ${c.viewBox.h}" xmlns="http://www.w3.org/2000/svg">${paths}${circles}</svg>`;
};


/*
window.CAMPANILE = (function () {
  // Points are laid out to follow the logo's silhouette: cross
  // on top, pitched roof, flared belfry cornice, upper body with
  // paired belfry arches, narrower mid body with tall windows,
  // stepped base with a central door flanked by pillars.
  const P = [
    // --- 0..3 : cross (tiny top)
    { x: 50.0, y: 1.5  }, // 0  cross tip
    { x: 50.0, y: 6.0  }, // 1  cross stem base
    { x: 46.5, y: 3.5  }, // 2  cross arm L
    { x: 53.5, y: 3.5  }, // 3  cross arm R

    // --- 4..7 : roof pyramid (narrow apex → flared eaves)
    { x: 50.0, y: 8.0  }, // 4  pyramid apex
    { x: 38.0, y: 18.5 }, // 5  roof eave L
    { x: 62.0, y: 18.5 }, // 6  roof eave R
    { x: 50.0, y: 18.5 }, // 7  roof mid

    // --- 8..11 : flared cornice above the belfry (wider than belfry)
    { x: 28.5, y: 21.0 }, // 8  cornice outer L top
    { x: 71.5, y: 21.0 }, // 9  cornice outer R top
    { x: 30.5, y: 25.0 }, // 10 cornice inner L
    { x: 69.5, y: 25.0 }, // 11 cornice inner R

    // --- 12..19 : belfry — three paired arches (L column / L arch / R arch / R column)
    { x: 32.0, y: 28.0 }, // 12 belfry L column top
    { x: 68.0, y: 28.0 }, // 13 belfry R column top
    { x: 32.0, y: 44.0 }, // 14 belfry L column bottom
    { x: 68.0, y: 44.0 }, // 15 belfry R column bottom
    { x: 42.0, y: 30.0 }, // 16 center arch L jamb
    { x: 58.0, y: 30.0 }, // 17 center arch R jamb
    { x: 42.0, y: 44.0 }, // 18 center arch L base
    { x: 58.0, y: 44.0 }, // 19 center arch R base

    // --- 20..23 : division line (narrowing into tower body)
    { x: 30.0, y: 46.0 }, // 20 div L outer
    { x: 70.0, y: 46.0 }, // 21 div R outer
    { x: 34.0, y: 49.0 }, // 22 div L inner
    { x: 66.0, y: 49.0 }, // 23 div R inner

    // --- 24..29 : tower body — tall central twin windows
    { x: 34.0, y: 72.0 }, // 24 body L outer bottom
    { x: 66.0, y: 72.0 }, // 25 body R outer bottom
    { x: 42.0, y: 52.0 }, // 26 window L top
    { x: 58.0, y: 52.0 }, // 27 window R top
    { x: 42.0, y: 72.0 }, // 28 window L base
    { x: 58.0, y: 72.0 }, // 29 window R base

    // --- 30..37 : base — stepped plinth with pilasters flaring outward
    { x: 30.0, y: 75.0 }, // 30 plinth shoulder L
    { x: 70.0, y: 75.0 }, // 31 plinth shoulder R
    { x: 22.0, y: 77.0 }, // 32 pilaster L top
    { x: 78.0, y: 77.0 }, // 33 pilaster R top
    { x: 22.0, y: 104.0}, // 34 pilaster L bottom
    { x: 78.0, y: 104.0}, // 35 pilaster R bottom
    { x: 18.0, y: 108.0}, // 36 base step L outer
    { x: 82.0, y: 108.0}, // 37 base step R outer

    // --- 38..43 : central arched doorway at base
    { x: 42.0, y: 82.0 }, // 38 door L jamb top
    { x: 58.0, y: 82.0 }, // 39 door R jamb top
    { x: 42.0, y: 104.0}, // 40 door L jamb bottom
    { x: 58.0, y: 104.0}, // 41 door R jamb bottom
    { x: 50.0, y: 80.0 }, // 42 door arch crown
    { x: 50.0, y: 104.0}, // 43 threshold center

    // --- 44..45 : ground line (full width base)
    { x: 18.0, y: 112.0}, // 44 ground L
    { x: 82.0, y: 112.0}, // 45 ground R
  ];

  const L = [
    // cross
    [0, 1], [2, 3],
    // roof pyramid
    [1, 4], [4, 5], [4, 6], [5, 7], [6, 7], [5, 6],
    // eaves → flared cornice
    [5, 8], [6, 9], [8, 10], [9, 11], [10, 11],
    // belfry columns
    [10, 12], [11, 13], [12, 14], [13, 15], [14, 15],
    // belfry arch — inner vertical jambs
    [16, 18], [17, 19], [18, 19],
    // division transition
    [14, 20], [15, 21], [20, 22], [21, 23], [22, 23],
    // tower body outer walls
    [22, 24], [23, 25], [24, 25],
    // central twin windows
    [26, 28], [27, 29], [28, 29],
    // step out to plinth pilasters
    [24, 30], [25, 31], [30, 32], [31, 33],
    // pilasters
    [32, 34], [33, 35],
    // base step out
    [34, 36], [35, 37], [36, 44], [37, 45], [44, 45],
    // central arched doorway
    [38, 42], [39, 42], [38, 40], [39, 41], [40, 41],
  ];

  return { viewBox: { w: 100, h: 113 }, points: P, lines: L };
})();

// ---------- Helper: render as SVG (for inline logos) ----------
window.renderCampanileSVG = function (opts) {
  opts = opts || {};
  const stroke = opts.stroke || 'currentColor';
  const strokeWidth = opts.strokeWidth || 1;
  const dots = opts.dots !== false;
  const c = window.CAMPANILE;

  let paths = '';
  c.lines.forEach((l) => {
    const a = c.points[l[0]];
    const b = c.points[l[1]];
    if (!a || !b) return;
    paths += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
  });

  let circles = '';
  if (dots) {
    c.points.forEach((p) => {
      circles += `<circle cx="${p.x}" cy="${p.y}" r="${opts.dotR || 1.2}" fill="${stroke}" />`;
    });
  }

  return `<svg viewBox="0 0 ${c.viewBox.w} ${c.viewBox.h}" xmlns="http://www.w3.org/2000/svg">${paths}${circles}</svg>`;
};
*/
