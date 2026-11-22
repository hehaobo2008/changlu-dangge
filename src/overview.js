import { Vector3 } from 'three';

// Fit the whole undulating row of miniature landscapes into the part of the page
// reserved for the map, keeping both outer bounds and vertical elevation in frame.
export function frameIslandMap(camera, zones, width, height) {
  const portrait = width <= height;
  const back = (portrait ? new Vector3(.08, 1, -.57) : new Vector3(1, .82, .26)).normalize();
  const right = new Vector3().crossVectors(camera.up, back).normalize();
  const up = new Vector3().crossVectors(back, right);
  const midY = zones.reduce((s, z) => s + (z.ovY || 0), 0) / zones.length;
  const midX = zones.reduce((s, z) => s + (z.ovX || 0), 0) / zones.length;
  const origin = new Vector3(midX, 20 + midY, (zones[0].center + zones.at(-1).center) / 2);
  const fov = portrait ? 38 : 35;
  const tanY = Math.tan(fov * Math.PI / 360);
  const tanX = tanY * width / height;
  const left = portrait ? -.27 : -.94, rightEdge = portrait ? .91 : .94;
  const bottom = -1 + 2 * Math.min(76, height * .12) / height;
  const top = 1 - 2 * (portrait ? Math.min(135, height * .20) : Math.min(138, height * .27)) / height;
  const middleX = (left + rightEdge) / 2, middleY = (top + bottom) / 2;
  let distance = 0;
  for (const zone of zones) {
    const ox = zone.ovX || 0, oy = zone.ovY || 0;
    for (const x of [-160, 160]) for (const z of [-155, 155]) for (const y of [-26, 92]) {
      const corner = new Vector3(ox + x, oy + y, zone.center + z).sub(origin);
      const depth = corner.dot(back), h = corner.dot(right) / tanX, v = corner.dot(up) / tanY;
      distance = Math.max(distance, (h + rightEdge * depth) / (rightEdge - middleX),
        (-h - left * depth) / (middleX - left), (v + top * depth) / (top - middleY),
        (-v - bottom * depth) / (middleY - bottom));
    }
  }
  const look = origin.addScaledVector(right, -middleX * distance * tanX)
    .addScaledVector(up, -middleY * distance * tanY);
  camera.position.copy(look).addScaledVector(back, distance);
  camera.lookAt(look);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return look;
}
