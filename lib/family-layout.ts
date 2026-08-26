export type Point = { x: number; y: number };
export type Obstacle = { x: number; y: number; width: number; height: number };

export function familyGeometry(
  firstParent: Point,
  secondParent: Point,
  childTopPositions: number[],
  cardWidth: number,
  cardHeight: number,
) {
  const originX = (firstParent.x + secondParent.x + cardWidth) / 2;
  const originY = Math.max(firstParent.y, secondParent.y) + cardHeight / 2;
  const nearestChildY = childTopPositions.length ? Math.min(...childTopPositions) : originY + 160;
  const distance = nearestChildY - originY;
  const direction = Math.sign(distance) || 1;
  const available = Math.abs(distance);
  const offset = available < 64 ? available / 2 : Math.min(Math.max(36, available * .46), available - 28);
  return { originX, originY, junctionY: originY + direction * offset };
}

function segmentHitsVertical(x: number, fromY: number, toY: number, obstacle: Obstacle, padding = 18) {
  const minY = Math.min(fromY, toY);
  const maxY = Math.max(fromY, toY);
  return x > obstacle.x - padding && x < obstacle.x + obstacle.width + padding && maxY > obstacle.y - padding && minY < obstacle.y + obstacle.height + padding;
}

export function familyRoutePoints(originX: number, originY: number, junctionY: number, targetX: number, targetY: number, obstacles: Obstacle[] = []) {
  const blockers = obstacles.filter((obstacle) => segmentHitsVertical(targetX, junctionY, targetY, obstacle));
  if (!blockers.length) return [{ x: originX, y: originY }, { x: originX, y: junctionY }, { x: targetX, y: junctionY }, { x: targetX, y: targetY }];

  const padding = 26;
  const candidates = obstacles.flatMap((obstacle) => [obstacle.x - padding, obstacle.x + obstacle.width + padding]);
  const routeX = candidates
    .filter((candidate) => obstacles.every((obstacle) => !segmentHitsVertical(candidate, junctionY, targetY - padding, obstacle, 12)))
    .sort((first, second) => Math.abs(first - targetX) - Math.abs(second - targetX))[0]
    ?? Math.min(...blockers.map((obstacle) => obstacle.x - padding));
  const approachY = targetY - Math.sign(targetY - junctionY || 1) * padding;
  return [
    { x: originX, y: originY },
    { x: originX, y: junctionY },
    { x: routeX, y: junctionY },
    { x: routeX, y: approachY },
    { x: targetX, y: approachY },
    { x: targetX, y: targetY },
  ];
}

export function roundedFamilyPath(originX: number, originY: number, junctionY: number, targetX: number, targetY: number, obstacles: Obstacle[] = []) {
  const points = familyRoutePoints(originX, originY, junctionY, targetX, targetY, obstacles)
    .filter((point, index, all) => index === 0 || point.x !== all[index - 1].x || point.y !== all[index - 1].y);
  if (points.length < 2) return "";
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const incoming = Math.hypot(current.x - previous.x, current.y - previous.y);
    const outgoing = Math.hypot(next.x - current.x, next.y - current.y);
    const radius = Math.min(18, incoming / 2, outgoing / 2);
    if (!radius) continue;
    const before = { x: current.x + (previous.x - current.x) / incoming * radius, y: current.y + (previous.y - current.y) / incoming * radius };
    const after = { x: current.x + (next.x - current.x) / outgoing * radius, y: current.y + (next.y - current.y) / outgoing * radius };
    commands.push(`L ${before.x} ${before.y}`, `Q ${current.x} ${current.y} ${after.x} ${after.y}`);
  }
  const last = points.at(-1)!;
  commands.push(`L ${last.x} ${last.y}`);
  return commands.join(" ");
}
