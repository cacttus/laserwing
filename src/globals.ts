import * as THREE from 'three';
import { Console3D } from './Console3D';

//Globals
//Unfortunately static modules in typescript are just a globally exported module
//See this post on Stackoverflow: https://stackoverflow.com/questions/16207593/how-to-access-static-methods-in-typescript

let _renderer: THREE.WebGLRenderer = null;
let _debug: boolean = false;
let _prof: boolean = false;
let _showConsole: boolean = false;
let _console3d: Console3D = null;
let _frame: number = 0;
let _ssaa: number = 0;

//https://spin.atomicobject.com/2018/11/05/using-an-int-type-in-typescript/
export type Int = number & { __int__: void };

export const roundToInt = (num: number): Int => Math.round(num) as Int;

export function vrDeviceIsPresenting(): boolean {
  //You can't resize if the vr device is presenting.
  let d = _renderer.vr.getDevice();
  let b : boolean = _renderer.vr && d && d.isPresenting;
  if(b===null){
    b = false;
  }
  return b;
}
export function userIsInVR(): boolean {
  return (VRSupported() && _renderer.vr.enabled);
}
export function VRSupported(): boolean {
  //This block copied directly from the WEBVR.js createbutton
  //The commented out portion is due to TypeScript not compiling a Never property
  return ('xr' in navigator /*&& 'supportsSession' in navigator.xr*/) ||
    ('getVRDisplays' in navigator);
}
export function getSSAA(): number {
  if(userIsInVR()){
    //The oculus messes up with SSAA turned on.  For some reason.
    return 0;
  }
  return _ssaa;
}
export function setRenderer(x: THREE.WebGLRenderer): void {
  _renderer = x;
}
export function setFlags(document_location: Location) {
  //Check that vr flag is enabled.
  const url_params = (new URL("" + document.location)).searchParams;
  _debug = url_params.get('debug') === 'true';
  _showConsole = url_params.get('console') === 'true';
  _prof = url_params.get('prof') === 'true';
  if(url_params.has('ssaa'))
  {
    _ssaa = parseInt(url_params.get('ssaa'));
    if (_ssaa < 0) _ssaa = 0;
    if (_ssaa > 32) _ssaa = 32;
  }
}
export function setConsole3D(scene: THREE.Scene, user: THREE.Object3D) {
  if (_showConsole) {
    let console3d: Console3D = new Console3D();
    _console3d = console3d;
    user.add(console3d);
  }
}
export function getTimeMillis(): number {
  let millis: number = new Date().getTime();
  return millis;
}
export function updateGlobals(c: THREE.PerspectiveCamera, u: THREE.Group) {
  if (_console3d) {
    _console3d.update(c, u);
  }
  _frame++;
}
export function getFrameNumber(): number {
  return _frame;
}
export function logInfo(e: any): void {
  let str: string = "" + e;
  console.info(e);

  if (_console3d != null) {
    _console3d.log(str);
  }
}
export function logError(e: any): void {
  let str: string = "" + e;
  console.error(str);

  let stack: string = '' + new Error().stack;

  if (_console3d != null) {
    _console3d.log(str);
  }
}
export function logWarn(e: any): void {
  let str: string = "" + e;
  console.warn(str);

  if (_console3d != null) {
    _console3d.log(str);
  }
}
export function logDebug(e: any): void {
  let str: string = "" + e;
  console.debug(str);

  if (_console3d != null) {
    _console3d.log(str);
  }
}
export function isPowerOf2(value: number) {
  return (value & (value - 1)) == 0;
}
export function getStandingMatrix(): THREE.Matrix4 {
  let m: THREE.Matrix4 = new THREE.Matrix4();
  m.identity();
  return m;
}
export function isDebug(): boolean {
  return _debug;
}
export function isProf(): boolean {
  return _prof;
}
