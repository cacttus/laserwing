import * as THREE from 'three';
import * as $ from "jquery";
import { Console3D } from './Console3D';
import { WebGLRenderer } from 'three';

//Globals

//Unfortunately static classes don't work (for some reason)
//See this post on Stackoverflow: https://stackoverflow.com/questions/16207593/how-to-access-static-methods-in-typescript

let _renderer: THREE.WebGLRenderer = null;
let _debug: boolean = false;
let _showConsole : boolean = false;

let _console3d : Console3D = null;


//https://spin.atomicobject.com/2018/11/05/using-an-int-type-in-typescript/
export type Int = number & { __int__: void };

export const roundToInt = (num: number): Int => Math.round(num) as Int;

export function userIsInVR(): boolean {
    return (VRSupported() && _renderer.vr.enabled);
}
export function VRSupported(): boolean {
    //This block copied directly from the WEBVR.js createbutton
    //The commented out portion is due to TypeScript not compiling a Never property
    return ('xr' in navigator /*&& 'supportsSession' in navigator.xr*/) ||
        ('getVRDisplays' in navigator);
}

export function setRenderer(x: THREE.WebGLRenderer): void {
    _renderer = x;
}
export function setDebug(d: boolean, sc: boolean): void {
    _debug = d;
    _showConsole = sc;
}
export function setConsole3D(scene : THREE.Scene, user : THREE.Object3D){
    if(_showConsole){
        let console3d : Console3D = new Console3D();
        _console3d = console3d;
        user.add(console3d);
    }
}
export function getTimeMillis(): number {
    return new Date().getMilliseconds();
}
export function updateGlobals(c : THREE.PerspectiveCamera, u : THREE.Group){
    if(_console3d){
        _console3d.update(c,u);
    }
}
// static checkErrors(): void {
//     let e: any = gl.getError();
//     if (e != gl.NO_ERROR) {
//         Globals.logError(e);
//     }
// }
export function logInfo(e: any): void {
    let str: string = "" + e;
    console.debug();

    if(_console3d != null){
        _console3d.log(str);
    }
}
export function logError(e: any): void {
    let str: string = "" + e;
    console.error(str);

    let stack : string = ''  + new Error().stack;

    //str += ' >> ' + stack;

    if(_console3d != null){
        _console3d.log(str);
    }
}
export function logWarn(e: any): void {
    let str: string = "" + e;
    console.warn(str);

    if(_console3d != null){
        _console3d.log(str);
    }
}
export function logDebug(e: any): void {
    let str: string = "" + e;
    console.debug(str);

    if(_console3d != null){
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

