export function segmentLength(s) {
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
}

export function pointsClose(a, b, tol = 2.0) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= tol;
}

function segmentAngleDeg(s) {
  return (Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI;
}

function signedAngleDiffDeg(a, b) {
  let d = ((b - a + 540) % 360) - 180;
  if (d <= -180) d += 360;
  return d;
}

/**
 * Splits pen-down segments into connected polylines and merges consecutive
 * nearly-collinear segments (< 3 deg difference) into clean edges.
 */
export function getConnectedPaths(segments, options = {}) {
  const opts =
    typeof options === "number"
      ? { tol: options, mergeAngleDeg: 3.0, minSegLen: 0.5 }
      : { tol: 2.5, mergeAngleDeg: 3.0, minSegLen: 0.5, ...options };
  const { tol, mergeAngleDeg, minSegLen } = opts;

  const nonZero = (segments || []).filter((s) => segmentLength(s) > minSegLen);
  if (nonZero.length === 0) return [];

  const rawGroups = [];
  let current = [nonZero[0]];

  for (let i = 1; i < nonZero.length; i++) {
    const prev = current[current.length - 1];
    const seg = nonZero[i];
    const sameTurtle =
      prev.turtle_id === undefined || seg.turtle_id === undefined || prev.turtle_id === seg.turtle_id;
    if (sameTurtle && pointsClose({ x: prev.x2, y: prev.y2 }, { x: seg.x1, y: seg.y1 }, tol)) {
      current.push(seg);
    } else {
      rawGroups.push(current);
      current = [seg];
    }
  }
  rawGroups.push(current);

  return rawGroups.map((group) => {
    const merged = [];
    for (const seg of group) {
      if (merged.length === 0) {
        merged.push({ ...seg });
        continue;
      }
      const last = merged[merged.length - 1];
      const angDiff = Math.abs(signedAngleDiffDeg(segmentAngleDeg(last), segmentAngleDeg(seg)));
      if (angDiff < mergeAngleDeg) {
        last.x2 = seg.x2;
        last.y2 = seg.y2;
      } else {
        merged.push({ ...seg });
      }
    }

    // Also merge closing edge if last and first are collinear in a closed loop
    if (merged.length >= 2) {
      const first = merged[0];
      const last = merged[merged.length - 1];
      if (pointsClose({ x: last.x2, y: last.y2 }, { x: first.x1, y: first.y1 }, tol)) {
        const angDiff = Math.abs(signedAngleDiffDeg(segmentAngleDeg(last), segmentAngleDeg(first)));
        if (angDiff < mergeAngleDeg) {
          first.x1 = last.x1;
          first.y1 = last.y1;
          merged.pop();
        }
      }
    }

    return {
      edges: merged,
      start: { x: merged[0].x1, y: merged[0].y1 },
      end: { x: merged[merged.length - 1].x2, y: merged[merged.length - 1].y2 },
    };
  });
}

export function isClosedPath(path, tol = 4.5) {
  if (!path || !path.edges || path.edges.length < 3) return false;
  return pointsClose(path.start, path.end, tol);
}

export function pathEdgeLengths(path) {
  return (path?.edges || []).map(segmentLength);
}

export function pathExteriorAngles(path, closedTol = 4.5) {
  const edges = path?.edges || [];
  if (edges.length < 2) return [];
  const angles = [];
  for (let i = 0; i < edges.length - 1; i++) {
    angles.push(signedAngleDiffDeg(segmentAngleDeg(edges[i]), segmentAngleDeg(edges[i + 1])));
  }
  if (isClosedPath(path, closedTol)) {
    angles.push(
      signedAngleDiffDeg(segmentAngleDeg(edges[edges.length - 1]), segmentAngleDeg(edges[0]))
    );
  }
  return angles;
}

/**
 * Splits connected pen-down paths whenever a closed sub-loop finishes (3+ edges
 * returning to its start point), so touching shapes drawn without `penup()`
 * (like `draw_square(60); draw_square(110)` from `(0, 0)`) are each recognized!
 */
export function splitClosedShapes(segments, options = {}) {
  const opts =
    typeof options === "number"
      ? { tol: options, mergeAngleDeg: 3.0, minSegLen: 0.5, closeTol: 5.0 }
      : { tol: 2.5, mergeAngleDeg: 3.0, minSegLen: 0.5, closeTol: 5.0, ...options };
  const closeTol = opts.closeTol ?? 5.0;

  // Use raw non-zero segments split by turtle & jump, then split closed cycles before collinear-merging each shape
  const nonZero = (segments || []).filter((s) => segmentLength(s) > opts.minSegLen);
  if (nonZero.length === 0) return [];

  const groups = [];
  let current = [nonZero[0]];
  for (let i = 1; i < nonZero.length; i++) {
    const prev = current[current.length - 1];
    const seg = nonZero[i];
    const sameTurtle =
      prev.turtle_id === undefined || seg.turtle_id === undefined || prev.turtle_id === seg.turtle_id;
    if (sameTurtle && pointsClose({ x: prev.x2, y: prev.y2 }, { x: seg.x1, y: seg.y1 }, opts.tol)) {
      current.push(seg);
    } else {
      groups.push(current);
      current = [seg];
    }
  }
  groups.push(current);

  const shapes = [];
  for (const group of groups) {
    let segStart = 0;
    let edgeCount = 0;
    let lastAngle = null;

    for (let i = 0; i < group.length; i++) {
      const seg = group[i];
      const ang = segmentAngleDeg(seg);
      if (i === segStart) {
        edgeCount = 1;
        lastAngle = ang;
      } else if (Math.abs(signedAngleDiffDeg(lastAngle, ang)) >= opts.mergeAngleDeg) {
        edgeCount += 1;
        lastAngle = ang;
      }

      const startPt = { x: group[segStart].x1, y: group[segStart].y1 };
      const endPt = { x: seg.x2, y: seg.y2 };
      if (edgeCount >= 3 && pointsClose(startPt, endPt, closeTol)) {
        const sub = group.slice(segStart, i + 1);
        shapes.push(...getConnectedPaths(sub, opts));
        segStart = i + 1;
        edgeCount = 0;
        lastAngle = null;
      }
    }

    if (segStart < group.length) {
      shapes.push(...getConnectedPaths(group.slice(segStart), opts));
    }
  }

  return shapes;
}

export function isRegularPolygon(
  path,
  sides,
  { minSide = 20, maxSide = 450, sideTol = 0.08, angleTol = 4.5 } = {}
) {
  if (!isClosedPath(path)) return false;
  if (path.edges.length !== sides) return false;

  const lengths = pathEdgeLengths(path);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (avgLen < minSide || avgLen > maxSide) return false;

  const lengthsOk = lengths.every((len) => Math.abs(len - avgLen) <= avgLen * sideTol + 1.5);
  if (!lengthsOk) return false;

  const signedTurns = pathExteriorAngles(path);
  if (signedTurns.length !== sides) return false;

  // All turns must bend consistently clockwise or counter-clockwise
  const firstSign = Math.sign(signedTurns[0]);
  if (firstSign === 0) return false;
  if (!signedTurns.every((a) => Math.sign(a) === firstSign)) return false;

  const expectedExt = 360 / sides;
  return signedTurns.every((a) => Math.abs(Math.abs(a) - expectedExt) <= angleTol);
}

export function boundingBox(segments) {
  if (!segments || segments.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of segments) {
    minX = Math.min(minX, s.x1, s.x2);
    maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxY = Math.max(maxY, s.y1, s.y2);
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export function countDistinctColors(segments) {
  const colors = new Set((segments || []).map((s) => String(s.color || "").toLowerCase()));
  return colors.size;
}

export function hasCustomColor(segments) {
  return (segments || []).some((s) => {
    const c = String(s.color || "").toLowerCase();
    return Boolean(c) && c !== "#1e293b" && c !== "#000000" && c !== "black";
  });
}

export function visitedQuadrants(segments, commands = []) {
  const quads = new Set();
  const checkPt = (x, y) => {
    if (Math.abs(x) <= 8 || Math.abs(y) <= 8) return;
    if (x > 0 && y > 0) quads.add(1);
    else if (x < 0 && y > 0) quads.add(2);
    else if (x < 0 && y < 0) quads.add(3);
    else if (x > 0 && y < 0) quads.add(4);
  };

  for (const s of segments || []) {
    checkPt(s.x1, s.y1);
    checkPt(s.x2, s.y2);
    // Midpoint catches diagonal lines passing cleanly through a quadrant
    checkPt((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2);
  }
  for (const c of commands || []) {
    if (c.cmd === "dot" || c.cmd === "stamp") checkPt(c.x, c.y);
  }
  return quads;
}

export function countFills(commands) {
  return (commands || []).filter((c) => c.cmd === "end_fill").length;
}

export function countDots(commands) {
  return (commands || []).filter((c) => c.cmd === "dot").length;
}

export function hasPenUpJump(commands) {
  let penIsDown = true;
  let movedWhileUp = false;
  let sawDownAfterUp = false;
  for (const c of commands || []) {
    if (c.cmd === "pen") {
      penIsDown = Boolean(c.penDown);
      if (penIsDown && movedWhileUp) sawDownAfterUp = true;
    } else if (c.cmd === "move" && !penIsDown) {
      if (Math.hypot(c.x2 - c.x1, c.y2 - c.y1) > 1) {
        movedWhileUp = true;
      }
    }
  }
  return movedWhileUp && sawDownAfterUp;
}

export function extractPrintedNumbers(stdout) {
  const matches = String(stdout || "").match(/-?\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

export function isStarPolygon(
  path,
  points,
  skip = 2,
  { minSide = 35, maxSide = 450, sideTol = 0.08, angleTol = 5.0 } = {}
) {
  if (!isClosedPath(path, 5.5)) return false;
  if (path.edges.length !== points) return false;

  const lengths = pathEdgeLengths(path);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (avgLen < minSide || avgLen > maxSide) return false;

  const lengthsOk = lengths.every((len) => Math.abs(len - avgLen) <= avgLen * sideTol + 1.5);
  if (!lengthsOk) return false;

  const signedTurns = pathExteriorAngles(path, 5.5);
  if (signedTurns.length !== points) return false;

  const firstSign = Math.sign(signedTurns[0]);
  if (firstSign === 0) return false;
  if (!signedTurns.every((a) => Math.sign(a) === firstSign)) return false;

  const expectedExt = (360 * skip) / points;
  return signedTurns.every((a) => Math.abs(Math.abs(a) - expectedExt) <= angleTol);
}

export function countColorTransitions(segments) {
  const nonZero = (segments || []).filter((s) => segmentLength(s) > 0.5);
  let transitions = 0;
  for (let i = 1; i < nonZero.length; i++) {
    const prev = String(nonZero[i - 1].color || "").toLowerCase();
    const curr = String(nonZero[i].color || "").toLowerCase();
    if (prev !== curr) transitions += 1;
  }
  return transitions;
}

export function countWrites(commands) {
  return (commands || []).filter((c) => c.cmd === "write").length;
}

export function countStamps(commands) {
  return (commands || []).filter((c) => c.cmd === "stamp").length;
}

export function countDistinctTurtles(segments, commands = []) {
  const ids = new Set();
  for (const s of segments || []) {
    if (s.turtle_id) ids.add(s.turtle_id);
  }
  for (const c of commands || []) {
    if (c.cmd === "spawn" && c.id) ids.add(c.id);
  }
  return ids.size;
}

export function segmentsByTurtle(segments) {
  const byTurtle = new Map();
  for (const s of segments || []) {
    if (segmentLength(s) <= 0.5) continue;
    const tid = s.turtle_id || "t1";
    if (!byTurtle.has(tid)) byTurtle.set(tid, []);
    byTurtle.get(tid).push(s);
  }
  return byTurtle;
}

export function writtenTexts(commands) {
  return (commands || [])
    .filter((c) => c.cmd === "write" && typeof c.text === "string")
    .map((c) => c.text);
}

export const VERIFY_HELPERS = {
  segmentLength,
  pointsClose,
  getConnectedPaths,
  splitClosedShapes,
  isClosedPath,
  pathEdgeLengths,
  pathExteriorAngles,
  isRegularPolygon,
  isStarPolygon,
  boundingBox,
  countDistinctColors,
  countColorTransitions,
  hasCustomColor,
  visitedQuadrants,
  countFills,
  countDots,
  countWrites,
  countStamps,
  countDistinctTurtles,
  segmentsByTurtle,
  writtenTexts,
  hasPenUpJump,
  extractPrintedNumbers,
};

export function verifyMission(lesson, runResult) {
  if (!runResult || !runResult.ok || !runResult.turtleData) {
    return {
      passed: false,
      goals: (lesson.goals || []).map((label) => ({ label, passed: false })),
      feedback: "Fix the Python error first, then run again!",
      bonusPassed: false,
      bonusFeedback: "",
    };
  }
  return lesson.check(runResult, VERIFY_HELPERS);
}
