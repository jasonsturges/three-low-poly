import { Vector3 } from "three";

export const Direction = {
  UP: new Vector3(0, 1, 0),
  DOWN: new Vector3(0, -1, 0),
  LEFT: new Vector3(-1, 0, 0),
  RIGHT: new Vector3(1, 0, 0),
  FORWARD: new Vector3(0, 0, 1),
  BACKWARD: new Vector3(0, 0, -1),
  X: new Vector3(1, 0, 0),
  Y: new Vector3(0, 1, 0),
  Z: new Vector3(0, 0, 1),
  XY: new Vector3(1, 1, 0).normalize(),
  XZ: new Vector3(1, 0, 1).normalize(),
  YZ: new Vector3(0, 1, 1).normalize(),
  XYZ: new Vector3(1, 1, 1).normalize(),
};
