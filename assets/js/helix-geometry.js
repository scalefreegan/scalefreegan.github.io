// Geometry of the B-DNA double helix drawn in the hero.
//
// The helix axis runs left to right across the screen. Base pair k sits at a
// fixed x; its two nucleotides sit above and below the axis on the two strands.
//
// Handedness: DNA is a RIGHT-handed helix. With the axis pointing right (+x),
// the right-hand rule says a strand turns from "up" toward the viewer, then
// down, then away. So the half of each strand nearest the viewer runs from
// upper left to lower right. In a right-handed frame (x right, y up, z toward
// the viewer) a strand is:
//
//   y_up = R * cos(theta)     z = R * sin(theta)     theta grows with x
//
// Canvas y grows downward, so the on-screen offset is -cos(theta).

export const BP_PER_TURN = 10.5; // B-DNA: about 10.5 base pairs per turn
export const TWIST = (2 * Math.PI) / BP_PER_TURN;

// Angle between the two strands around the axis. Less than 180 degrees, which
// is what gives B-DNA its major and minor grooves.
export const GROOVE_OFFSET = 0.8 * Math.PI;

// B-DNA proportions: 3.4 nm pitch, 2 nm diameter, so radius = pitch / 3.4.
export function helixRadius(risePx) {
  return (BP_PER_TURN * risePx) / 3.4;
}

// Where nucleotide (k, strand) sits relative to the axis, for a helix rotated
// by `rotation` radians about its axis.
//   dy: canvas-space offset in units of the radius (positive is down)
//   z:  depth in [-1, 1], +1 nearest the viewer
export function strandOffset(k, strand, rotation) {
  const theta = k * TWIST + rotation + strand * GROOVE_OFFSET;
  return { dy: -Math.cos(theta), z: Math.sin(theta) };
}
