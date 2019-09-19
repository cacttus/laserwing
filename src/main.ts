import * as $ from "jquery";
import * as THREE from 'three';
import * as Physijs from 'physijs-webpack';
import { Vector3, Vector2, Vector4, Color, ShapeUtils, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D, AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial } from 'three';

import { WEBVR } from 'three/examples/jsm/vr/WebVR.js';
import * as GLTFLoader_ from 'three/examples/jsm/loaders/GLTFLoader';
import * as dat from 'dat.gui';
import * as OrbitControls from 'three-orbitcontrols';

import { VRInputManager, VRGamepad, VRButton } from './gamepad';
import { TextCanvas, TextCanvasOptions } from './TextCanvas';
import * as Globals from './globals';
import * as Mersenne from './mersenne-twister';//https://github.com/boo1ean/mersenne-twister
import MersenneTwister from "mersenne-twister";


//https://www.c-sharpcorner.com/article/learn-about-extension-methods-in-typescript/
//https://www.typescriptlang.org/docs/handbook/declaration-merging.html
// declare namespace THREE {
// interface Color {
//   clamp(min: Color, max: Color): Color;
// }
// Color.prototype.clamp = function (min: Color, max: Color): Color {
//   return new Color();
// }
// }
class GenericClassnameHelper<T> {
  public TName: string;//https://stackoverflow.com/questions/47312116/how-to-get-generic-classt-name-of-typescript
  constructor(x: new () => T) {
    this.TName = x.name;
  }
}
class Utils {
  public static className(x: Object): string {
    return x.constructor.name;
  }
  public static classNameT<T>() {
    return new GenericClassnameHelper<T>(T);
  }
  public static lerpColor(a: Color, b: Color, x: number): Color {
    let ret: Color = a.clone().add(b.clone().sub(a).multiplyScalar(x));
    return ret;
  }
  public static clampScalar(cin: number, cmin: number, cmax: number): number {
    let ret: number = Math.max(cmin, Math.min(cmax, cin));
    return ret;
  }
  public static clampVector3(cin: Vector3, cmin: Vector3, cmax: Vector3): Vector3 {
    let c: Vector3 = new Vector3();
    c.x = Math.max(cmin.x, Math.min(cmax.x, cin.x));
    c.y = Math.max(cmin.y, Math.min(cmax.y, cin.y));
    c.z = Math.max(cmin.z, Math.min(cmax.z, cin.z));
    return c;
  }
  public static clampColor(cin: Color, cmin: Color, cmax: Color): Color {
    let c: Color = new Color();
    c.r = Math.max(cmin.r, Math.min(cmax.r, cin.r));
    c.g = Math.max(cmin.g, Math.min(cmax.g, cin.g));
    c.b = Math.max(cmin.b, Math.min(cmax.b, cin.b));
    return c;
  }
  public static vec3ToColor(cin: Vector3): Color {
    return new Color(cin.x, cin.y, cin.z);
  }
  public static colorToVec3(cin: Color): Vector3 {
    return new Vector3(cin.r, cin.g, cin.b);
  }
  public static cosineInterpolate(y1: number, y2: number, mu: number) {
    //http://paulbourke.net/miscellaneous/interpolation/
    let mu2: number = 0;
    mu2 = (1 - Math.cos(mu * Math.PI)) * 0.5;
    return (y1 * (1 - mu2) + y2 * mu2);
  }
  public static getSortedKeys(obj: Dictionary<number>, asc: boolean = false): Array<string> {
    let keys = Object.keys(obj);
    return keys.sort(
      asc ?
        function (a: string, b: string) {
          return obj[b] - obj[a];
        } :
        function (a: string, b: string) {
          return obj[a] - obj[b];
        });
  }
  public static setMeshColorEm(mod: THREE.Mesh, val: Color) {
    if (val) {
      if (mod.material) {
        let mat: THREE.MeshStandardMaterial = mod.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.emissive.setRGB(val.r, val.g, val.b);
          //mat.metalness = 0;
          // mat.roughness = 1;
        }
      }
    }
  }
  public static setMeshColor(mod: THREE.Mesh, val: Color) {
    if (val) {
      if (mod.material) {
        let mat: THREE.MeshBasicMaterial = mod.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.color.setRGB(val.r, val.g, val.b);
        }
      }
    }
  }
  public static getMeshColor(mod: THREE.Mesh): Color {
    let c: Color = new Color();
    if (mod.material) {
      let mat: THREE.MeshBasicMaterial = mod.material as THREE.MeshBasicMaterial;
      if (mat) {
        c.copy(mat.color);
      }
    }
    return c;
  }
  public static getMeshColorEm(mod: THREE.Mesh): Color {
    let c: Color = new Color();
    if (mod.material) {
      let mat: THREE.MeshStandardMaterial = mod.material as THREE.MeshStandardMaterial;
      if (mat) {
        c.copy(mat.emissive);
      }
    }
    return c;
  }
  public static duplicateModel(mod: THREE.Mesh, material: boolean = false): THREE.Mesh {
    let ret: THREE.Mesh = mod.clone();
    //Don't do this.
    // ret.traverse((node: Object3D) => {
    //   if (node instanceof THREE.Mesh) {
    //     if (node.material instanceof THREE.MeshBasicMaterial) {
    //       node.material = node.material.clone();
    //     }
    //     if (node.material instanceof THREE.MeshStandardMaterial) {
    //       node.material = node.material.clone();
    //     }
    //   }
    // });
    return ret;
  }

}


/**
 * Put all files here
 */
namespace Files {
  export enum Audio {
    Shoot = 'shoot.ogg',
    Bomb_Shoot = 'bomb_shoot.ogg',
    Bomb = 'bomb.ogg',
    Nope = 'nope.ogg',
    Ship_Explode = 'ship_explode.ogg',
    Get_Item = 'getitem.ogg',
    Ship_Hit = 'ship_hit.ogg',
    LevelUp = 'levelup.ogg',
    Moskito = 'moskito.ogg',
    GameOver = 'gameover.ogg',
    Electro_Sketch = 'electro_sketch.ogg',
    Digital_Bark = 'digital_bark.ogg',
    Inner_Sanctum = 'inner_sanctum.ogg',
  }
  export enum Model {
    Player_Ship = 'player_ship.glb',
    Enemy_Ship = 'enemy_ship.glb',
    Enemy_Ship2 = 'enemy_ship2.glb',
    Enemy_Ship3 = 'enemy_ship3.glb',
    Bullet = 'bullet.glb',
    Bomb = 'bomb.glb',
    Bomb_Explosion = 'bomb_explosion.glb',
    Item = 'item.glb',
    Boss = 'boss.glb',
    Missile = 'missile.glb',
    Big_Bullet = 'big_bullet.glb',
  }
}
//https://stackoverflow.com/questions/38213926/interface-for-associative-object-array-in-typescript
interface Dictionary<T> {
  [key: string]: T;

}
class WaitTimer {
  private _time: number = 2;
  private _interval: number = 2;
  get interval(): number { return this._interval; }
  set interval(n: number) { this._interval = n; }
  get time(): number { return this._time; }
  get time01(): number { return 1 - this._time / this._interval; }

  public constructor(interval: number) {
    this._interval = this._time = interval;
  }
  public update(dt: number): boolean {
    if (this._time > 0) {
      this._time -= dt;
      if (this._time <= 0) {
        this._time = 0;
      }
    }
    return this.ready();
  }
  public ready(): boolean {
    return this._time <= 0;
  }
  public reset() {
    this._time = this._interval;
  }
}
interface TimerTickFunction { (): void; };
enum TimerState { Stopped, Running }
class Timer {
  public Func: TimerTickFunction = null;
  public Interval: number = 10; //milliseconds
  private _t: number = 0; //milliseocnds
  private _state: TimerState = TimerState.Stopped;
  public constructor(interval: number, func: TimerTickFunction) {
    this.Func = func;
    this.Interval = interval;
    this.start();
  }
  public start() {
    this._state = TimerState.Running;
    this._t = this.Interval;
  }
  public pause() {
    this._state = TimerState.Stopped;
  }
  public stop() {
    this._state = TimerState.Stopped;
  }
  public update(dt: number) {
    if (this._state === TimerState.Running) {
      let idt: number = dt * 1000; // to millis

      //Incorrect, shoudl be looped. but we'll fix this later.
      this._t -= idt;
      if (this._t <= 0) {
        if (this.Func) {
          this.Func();
        }
        this._t = this.Interval;
      }
    }
  }
}
class PointGeo extends THREE.Object3D {
  public constructor() {
    super();
    let p0: Vector3 = new Vector3(0, 0, 0);
    let points_geo: THREE.Geometry = new THREE.Geometry();
    points_geo.vertices.push(p0);
    var pointMaterial = new THREE.PointsMaterial({ color: 0xFFFF00, size: 0.1 });
    let points: THREE.Points = new THREE.Points(points_geo, pointMaterial);
    this.add(points);
  }
}
enum ButtonState { Press, Hold, Release, Up }
class VirtualButton {
  private _state: ButtonState = ButtonState.Up;
  get state(): ButtonState { return this._state; }
  public pressed(): boolean { return this.state === ButtonState.Press; }
  public down(): boolean { return this.state === ButtonState.Hold; }
  public pressOrHold(): boolean { return this.state === ButtonState.Hold || this.state == ButtonState.Press; }
  public update(pressed: boolean) {
    if (pressed) {
      if (this._state === ButtonState.Press) {
        this._state = ButtonState.Hold;
      }
      else if (this._state === ButtonState.Hold) {
      }
      else if (this._state === ButtonState.Release) {
        this._state = ButtonState.Press;
      }
      else if (this._state === ButtonState.Up) {
        this._state = ButtonState.Press;
      }
    }
    else {
      if (this._state === ButtonState.Press) {
        this._state = ButtonState.Release;
      }
      else if (this._state === ButtonState.Hold) {
        this._state = ButtonState.Release;
      }
      else if (this._state === ButtonState.Release) {
        this._state = ButtonState.Up;
      }
      else if (this._state === ButtonState.Up) {
      }
    }
  }
}
class Screen {
  private _canvas: HTMLCanvasElement = null;
  get canvas(): HTMLCanvasElement { return this._canvas; }
  get pixelWidth(): number {
    return this._canvas.width;
  }
  get pixelHeight(): number {
    return this._canvas.height;
  }
  get elementWidth(): number {
    let rect = this._canvas.getBoundingClientRect();
    return rect.width;
  }
  get elementHeight(): number {
    let rect = this._canvas.getBoundingClientRect();
    return rect.height;
  }
  public constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
  }
  //void blit.

  //Return the relative XY of the mouse relative to the top left corner of the canvas.
  public getCanvasRelativeXY(clientX: number, clientY: number): Vector2 {
    let v2: Vector2 = new Vector2();
    //getMousePos
    //https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
    const canvas = g_renderer.domElement;
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;   // relationship bitmap vs. element for X
    let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y
    v2.x = (clientX - rect.left) * scaleX;
    v2.y = (clientY - rect.top) * scaleY;
    return v2;
  }
  //Project canvas point into 3D space
  //Input is NON-RELATIVE mouse point ( passed in from mousemove event )
  public project3D(clientX: number, clientY: number, distance: number): Vector3 {
    let v2: Vector2 = this.getCanvasRelativeXY(clientX, clientY);
    let f: Frustum = new Frustum();
    let mouse_pos = f.project(v2.x, v2.y, distance);
    return mouse_pos;
  }
}
/**
 * Keyboard Input class
 */
class Keyboard {
  private _w: VirtualButton = new VirtualButton();
  private _s: VirtualButton = new VirtualButton();
  private _a: VirtualButton = new VirtualButton();
  private _d: VirtualButton = new VirtualButton();
  private _buttons: Array<VirtualButton> = new Array<VirtualButton>();

  get w(): VirtualButton { return this._w; }
  get s(): VirtualButton { return this._s; }
  get a(): VirtualButton { return this._a; }
  get d(): VirtualButton { return this._d; }
  get buttons() { return this._buttons; }

  public controlDown: boolean = false;

  constructor() {
    this._buttons.push(this.w);
    this._buttons.push(this.s);
    this._buttons.push(this.a);
    this._buttons.push(this.d);
    let that = this;
    window.addEventListener("keydown", function (e) {
      if (e.ctrlKey) { that.controlDown = true; }
      //w
      if (e.keyCode === 87) { that.w.update(true); }
      //s
      if (e.keyCode === 83) { that.s.update(true); }
      //a
      if (e.keyCode === 65) { that.a.update(true); }
      //d
      if (e.keyCode === 68) { that.d.update(true); }

      //TESTS
      //if (Globals.isDebug()) 
      {
        if (that.controlDown) {

          //f1/2
          if (e.keyCode === 112) { g_audio.disableAudio(); }
          if (e.keyCode === 113) { g_audio.enableAudio(); }
          //f3
          if (e.keyCode === 114) { enterBoss(); }
          //f4
          if (e.keyCode === 115) { exitBoss(); }
        }
      }

    });
    window.addEventListener("keyup", function (e) {
      if (e.ctrlKey) { that.controlDown = false; }
      //w
      if (e.keyCode === 87) { that.w.update(false); }
      //s
      if (e.keyCode === 83) { that.s.update(false); }
      //a
      if (e.keyCode === 65) { that.a.update(false); }
      //d
      if (e.keyCode === 68) { that.d.update(false); }
    });
  }
}
class Mouse extends Vector3 {
  public moved: boolean = false;
  public mousePoint: PointGeo = null;
  private _rmbDown: boolean = false;
  private _lmbDown: boolean = false;
  private _left: VirtualButton = new VirtualButton();
  private _right: VirtualButton = new VirtualButton();

  get Left(): VirtualButton { return this._left; }
  get Right(): VirtualButton { return this._right; }

  public constructor() {
    super();
    let that = this;

    setInterval(function () {
      that.Left.update(that._lmbDown);
      that.Right.update(that._rmbDown);
    });
    document.addEventListener('mouseup', function (e) {
      // e.preventDefault();
      if (e.button == 0) {
        that._lmbDown = false;
      }
      if (e.button == 1) {
        //middle
      }
      if (e.button == 2) {
        that._rmbDown = false;
      }
    });
    document.addEventListener('mousedown', function (e) {
      //e.preventDefault();
      if (e.button == 0) {
        that._lmbDown = true;
      }
      if (e.button == 1) {
        //middle
      }
      if (e.button == 2) {
        that._rmbDown = true;
      }
    });
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
    //var controls = new OrbitControls.default();
    document.addEventListener('mousemove', function (e) {
      e.preventDefault();

      //animate arms based on cursor position.
      e.preventDefault();
      if (!that.moved) {
        that.moved = true;
      }

      //Look at the point in the screen projected into 3D
      let v2 = g_screen.getCanvasRelativeXY(e.clientX, e.clientY);
      v2.x = (v2.x / g_screen.canvas.width) * 2 - 1;
      v2.y = ((g_screen.canvas.height - v2.y) / g_screen.canvas.height) * 2 - 1;

      let FOV = 0.6;//Increase to get more FOV 

      let base = new Vector4(0, 0, -1, 1);
      let ry: Matrix4 = new Matrix4();
      ry.makeRotationAxis(new Vector3(0, -1, 0), Math.PI * FOV * v2.x);
      let vy: Vector4 = base.clone().applyMatrix4(ry);

      let rx: Matrix4 = new Matrix4();
      rx.makeRotationAxis(new Vector3(1, 0, 0), Math.PI * FOV * v2.y);
      let vxy: Vector4 = vy.clone().applyMatrix4(rx);

      let vxy3: Vector3 = new Vector3(vxy.x, vxy.y, vxy.z);

      vxy3.normalize().multiplyScalar(5);
      vxy3.add(g_player.WorldPosition);

      g_camera.lookAt(new Vector3(vxy3.x, vxy3.y, vxy3.z));

      that.debugDrawMousePos();

    }, false);
  }

  private debugDrawMousePos(): void {
    let that = this;
    if (Globals.isDebug()) {
      if (that.mousePoint == null) {
        that.mousePoint = new PointGeo();
        g_physics.Scene.add(that.mousePoint);
      }
      that.mousePoint.position.set(0, 0, 0);
      that.mousePoint.rotation.set(0, 0, 0);
      that.mousePoint.updateMatrix();
      that.mousePoint.position.set(that.x, that.y, that.z);
      that.mousePoint.updateMatrix();
    }
  }
}
class VirtualController {
  public Position: Vector3 = new Vector3(0, 0, 0);
  public A: VirtualButton = new VirtualButton();
  public B: VirtualButton = new VirtualButton();
  public Trigger: VirtualButton = new VirtualButton();
  public Axis: Vector2 = new Vector2(); // a 
  //Joystick or Keyboard.
  public anyButtonPressed() {
    return this.A.pressed() || this.B.pressed() || this.Trigger.pressed();
  }
}
/**
 * @class Input
 * @brief Manages both VR and Desktop input devices 
 *  TODO: tablet + phone input.
 */
class Input {
  private _keyboard: Keyboard = null;
  private _vr: VRInputManager = null;
  private _mouse: Mouse = null;

  //The left and right controllers, these are also used to synergize kb/mouse input.
  private _right: VirtualController = new VirtualController();
  private _left: VirtualController = new VirtualController();

  get right(): VirtualController { return this._right; }
  get left(): VirtualController { return this._left; }

  get keyboard(): Keyboard { return this._keyboard; }
  get vr(): VRInputManager { return this._vr; }
  get mouse(): Mouse { return this._mouse; }

  constructor() {
    if (Globals.userIsInVR()) {
      //Let the VR input manager handle 
      //VR Input callbaclks
      let addController: any = function (g: VRGamepad) {
        if (g != null) {
          var box_mat = new THREE.MeshBasicMaterial({
            //map: this._texture,
            transparent: false,
            side: THREE.DoubleSide,
            color: 0xc9c9FF,
          });

          var box_geo = new THREE.BoxBufferGeometry(0.05, 0.05, 0.05);
          box_geo.computeBoundingBox(); // for hit area
          var box_mesh = new THREE.Mesh(box_geo, box_mat);

          g.add(box_mesh);
          if (g_userGroup) {
            g_userGroup.add(g);
          }
        }
      }

      let removeController: any = function (g: VRGamepad) {
        Globals.logInfo("Removed controller.");
        if (g.parent == g_physics.Scene) {
          g_userGroup.remove(g);
        }
      }

      this._vr = new VRInputManager(addController, removeController);
      this._vr.Verbose = Globals.isDebug();
    }
    else {
      this._keyboard = new Keyboard();
      this._mouse = new Mouse();
    }
  }
  public update(dt: number): void {
    if (Globals.userIsInVR()) {
      if (this._vr) {
        this._vr.update();
        this.updateGamepads_VR(dt);
      }
    }
    else {
      if (this._keyboard && this._mouse) {
        let cam_n: Vector3 = new Vector3();
        g_camera.getWorldDirection(cam_n);

        let cam_w: Vector3 = new Vector3();
        g_camera.getWorldPosition(cam_w);

        let lookat: Vector3 = cam_w.add(cam_n);

        this.updateAxis_Keyboard(dt, this.left);
        this.right.Axis.copy(this.left.Axis);

        this.right.Trigger.update(this.mouse.Left.pressOrHold());
        this.right.A.update(this.mouse.Right.pressOrHold());
        this.right.Position.copy(lookat);

        this.left.Trigger.update(this.mouse.Left.pressOrHold());
        this.left.A.update(this.mouse.Right.pressOrHold());
        this.left.Position.copy(lookat);
      }
    }
  }
  private updateGamepads_VR(dt: number) {
    if (this._vr._gamepads) {
      for (let i = 0; i < this._vr._gamepads.length; ++i) {
        let gp: VRGamepad = this._vr._gamepads[i];
        let vc: VirtualController = null;

        if (gp.handedness === 'left') {
          vc = this._left;
        }
        else if (gp.handedness === 'right') {
          vc = this._right;
        }

        gp.getWorldPosition(vc.Position);

        vc.Axis.x = gp.x_axis;
        vc.Axis.y = gp.y_axis;

        for (let ibut: number = 0; ibut < gp.buttons.length; ++ibut) {
          if (gp.buttons[ibut].name === 'A') {
            vc.A.update(gp.buttons[ibut].pressed);
          }
          if (gp.buttons[ibut].name === 'B') {
            vc.B.update(gp.buttons[ibut].pressed);
          }
          if (gp.buttons[ibut].name === 'trigger') {
            vc.Trigger.update(gp.buttons[ibut].pressed);
          }
        }

      }
    }
  }
  private updateAxis_Keyboard(dt: number, joy: VirtualController) {
    const speed = 2.0;

    if (this._keyboard.a.pressOrHold()) {
      joy.Axis.x = Math.max(-1, joy.Axis.x - speed * dt);
    }
    else if (this._keyboard.d.pressOrHold()) {
      joy.Axis.x = Math.min(1, joy.Axis.x + speed * dt);
    }
    else {
      if (joy.Axis.x < 0) joy.Axis.x = Math.min(0, joy.Axis.x + speed * dt);
      else if (joy.Axis.x > 0) joy.Axis.x = Math.max(0, joy.Axis.x - speed * dt);
    }
    if (this._keyboard.s.pressOrHold()) {
      joy.Axis.y = Math.max(-1, joy.Axis.y - speed * dt);
    }
    else if (this._keyboard.w.pressOrHold()) {
      joy.Axis.y = Math.min(1, joy.Axis.y + speed * dt);
    }
    else {
      if (joy.Axis.y < 0) joy.Axis.y = Math.min(0, joy.Axis.y + speed * dt);
      else if (joy.Axis.y > 0) joy.Axis.y = Math.max(0, joy.Axis.y - speed * dt);
    }
  }
}
/**
 * A viewing frustum for a camera.  Quick class to calculate point in screen.
 */
class Frustum {
  private _ftl: Vector3 = new Vector3();
  private _ftr: Vector3 = new Vector3();
  private _fbl: Vector3 = new Vector3();
  private _ntl: Vector3 = new Vector3();
  private _nbl: Vector3 = new Vector3();
  private _ntr: Vector3 = new Vector3();

  get ftl(): Vector3 { return this._ftl; }//back topleft
  get ftr(): Vector3 { return this._ftr; }//back topright
  get fbl(): Vector3 { return this._fbl; }//back bottomleft
  get ntl(): Vector3 { return this._ntl; }//near top left
  get nbl(): Vector3 { return this._nbl; }//near bot left
  get ntr(): Vector3 { return this._ntr; }//near top right

  //private Points_fpt_ntl: Vector3;//back bottomleft
  public constructor(cam_dir: Vector3 = null, cam_pos: Vector3 = null) {
    this.construct(cam_dir, cam_pos);
  }
  //Project a point onto the screen in 3D
  public projectScreen(screen_x: number, screen_y: number) {
    return this.project(screen_x, screen_y, g_camera.near);
  }
  //Project a point into the screen/canvas, x and y are relative to the top left of the canvas (not the window)
  //A distance of 
  public project(screen_x: number, screen_y: number, dist: number): Vector3 {

    let wrx = screen_x / g_screen.elementWidth;//) * 2 - 1;
    let wry = screen_y / g_screen.elementWidth;//) * 2 + 1;

    let dx = this._ftr.clone().sub(this._ftl).multiplyScalar(wrx);
    let dy = this._fbl.clone().sub(this._ftl).multiplyScalar(wry);

    let back_plane: Vector3 = this._ftl.clone().add(dx).add(dy);

    let projected: Vector3 = back_plane.clone().sub(g_player.position).normalize().multiplyScalar(dist);

    let cam_pos: Vector3 = new Vector3();
    g_player.getWorldPosition(cam_pos);
    projected.add(cam_pos);

    return projected;
  }
  public construct(cam_dir: Vector3 = null, cam_pos: Vector3 = null) {
    //Doing this the old way
    if (cam_dir == null) {
      cam_dir = new Vector3();
      g_camera.getWorldDirection(cam_dir);
    }
    if (cam_pos == null) {
      cam_pos = new Vector3();
      g_player.getWorldPosition(cam_pos);
    }

    let nearCenter: Vector3 = cam_pos.clone().add(cam_dir.clone().multiplyScalar(g_camera.near));
    let farCenter: Vector3 = cam_pos.clone().add(cam_dir.clone().multiplyScalar(g_camera.far));
    let ar = g_screen.elementHeight / g_screen.elementWidth;
    let tan_fov_2 = Math.tan(THREE.Math.degToRad(g_camera.getEffectiveFOV()) / 2.0);
    let rightVec = g_camera.up.clone().cross(cam_dir);

    let w_far_2 = tan_fov_2 * g_camera.far;
    let h_far_2 = w_far_2 * ar;
    let cup_far = g_camera.up.clone().multiplyScalar(h_far_2);
    let crt_far = rightVec.clone().multiplyScalar(w_far_2);
    this._ftl = farCenter.clone().add(cup_far).sub(crt_far);
    this._ftr = farCenter.clone().add(cup_far).add(crt_far);
    this._fbl = farCenter.clone().sub(cup_far).sub(crt_far);

    let w_near_2 = tan_fov_2 * g_camera.near;
    let h_near_2 = w_near_2 * ar;
    let cup_near = g_camera.up.clone().multiplyScalar(h_near_2);
    let crt_near = rightVec.clone().multiplyScalar(w_near_2);
    this._ntl = nearCenter.clone().add(cup_near).sub(crt_near);
    this._ntr = nearCenter.clone().add(cup_near).add(crt_near);
    this._nbl = nearCenter.clone().sub(cup_near).sub(crt_near);
  }
}
interface PhysicsObjectCollisionCheckAB { (me: PhysicsObject, other: PhysicsObject): void; }
enum ColliderClass { Active = 2, Passive = 1, None = 0 }
//interface PhysicsObjectCollisionCheck<T> { (me: PhysicsObject, other: T): void; }
class CollisionManifold {
  //buckets of objects separated by type.
  //Active - the collider has a collide() method and will actively collide
  private _active_bucket: Map<string, Array<PhysicsObject>> = new Map<string, Array<PhysicsObject>>()

  //Passive - objects are collidees, but they do not have a collide() method
  private _passive_bucket: Map<string, Array<PhysicsObject>> = new Map<string, Array<PhysicsObject>>()

  //A quick map to identify if a physics object is active or passive
  private _active_identifier: Map<string, boolean> = new Map<string, boolean>();

  //Handlers for active 
  private _handlers: Map<string, Map<string, PhysicsObjectCollisionCheckAB>> = new Map<string, Map<string, PhysicsObjectCollisionCheckAB>>();

  private removePassiveCollider(x: PhysicsObject) {
    let szclass: string = Utils.className(x);
    if (this._passive_bucket.has(szclass)) {
      let n = this._passive_bucket.get(szclass).indexOf(x);
      if (n != -1) {
        this._passive_bucket.get(szclass).splice(n, 1);
      }
    }
  }
  private removeActiveCollider(x: PhysicsObject) {
    let szclass: string = Utils.className(x);
    if (this._active_bucket.has(szclass)) {
      let n = this._active_bucket.get(szclass).indexOf(x);
      if (n != -1) {
        this._active_bucket.get(szclass).splice(n, 1);
      }
    }
  }
  private registerActiveCollider(x: PhysicsObject) {
    //This shouldn't be needed since we already know the collision classification at startup
    //removePassiveCollider(x);

    let szclass: string = Utils.className(x);
    if (!this._active_bucket.has(szclass)) {
      this._active_bucket.set(szclass, new Array<PhysicsObject>());
    }
    if (this._active_bucket.get(szclass).indexOf(x) === -1) {
      this._active_bucket.get(szclass).push(x);//Really - this line here should be all that is needed in this method if this is coded correctly.
    }
  }
  private registerPassiveCollider(x: PhysicsObject) {
    let szclass: string = Utils.className(x);
    let p_has: boolean = this._passive_bucket.has(szclass) && this._passive_bucket.get(szclass).indexOf(x) !== -1;
    let a_has: boolean = this._active_bucket.has(szclass) && this._active_bucket.get(szclass).indexOf(x) !== -1;

    if (!p_has && !a_has) {
      if (!this._passive_bucket.has(szclass)) {
        this._passive_bucket.set(szclass, new Array<PhysicsObject>());
      }
      this._passive_bucket.get(szclass).push(x);//Really - this line here should be all that is needed in this method if this is coded correctly.
    }
  }
  private classifyColliderClass(szclass: string): ColliderClass {
    if (this._active_identifier.has(szclass)) {
      if (this._active_identifier.get(szclass) === true) {
        return ColliderClass.Active; // Active
      }
      else {
        return ColliderClass.Passive; // Passive
      }
    }
    return ColliderClass.None; //no classification, does not collide.
  }
  private promoteColliderClass(szclass: string, eclass: ColliderClass) {
    //Promote to passive/active based on the collision function
    let cur_class: ColliderClass = this.classifyColliderClass(szclass);

    //Might need to conver these to int?
    if (cur_class < eclass) {
      this._active_identifier.set(szclass, class);
    }
  }
  public collide<S, T>(func: PhysicsObjectCollisionCheckAB) {
    //Adds a collision handler.
    //Assuming this is possible.
    let sza = Utils.classNameT(S);
    this.promoteColliderClass(sza, ColliderClass.Active);

    let szp = Utils.classNameT(T);
    this.promoteColliderClass(szp, ColliderClass.Passive);

    if (!this._handlers.has(sza)) {
      this._handlers.set(sza, new Map<string, PhysicsObjectCollisionCheckAB>());
    }
    this._handlers.get(sza).set(szp, func);
  }
  public registerCollider(ob: PhysicsObject) {
    //should be called directly from physisobject constructor
    let sza = Utils.className(ob);

    let c: ColliderClass = this.classifyColliderClass(sza);
    if (c == ColliderClass.Active) {
      this.registerActiveCollider(ob);
      ob.IsCollider = true;
    }
    else if (c == ColliderClass.Passive) {
      this.registerPassiveCollider(ob);
      ob.IsCollider = true; // default this to false.
    }
  }
  public deregisterCollider(ob: PhysicsObject) {
    if (ob.IsCollider) {
      let c: ColliderClass = this.classifyColliderClass(sza);
      if (c == ColliderClass.Active) {
        this.removeActiveCollider(ob);
      }
      else if (c == ColliderClass.Passive) {
        this.removePassiveCollider(ob);
      }
    }
  }
  public handleCollisions() {
    for (let key of Array.from(this._active_bucket.keys())) {
      let arr: Array<PhysicsObject> = this._active_bucket[key];

      for (let iob = 0; iob < arr.length; ++iob) {

      }

    }
  }
}


interface DestroyAllObjectsFunction { (ob: PhysicsObject): boolean; }
interface FindAllObjectsFunction { (ob: PhysicsObject): boolean; }
class PhysicsManager {
  private _objects: Array<PhysicsObject> = new Array<PhysicsObject>();
  private _collide: Array<PhysicsObject> = new Array<PhysicsObject>();
  public get Objects(): Array<PhysicsObject> { return this._objects; }
  private toDestroy: Array<PhysicsObject> = new Array<PhysicsObject>();
  public Scene: THREE.Scene = null; //= new THREE.Scene();

  private _manifold: CollisionManifold = new CollisionManifold();
  get collisions(): CollisionManifold { return this._manifold; }

  public constructor() {
  }
  public findObjectOfType(fn: FindAllObjectsFunction): boolean {
    if (fn) {
      for (let i = 0; i < this._objects.length; ++i) {
        //For why this looks weird see: https://github.com/Microsoft/TypeScript/issues/5236
        if (fn(this._objects[i])) {
          return true;
        }
      }
    }
    else {
      Globals.logError("findobjectoftype - no function supplied.");
    }
    return false;
  }
  public destroyAllObjects(fn: DestroyAllObjectsFunction) {
    if (fn) {
      for (let i = 0; i < this._objects.length; ++i) {
        //For why this looks weird see: https://github.com/Microsoft/TypeScript/issues/5236
        if (fn(this._objects[i])) {
          this.destroy(this._objects[i]);
        }
      }
    }
    else {
      Globals.logError("destroyAllObjects - no function supplied.");

    }
  }
  // public addOrRemoveCollider(ob: PhysicsObject) {
  //   //Basically this should be turned into "set Collider" because we're marking the Phy as a collider
  //   if (ob.Collide != null) {
  //     for (let i = this._collide.length - 1; i >= 0; --i) {
  //       if (this._collide[i] === ob) {
  //         if (Globals.isDebug()) {
  //           //this is not an error really - we can optimize this for loop search though by adding a flag on the physics object 
  //           Globals.logError("Tried to add duplicate collider.");
  //         }

  //         return;
  //       }
  //     }
  //     this._collide.push(ob);
  //   }
  //   else {
  //     this.removeCollider(ob);
  //   }
  // }
  public add(obj: PhysicsObject) {
    for (let i = this._objects.length - 1; i >= 0; --i) {
      if (this._objects[i] == obj) {
        Globals.logError("Tried to add duplicate phy obj.");
        return;
      }
    }
    this._objects.push(obj);
    // if (obj.Collide) {
    //   this.addOrRemoveCollider(obj);
    // }
    this.Scene.add(obj);
  }
  public destroy(obj: PhysicsObject) {
    if (obj.IsDestroyed === false) {
      this.Scene.remove(obj);
      this.toDestroy.push(obj);
      if (obj.OnDestroy) {
        obj.OnDestroy(obj);
      }
      obj.IsDestroyed = true;
    }
  }
  // private removeCollider(ob: PhysicsObject) {
  //   if (ob.Collide) {
  //     for (let j = this._collide.length - 1; j >= 0; --j) {
  //       if (this._collide[j] == ob) {
  //         this._collide.splice(j, 1);//delete
  //       }
  //     }
  //   }
  // }
  public update(dt: number): void {
    let that = this;
    // var x = Worker(function () { });

    // setTimeout(function () {
    g_prof.begin("physics-destroy&update");
    //Preliminary destroy . distance
    for (let i = 0; i < that._objects.length; ++i) {
      let ob = that._objects[i];

      if (ob.DestroyCheck(ob)) {
        //Objects must have a destroy function defined.
        that.destroy(ob);
      }
      else {
        ob.update(dt);
      }
    }
    g_prof.end("physics-destroy&update");



    let nComps = 0;//REMOVE
    let nCollides = 0;//REMOVE
    let ndc: Dictionary<number> = {};//REMOVE
    g_prof.begin("physics-collide");
    this.handleCollisions();

    //Collide with others
    // for (let i = 0; i < that._collide.length; i++) {
    //   for (let j = i + 1; j < that._collide.length; j++) {
    //     let a = that._collide[i];
    //     let b = that._collide[j];
    //     if (a.IsDestroyed === false && b.IsDestroyed === false) {
    //       if (a.Box.intersectsBox(b.Box)) {
    //         nComps++;
    //         if (a.Collide) {
    //           nCollides++;
    //           if (!(a.constructor.name in ndc)) {
    //             ndc[a.constructor.name] = 0;//REMOVE
    //           } ndc[a.constructor.name]++;

    //           a.Collide(b);
    //         }
    //         if (b.Collide) {
    //           if (!(b.constructor.name in ndc)) {//REMOVE
    //             ndc[b.constructor.name] = 0;
    //           } ndc[b.constructor.name]++;

    //           nCollides++;
    //           b.Collide(a);
    //         }
    //       }
    //     }
    //   }
    // }
    if (Globals.getFrameNumber() % 30 === 0 /*|| Object.keys(ndc).length>0*/) {
      Globals.logInfo('comparing ' + that._collide.length + ' with #comps=' + nComps + " #collides" + nCollides);
      if (nComps > 0) {
        let nd: Dictionary<number> = {};
        for (let i = 0; i < that._collide.length; ++i) {//REMOVE
          let ob = that._collide[i];
          if (!(ob.constructor.name in nd)) {
            nd[ob.constructor.name] = 0;
          }
          nd[ob.constructor.name]++;
        }
        let sz: string = "";
        sz += ('holy shieet') + "\n";
        for (let key in nd) {
          sz += (key + " " + nd[key]) + "\n";//REMOVE
        }
        for (let key in ndc) {
          sz += ('collide: ' + key + " " + ndc[key]) + "\n";//REMOVE
        }
        Globals.logInfo(sz);
      }

    }
    g_prof.end("physics-collide");

    g_prof.begin("physics-removal");
    //Remove destroyed.
    for (let i = that.toDestroy.length - 1; i >= 0; --i) {
      let ob = that.toDestroy[i];
      if (ob.IsDestroyed) {

        for (let j = that._objects.length - 1; j >= 0; --j) {
          if (that._objects[j] == ob) {
            that._objects.splice(j, 1);//delete
          }
        }
        that.removeCollider(ob);
      }
    }
    g_prof.end("physics-removal");

    that.toDestroy = new Array<PhysicsObject>();
    //  }, 13);

  }
  private handleCollisions() {

  }

}
class Flash {
  private _flashing: boolean = false;
  private _flash: number = 0;
  private _flashDir: number = 1;//-1, or 1
  private _saturation: number = 0;
  private _duration: number = 0;
  private _flashColor: Color = new Color(0, 0, 0);
  private _ob_to_color_ob: Array<THREE.Mesh> = new Array<THREE.Mesh>();
  private _ob_to_color_color: Array<Color> = new Array<Color>();
  private _ob_to_color_color_em: Array<Color> = new Array<Color>();//For MeshStandardMaterial
  private _ob_to_material: Array<THREE.Material> = new Array<THREE.Material>();

  private _parent: Object3D = null;

  public constructor(parent: Object3D) {
    this._parent = parent;
  }
  public flash(color: Color, durationInSeconds: number, saturation: number): void {
    //Saturation from [0,1]
    //Flash this a color (like when it gets hit)
    if (this._flashing == false) {
      this._flashing = true;
      this._flashColor = color;
      this._flash = 0.000001; //set to little amount to prevent erroneous checking.
      this._saturation = Utils.clampScalar(saturation, 0, 1);
      this._duration = Utils.clampScalar(durationInSeconds, 0, 999999);
      this._ob_to_color_ob = new Array<THREE.Mesh>();
      this._ob_to_color_color = new Array<Color>();
      this._ob_to_color_color_em = new Array<Color>();
      this._ob_to_material = new Array<THREE.Material>();
      this._flashDir = 1;

      //Save all colors
      let that = this;
      this._parent.traverse(function (ob_child: any) {
        if (ob_child instanceof THREE.Mesh) {

          let m: THREE.Mesh = ob_child as THREE.Mesh;
          that._ob_to_color_ob.push(m);

          //Save material, and swap, restore later to prevent too many render passes.
          let m2: THREE.Material = null;
          if (m.material instanceof THREE.MeshBasicMaterial) {
            m.material = m.material.clone();
            that._ob_to_material.push(m.material);
          }
          else if (m.material instanceof THREE.MeshStandardMaterial) {
            m.material = m.material.clone();
            that._ob_to_material.push(m.material);
          }
          else {
            that._ob_to_material.push(null);
          }

          let c: Color = Utils.getMeshColor(m);
          that._ob_to_color_color.push(c);
          let ce: Color = Utils.getMeshColorEm(m);
          that._ob_to_color_color_em.push(ce);


          //Blank out emissive so we get a full red.
          Utils.setMeshColorEm(m, new THREE.Color(0, 0, 0));
        }
      });
    }

  }
  public update(dt: number) {
    if (this._flashing) {

      this._flash += dt * this._flashDir;
      if (this._flash >= this._duration * .5) {
        //Subtract any amount that went over.
        let rem = this._flash - this._duration * .5;
        this._flash -= rem;
        //reverse direction
        this._flashDir = -1;
      }

      //If we hit zero, we're done
      if (this._flash <= 0) {
        this._flash = 0;
        this._flashing = false;
        for (let iob = 0; iob < this._ob_to_color_ob.length; iob++) {
          let m: THREE.Mesh = this._ob_to_color_ob[iob];
          Utils.setMeshColor(m, this._ob_to_color_color[iob]);
          Utils.setMeshColorEm(m, this._ob_to_color_color_em[iob]);
          if (this._ob_to_material[iob]) {
            m.material = this._ob_to_material[iob];
          }

        }
        return;
      }

      let fpct: number = this._flash / (this._duration * .5) * this._saturation;

      let that = this;
      for (let iob = 0; iob < this._ob_to_color_ob.length; iob++) {
        let c: Color = this._ob_to_color_color[iob]
        let c2: Color = Utils.lerpColor(c, that._flashColor, fpct);

        let m: THREE.Mesh = this._ob_to_color_ob[iob];
        Utils.setMeshColor(m, c2);

      }
    }
  }

}
//interface PhysicsObjectCollisionCheck { (b: PhysicsObject): void; }
interface PhysicsObjectDestroyCheck { (ob: PhysicsObject): boolean; }
interface PhysicsObjectDestroyCallback { (ob: PhysicsObject): void; }
interface PhysicsObjectDestroyCallback { (ob: PhysicsObject): void; }
class PhysicsObject extends THREE.Object3D {
  // protected _bbox = new THREE.Box3();
  private _velocity: Vector3 = new Vector3();
  private _isDestroyed: boolean = false;
  private _rotation: Vector3 = new Vector3();
  private _scale: Vector3 = new Vector3();
  protected _model: THREE.Mesh = null;
  private _boxHelper: THREE.BoxHelper = null;
  get model(): THREE.Mesh { return this._model; }

  private _health: number = 100;
  get health(): number { return this._health; }
  set health(v: number) { this._health = v }

  public IsCollider: boolean = false;

  protected _afterLoadModel: ModelObjectCallback = null; //Called after ship is loaded.  This is actually implemented (sloppily) by subclasses.
  public OnDestroy: PhysicsObjectDestroyCallback = null;

  private _flash: Flash = null;
  public flash(color: Color, durationInSeconds: number, saturation: number) {
    if (this._flash == null) {
      this._flash = new Flash(this);
    }
    this._flash.flash(color, durationInSeconds, saturation);
  }

  //Default destroy routine for all objects.
  private _destroy: PhysicsObjectDestroyCheck = function (ob: PhysicsObject) {
    if (!g_player || !ob) {
      let n = 0;
      n++;
    }
    //Destroy if we are too far awawy from the player.
    let ca: boolean = Math.abs(ob.WorldPosition.z - g_player.WorldPosition.z) > 500;//.distanceToSquared(player.WorldPosition) >= (camera.far * camera.far);
    //Destroy if we are behind the player (we only move forward in the z)
    let cb: boolean = ob.position.z - g_player.position.z > 20;
    //Destroy if our scale is zero
    let cc: boolean = (ob.scale.x < 0.0001) && (ob.scale.y < 0.0001) && (ob.scale.z < 0.0001);
    //Opacity is zero
    let cd: boolean = ob._opacity <= 0;

    return ca || cb || cc || cd;
  }
  get DestroyCheck(): PhysicsObjectDestroyCheck { return this._destroy; }
  set DestroyCheck(v: PhysicsObjectDestroyCheck) { this._destroy = v; }

  //Setting Collide will add or remove the object from the game's collider list
  //If collide is null, the object doesn't collide with anything.  This is for performance reasons.  Don't set Collide if the object doesn't collide (for example is a collidee)
  // private _collide: PhysicsObjectCollisionCheck = null;
  // get Collide(): PhysicsObjectCollisionCheck { return this._collide; }
  // set Collide(f: PhysicsObjectCollisionCheck) {
  //   this._collide = f;
  //   g_physics.addOrRemoveCollider(this);
  // }

  public collide<S, T>(func: PhysicsObjectCollisionCheck<T>) {
    g_physics.addOrRemoveCollider<T>(this, func);
  }

  get Box(): Box3 {
    return new THREE.Box3().setFromObject(this);
  }
  get IsDestroyed(): boolean { return this._isDestroyed; }
  set IsDestroyed(b: boolean) { this._isDestroyed = b; }
  get Velocity(): Vector3 { return this._velocity; }
  set Velocity(val: Vector3) { this._velocity = val; }
  get RotationDelta(): Vector3 { return this._rotation; }
  set RotationDelta(val: Vector3) { this._rotation = val; }
  get ScaleDelta(): Vector3 { return this._scale; }
  set ScaleDelta(val: Vector3) { this._scale = val; }
  set OpacityDelta(val: number) { this._opacityDelta = val; }
  get OpacityDelta(): number { return this._opacityDelta; }
  private _opacity: number = 1;
  private _opacityDelta: number = 0;

  set Opacity(val: number) {
    if (this._model !== null) {
      let mod: THREE.Mesh = this._model as THREE.Mesh;
      if (mod) {
        if (mod.material) {
          let mat: THREE.Material = mod.material as THREE.Material;
          if (mat) {
            if (mat.transparent === false) {
              mat.transparent = true;
            }
            mat.opacity = val;
          }
        }
      }
    }
  }
  set Color(val: Color) {
    if (this._model !== null) {
      let mod: THREE.Mesh = this._model as THREE.Mesh;
      if (mod) {
        Utils.setMeshColor(mod, val);
      }
    }
  }
  public constructor() {
    super();
    g_physics.add(this);

    //By default, set us to be the default box so, in case models fail to load, we can
    //still see them.
    this.setModel(this.createDefaultGeo());
  }
  public destroy() {
    g_physics.destroy(this);
  }

  public update(dt: number) {
    this.position.add(this.Velocity.clone().multiplyScalar(dt));
    let rdt = this.RotationDelta.clone().multiplyScalar(dt);
    this.rotation.x = (this.rotation.x + rdt.x) % (Math.PI * 2);
    this.rotation.y = (this.rotation.y + rdt.y) % (Math.PI * 2);
    this.rotation.z = (this.rotation.z + rdt.z) % (Math.PI * 2);
    this.scale.x += this._scale.x * dt;
    if (this.scale.x < 0) { this.scale.x = 0.00001; } // why 0.001? see https://github.com/aframevr/aframe-inspector/issues/524
    this.scale.y += this._scale.y * dt;
    if (this.scale.y < 0) { this.scale.y = 0.00001; }
    this.scale.z += this._scale.z * dt;
    if (this.scale.z < 0) { this.scale.z = 0.00001; }

    if (this._flash) {
      this._flash.update(dt);
    }

    if (this._opacityDelta != 0) {
      this._opacity += this._opacityDelta * dt;
      this._opacity = Math.min(1, Math.max(0, this._opacity));
      this.Opacity = this._opacity;
    }

  }
  public get WorldPosition(): Vector3 {
    let v = new Vector3();
    this.getWorldPosition(v);
    return v;
  }
  private _modelHidden: boolean = false;
  public hideModel() {
    if (this._model) {
      this.remove(this._model);
      this._modelHidden = true;
    }
  }
  public showModel() {
    if (this._model) {
      this.add(this._model);
      this._modelHidden = false;
    }
  }
  public setModel(m: THREE.Mesh) {
    if (this._model) {
      this.remove(this._model);
    }
    if (this._boxHelper) {
      this.remove(this._boxHelper);
    }
    this._model = null;
    this._boxHelper = null;

    if (m !== null) {
      this._model = m;
      if (this._modelHidden) {
        //Do not add model if we have hidden the model
      }
      else {
        this.add(this._model);
      }

      if (Globals.isDebug()) {
        this._boxHelper = new THREE.BoxHelper(this._model, new THREE.Color(0xffff00));
        this.add(this._boxHelper);
      }
    }
  }
  protected createDefaultGeo(): THREE.Mesh {
    var geo = new THREE.BoxBufferGeometry(.3, .03, .2);
    geo.computeBoundingBox(); // for hit area
    var mat = new THREE.MeshBasicMaterial({
      //map: this._texture,
      transparent: false,
      side: THREE.DoubleSide,
      color: 0x9FC013,
    });
    geo.computeBoundingBox();

    let mesh: THREE.Mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(Random.float(0.8, 5), Random.float(0.8, 2), Random.float(0.8, 2));

    return mesh;
  }

}
class Gun extends Object3D {
  private _bulletTimer: WaitTimer = new WaitTimer(0.2);
  private _bombTimer: WaitTimer = new WaitTimer(0.2);
  private _parentShip: Ship = null;
  private _damage: number = 10;

  public bulletSpeed: number = 90;
  get bulletTimer(): WaitTimer {
    return this._bulletTimer;
  }
  get bombTimer(): WaitTimer {
    return this._bombTimer;
  }
  public constructor(parentShip: Ship, speed: number, damage: number) {
    super();
    this._parentShip = parentShip;
  }
  public canFire(): boolean {
    return this._bulletTimer.ready();
  }
  public update(dt: number) {
    this._bulletTimer.update(dt);
    this._bombTimer.update(dt);
  }
  public fire(n: Vector3) {
    if (this._bulletTimer.ready()) {
      let v: THREE.Vector3 = new THREE.Vector3();
      this.getWorldPosition(v);

      let mod: Files.Model = Files.Model.Bullet;
      if (this._parentShip instanceof EnemyShip) {
        mod = Files.Model.Big_Bullet;
      }

      let b1: Bullet = null;
      if (this._parentShip instanceof EnemyShip) {
        b1 = new EnemyBullet(this._parentShip, v, n, this.bulletSpeed, this._damage, mod);
      }
      else if (this._parentShip instanceof PlayerShip) {
        b1 = new PlayerBullet(this._parentShip, v, n, this.bulletSpeed, this._damage, mod);
      }

      g_audio.play(Files.Audio.Shoot);
      this._bulletTimer.reset();
    }
  }
  public bomb(n: Vector3): boolean {
    if (this._bombTimer.ready()) {
      let b1: Bomb = new Bomb(n);

      //shoot from gun1, why not?
      let v: THREE.Vector3 = new THREE.Vector3();
      this.getWorldPosition(v);
      b1.position.copy(v);

      g_audio.play(Files.Audio.Bomb_Shoot);
      this._bombTimer.reset();
      return true;
    }
    return false;
  }
}
/**
 * @class Ship
 * @brief Spaceship class representing both player and enemy ship.
 * */
class Ship extends PhysicsObject {
  private _pitch: number = 0;
  private _maxpitch: number = Math.PI * 0.15;
  private _strafeSpeed: number = 12;
  private _liftSpeed: number = 12;
  private _roll: number = 0;
  private _maxroll: number = Math.PI * 0.25;

  protected _damage = 10;

  protected _maxhealth: number = 100;
  get maxhealth(): number { return this._maxhealth; }

  private _guns: Array<Gun> = new Array<Gun>();
  get Guns(): Array<Gun> { return this._guns; }
  set Guns(guns: Array<Gun>) { this._guns = guns; }

  protected setBulletSpeed(s: number) {
    for (let gi = 0; gi < this.Guns.length; ++gi) {
      this.Guns[gi].bulletSpeed = s;
    }
  }

  public constructor(sz_m: Files.Model, afterload: ModelObjectCallback) {
    super();

    this._afterLoadModel = afterload;

    let that = this;
    g_models.setModelAsyncCallback(sz_m, function (m: THREE.Mesh) {
      if (m) {
        let mclone: THREE.Mesh = Utils.duplicateModel(m);
        that.setModel(mclone);

        mclone.traverse(function (ob_gun: any) {
          if (ob_gun instanceof Object3D) {
            let n: string = ob_gun.name;
            if (n.toLowerCase().startsWith('gun') && n.length >= 4) {
              let id: number = 0;

              let gwp: Vector3 = new Vector3();
              ob_gun.getWorldPosition(gwp);

              let gun: Gun = new Gun(that, 90, that._damage);
              gun.position.copy(gwp);
              if (id >= 0) {
                that.add(gun);
                that.Guns.push(gun);
              }
            }
          }
        });
        if (that._afterLoadModel) {
          that._afterLoadModel(that, m);
        }

      }
    });
  }
  public fireAllGuns(dir: Vector3) {
    let n = dir;
    for (let i = 0; i < this.Guns.length; ++i) {
      this.Guns[i].fire(n);
    }
  }
  public moveLeftRight(dt: number, xaxis: number) {
    this.position.x += this._strafeSpeed * xaxis * dt;
    this._roll = this._maxroll * xaxis * -1;
  }
  public moveUpDown(dt: number, yaxis: number) {
    this.position.y += this._liftSpeed * yaxis * dt;
    this._pitch = this._maxpitch * yaxis;
  }
  public bulletDamage(b: Bullet) {
    this.health -= b.Damage;
    g_audio.play(Files.Audio.Ship_Hit);
    g_physics.destroy(b);
    g_particles.createShipHitParticles(b.WorldPosition);
    this.flash(new Color(1, 0, 0), .15, 1);
  }
  public update(dt: number) {
    super.update(dt);
    for (let gi: number = 0; gi < this._guns.length; ++gi) {
      this._guns[gi].update(dt);
    }

    this.rotation.x = this._pitch;
    this.rotation.z = this._roll;
  }
}
class PlayerShip extends Ship {
  public bombs: number = 3;
  public maxbombs: number = 3;
  public score: number = 0;
  public _bombSpeed_lv: Array<number> = [
    3.0, 2.5, 2.5,
    2.0, 2.0, 1.6,
    1.6, 1.6, 0.7,
    0.7];
  public bombTimer: WaitTimer = new WaitTimer(this._bombSpeed_lv[0]);
  public _gunSpeed_lv: Array<number> = [
    0.3, 0.25, 0.25,
    0.2, 0.2, 0.15,
    0.15, 0.15, 0.1,
    0.1];

  public ShipLevel: number = 0;

  public constructor() {
    super(Files.Model.Player_Ship, function (ob: PhysicsObject, m: THREE.Mesh) {
      ob.Color = (ob as PlayerShip).getColorForShipLevel((ob as PlayerShip).ShipLevel);
      //Set level to 1 and set all values.
      //Only callable after our model has loaded since guns need to be tehre.
      (ob as PlayerShip).levelUp();

      if (ob instanceof PlayerShip) {
        ob.setBulletSpeed(90);
      }

    });



    //Set the collision routine.
    let that = this;
    this.collide<EnemyBullet>(function (me: PhysicsObject, other: EnemyBullet) {

      me.health -= other.Damage;
      g_audio.play(Files.Audio.Ship_Hit);
      g_physics.destroy(other);
      g_particles.createShipHitParticles(other.WorldPosition);
      (me as PlayerShip).checkHealth();
    });
    this.collide<EnemyShip>(function (me: PhysicsObject, other: EnemyShip) {
      g_particles.createShipHitParticles(me.position);
      g_particles.createShipDieParticles(me.position);
      g_audio.play(Files.Audio.Ship_Hit);
      me.health -= 50;
      other.destroy();
      (me as PlayerShip).checkHealth();
    });

    // this.Collide = function (b: PhysicsObject) {
    //   if (g_isgameover == false) {
    //     if (b instanceof Bullet) {
    //       if ((b as Bullet).Firer instanceof EnemyShip) {

    //         that.health -= (b as Bullet).Damage;
    //         g_audio.play(Files.Audio.Ship_Hit);
    //         g_physics.destroy(b);
    //         g_particles.createShipHitParticles(b.WorldPosition);
    //       }
    //     }
    //     else if (b instanceof EnemyShip) {
    //       g_particles.createShipHitParticles(that.position);
    //       g_particles.createShipDieParticles(that.position);
    //       g_audio.play(Files.Audio.Ship_Hit);
    //       that.health -= 100;
    //       b.destroy();
    //     }
    //     else if (b instanceof Boss) {
    //       g_particles.createShipHitParticles(that.position);
    //       g_particles.createShipDieParticles(that.position);
    //       g_audio.play(Files.Audio.Ship_Hit);
    //       that.health -= 100;
    //       b.destroy();
    //     }

    //   }
    // };

  }
  private checkHealth(): void {
    if (this.health <= 0) {
      this.health = 0;
      g_particles.createShipDieParticles(this.WorldPosition);
      g_audio.play(Files.Audio.Ship_Explode);

      stopGame();
    }
  }
  public levelUp(): void {
    this.ShipLevel += 1;
    this.Color = this.getColorForShipLevel(this.ShipLevel);

    this._damage = 5 + this.ShipLevel * 5;
    if (this.ShipLevel === 1) {
    }
    else if (this.ShipLevel === 2) {
    }
    else if (this.ShipLevel === 3) {
      this.maxbombs = 4;
    }
    else if (this.ShipLevel == 4) {
    }
    else if (this.ShipLevel == 5) {
    }
    else if (this.ShipLevel == 6) {
      this.maxbombs = 5;
    }
    else if (this.ShipLevel == 7) {
    }
    else if (this.ShipLevel == 8) {
    }
    else if (this.ShipLevel == 9) {
      this.maxbombs = 7;
    }
    else {
    }

    for (let gi: number = 0; gi < this.Guns.length; ++gi) {
      this.Guns[gi].bulletTimer.interval = this._gunSpeed_lv[this.ShipLevel > 10 ? 9 : this.ShipLevel - 1];
      this.Guns[gi].bombTimer.interval = this._bombSpeed_lv[this.ShipLevel > 10 ? 9 : this.ShipLevel - 1];
    }

    g_audio.play(Files.Audio.LevelUp);
  }

  public getColorForShipLevel(level: number): Color {
    let color: Color = new Color(1, 1, 1);
    if (level === 1) {
      color = new Color(0.2, 0.4, 1);
    }
    else if (level === 2) {
      color = new Color(0.2, 1, 0.3);
    }
    else if (level === 3) {
      color = new Color(1, 0.5, 0.2);
    }
    else if (level === 4) {
      color = new Color(0, 0.5, 1.0);
    }
    else if (level === 5) {
      color = new Color(0.7, 0.1, 0.3);
    }
    else if (level === 6) {
      color = new Color(1, 0.0, 0.0);
    }
    else if (level === 7) {
      color = new Color(0.48, 0.4, 1.0);
    }
    else if (level === 8) {
      color = new Color(0.45, 0.45, 0.12);
    }
    else if (level === 9) {
      color = new Color(1, 1, 1);
    }
    else if (level === 10) {
      color = new Color(.1, .1, .2);
    }
    return color;
  }

  private _nresetclick = 0;
  public update(dt: number) {
    if (g_isgameover == false) {
      this.bombTimer.update(dt);

      this.moveLeftRight(dt, g_input.left.Axis.x);
      this.moveUpDown(dt, g_input.left.Axis.y);


      if (Globals.userIsInVR()) {
        if (g_input.right.Trigger.pressOrHold()) {
          this.tryFireGun(this.Guns[0], g_input.right.Position);
        }
        if (g_input.left.Trigger.pressOrHold()) {
          this.tryFireGun(this.Guns[1], g_input.left.Position);
        }
        if (g_input.right.A.pressed()) {
          this.tryFireBomb(this.Guns[0], g_input.right.Position);
        }
        if (g_input.left.A.pressed()) {
          this.tryFireBomb(this.Guns[1], g_input.left.Position);
        }
      }
      else {
        if (g_input.right.Trigger.pressOrHold() || g_input.left.Trigger.pressOrHold()) {
          this.tryFireGun(this.Guns[0], g_input.right.Position);
          this.tryFireGun(this.Guns[1], g_input.left.Position);
        }
        if (g_input.right.A.pressed() || g_input.left.A.pressed()) {
          this.tryFireBomb(this.Guns[0], g_input.right.Position);
        }
      }



    }
    else {
      if (g_input.right.anyButtonPressed() || g_input.left.anyButtonPressed()) {
        this._nresetclick++;
        g_audio.play(Files.Audio.Get_Item);
      }
      if (this._nresetclick === 3) {
        this._nresetclick = 0;
        startGame();
      }
    }
    super.update(dt);
  }
  private tryFireGun(g: Gun, target_pos: Vector3): void {
    if (g.canFire()) {
      if (Globals.userIsInVR()) {
        let n = new THREE.Vector3();
        let cw: Vector3 = new Vector3();
        g_camera.getWorldPosition(cw);
        //Down a bit so player doesn't have to lift hands
        cw.y -= g_userGroup.position.y / 2;
        n = g_input.right.Position.clone().sub(cw);
        g.fire(n);
      }
      else {
        let n = new THREE.Vector3();
        g_camera.getWorldDirection(n);
        g.fire(n);
      }
    }
  }
  private tryFireBomb(g: Gun, target_pos: Vector3): void {
    if (this.bombs > 0 && g.canFire()) {
      let n = new THREE.Vector3();
      g_camera.getWorldDirection(n);
      if (g.bomb(n)) {
        this.bombs -= 1;
      }

    }
    else {
      g_audio.play(Files.Audio.Nope);
    }
  }
  private getBulletTimeForLevel() {
    if (this.ShipLevel == 1) { }
  }
}
class EnemyShip extends Ship {
  private _droprate: number = 0;
  private _fireTimer: Timer = null;
  private _fireTime: number = 10000;
  private _points: number = 0;
  private _numdrops: number = 0;
  get Points(): number { return this._points; }

  public constructor(model: Files.Model, health: number, droprate: number, numdrops: number, firetime: number, points: number) {
    super(model, function (ob: PhysicsObject, m: THREE.Mesh) {
      //Set bullet speed for all guns for enemy ships to be a little slower.
      if (ob instanceof EnemyShip) {
        ob.setBulletSpeed(45);
      }

    });
    let that = this;
    this._fireTime = firetime;
    this._points = points;

    this.health = health;
    this._numdrops = numdrops;

    this._droprate = droprate;//% chance of a drop.

    this._fireTimer = new Timer(firetime, function () {
      that.fire();
    });

    this.Collide = function (b: PhysicsObject) {
      if (b instanceof Bullet) {
        if ((b as Bullet).Firer instanceof PlayerShip) {
          that.bulletDamage(b as Bullet);
        }
      }
      if (b instanceof BombExplosion) {
        that.health -= 100;
      }
      if (b instanceof Bomb) {
      }

      if (that.health <= 0) {
        that.health = 0;
        g_particles.createShipDieParticles(that.WorldPosition);
        g_audio.play(Files.Audio.Ship_Explode);

        //Drop stuff
        for (let i = 0; i < that._numdrops; ++i) {
          that.dropItem();
        }

        //Incement score
        g_player.score += that.Points;

        //Kill it
        that.destroy();
      }
    };

  }
  private dropItem() {
    //Item Drops:
    //If the player is deficient then have a 20% chance to drop levels, else drop supplies.
    //Otherwise only drop levels, we have all our supplies.
    let playerDeficient: boolean = g_player.health < g_player.maxhealth || g_player.bombs < g_player.maxbombs;
    let isLevelItem: boolean = playerDeficient ? (Random.float(0, 1) > 0.8) : true;

    let drop = (1.0 - this._droprate * 0.01);
    if (Random.float(0, 1) >= drop) {
      let item = new Item(isLevelItem);
      //place item random position around ship, because there might be more than 1 item.
      item.position.copy(this.position.clone().add(Random.randomNormal().multiplyScalar(3)));
    }
  }
  private fire() {
    let dir: Vector3 = new Vector3();

    //Point the bullet a ways away from the player for the effect of "trying" to shoot player.
    let v: Vector3 = g_player.WorldPosition.clone();

    dir.copy(v.sub(new Vector3(0, 0, Random.float(0, 1) * g_player.Velocity.z * 1.5)));

    dir.sub(this.WorldPosition);
    dir.normalize();

    this.fireAllGuns(dir);
    this._fireTimer.Interval = 3000 + Random.float(2000, 5000);
  }
  public update(dt: number) {
    super.update(dt);
    this._fireTimer.update(dt);
  }
}
/**
 * The boss has 3 states.
 * 1. rotate towards player slowly, & fire slowly
 * 2. spin around and fire a ton of missiles for 4 seconds.
 * 3. cooldown.
 */
enum BossState { None, Fire, Spin, Cooldown }
class Boss extends EnemyShip {

  private _gunTimers: Array<Timer> = new Array<Timer>();

  private _rotz = 0;

  private _stateTimer: WaitTimer = new WaitTimer(15);
  private _eState: BossState = BossState.Fire;
  private _posSaved: Vector3 = new Vector3();

  public constructor() {
    super(Files.Model.Boss, 2000, 100, 3, -1, 100);

    this.health = 1000;
    let that = this;
    this.Collide = function (b: PhysicsObject) {
      if (b instanceof Bullet) {
        if ((b as Bullet).Firer instanceof PlayerShip) {
          that.bulletDamage(b as Bullet);
        }
      }
      if (that.health <= 0) {
        that.health = 0;
        g_particles.createBossDieParticles(that.WorldPosition);
        g_audio.play(Files.Audio.Ship_Explode);
        that.destroy();
        exitBoss();
      }
    }

    this.DestroyCheck = function (ob: PhysicsObject) {
      let x = ob.position.z - g_player.position.z;
      if (x > 20) {
        let n = 0;
        n++;
      }
      return x > 20;
    }
    this.OnDestroy = function (ob: PhysicsObject) {
      exitBoss();
    }
  }
  public update(dt: number) {
    super.update(dt);
    this.updateState(dt);
    this.perform(dt);
  }
  private updateState(dt: number) {
    if (this._stateTimer.update(dt)) {
      if (this._eState === BossState.Fire) {
        //reset transform.
        this._posSaved.copy(this.position);
        this._eState = BossState.Spin;
        this._stateTimer.interval = 7;//spin 7s
      }
      else if (this._eState === BossState.Spin) {
        this._eState = BossState.Cooldown;
        this._stateTimer.interval = 12;//cooldown 12s
      }
      else if (this._eState === BossState.Cooldown) {
        //Restore state
        this._eState = BossState.Fire;
        this.position.copy(this._posSaved);
        this.scale.set(1, 1, 1);
        this._stateTimer.interval = 12; // fire 12s
      }
      else {
        Globals.logError("Undefined boss state. " + this._eState);
      }
      this._stateTimer.reset();
    }
  }
  private _rz: number = 0;
  private _rotNormal: Vector3 = new Vector3();
  private perform(dt: number) {
    const revspeed = Math.PI * 0.9;
    const turnspeed = Math.PI * 0.9;

    if (this._eState === BossState.Fire) {
      //rotate towards player slowly.
      let want_dir: Vector3 = g_player.WorldPosition.clone().sub(this.WorldPosition.clone()).normalize();
      let this_dir: Vector3 = new Vector3();
      this.getWorldDirection(this_dir);

      let rot = Math.acos(want_dir.dot(this_dir));
      this._rotNormal = this_dir.clone().cross(want_dir.clone()).normalize();

      this._rz += Math.min(rot * dt, turnspeed); //this._rz + turnspeed * dt * (rot < 0 ? -1 : 1);
      this.rotateOnAxis(this._rotNormal, this._rz);
    }
    else if (this._eState === BossState.Spin) {
      //Rev up
      this._rz = Math.min(this._rz + revspeed * dt, Math.PI * 3);
      this.rotateOnAxis(this._rotNormal, this._rz);
    }
    else if (this._eState === BossState.Cooldown) {
      if (this._rz > 0) {
        //Wind Down
        this._rz = Math.max(this._rz - revspeed * dt, 0);
        this.rotateOnAxis(this._rotNormal, this._rz);
      }
      else {
        //Shake in place, squish a litte.
        this.position.copy(this._posSaved);
        this.position.add(Random.randomNormal().setZ(this._posSaved.z).multiplyScalar(0.078));
        let squish: number = 0.983;
        this.scale.set(Random.float(squish, 1.03), Random.float(squish, 1.03), Random.float(squish, 1.03));
      }
    }


  }


}
class Projectile extends PhysicsObject {
  private _speed: number = 40;//.4;
  public Damage: number = 10;
  public constructor(spd: number, direction: Vector3, model: Files.Model, afterLoad: ModelObjectCallback) {
    super();

    this._afterLoadModel = afterLoad;

    let that = this;
    g_models.setModelAsyncCallback(model, function (b: THREE.Mesh) {
      if (b != null) {
        let b2 = Utils.duplicateModel(b);
        that.setModel(b2);

        //that.model.material = b.material.clone();

        that.lookAt(that.position.clone().add(direction));

        if (that._afterLoadModel) {
          that._afterLoadModel(that, b);
        }
      }
      else {
        Globals.logError("Could not find model" + model);
      }
    });

    this.Collide = function () { }//Force object to collide
    this._speed = spd;
    this.Velocity.copy(direction.clone().multiplyScalar(this._speed));
  }
}

class Item extends Projectile {
  private _isLevelItem = false;

  public constructor(isLevelItem: boolean) {
    super(0, new Vector3(0, 0, -1), Files.Model.Item, function (object: PhysicsObject, model: THREE.Mesh) {
      //object.setModel(model);
      //fun colors.
      /// object.Color = Utils.clampColor(Random.randomColor(), new Color(.2, .1, .2), new Color(1, 1, 1));
      object.health = 6;
    });
    this.RotationDelta.y = Math.PI * 1.0093;
    this._isLevelItem = isLevelItem;


    let that = this;
    this.Collide = function (b: PhysicsObject) {
      if (g_isgameover == false) {
        if (b instanceof Bullet) {
          that.health -= 1;
          g_particles.createItemParticles(this.WorldPosition);
          that.flash(new Color(.1, .1, .9), .1, 1);
          b.destroy();
        }
        else if (b instanceof PlayerShip) {
          that.giveItem();
        }

        if (that.health <= 0) {
          that.health = 0;
          that.giveItem();
        }
      }
    };

  }
  private giveItem() {
    let playership: PlayerShip = g_player;

    if (this._isLevelItem) {
      g_player.levelUp();
    }
    else {
      g_audio.play(Files.Audio.Get_Item);
      //Health/bombs
      //Give player powerup based on what's missing
      if (playership.bombs === playership.maxbombs) {
        playership.health = Math.min(playership.health + 10, playership.maxhealth);
      }
      else if (playership.health === playership.maxhealth) {
        playership.bombs = Math.min(playership.bombs + 1, playership.maxbombs);
      }
      else {
        let r = Random.float(0, 1);
        if (r > 0.8) {
          playership.health = Math.min(playership.health + 10, playership.maxhealth);
        }
        else {
          playership.bombs = Math.min(playership.bombs + 1, playership.maxbombs);
        }
      }
    }
    this.destroy();
  }
}
class Bullet extends Projectile {
  public Firer: Ship = null;
  public constructor(firer: Ship, position: Vector3, direction: Vector3, spd: number, damage: number, mod: Files.Model) {
    super(spd, direction, mod, function (that: PhysicsObject, m: THREE.Mesh) {
      let c: Color = null;
      if (firer instanceof PlayerShip) {
        c = g_player.getColorForShipLevel(g_player.ShipLevel);;
      }
      else {
        c = new Color(0.1, 0.99193, 0.16134);
      }
      that.Color = c.clone();
      g_particles.createBlasterParticlels(position, c);

      that.position.copy(position);
    });
    let that = this;

    this.Firer = firer;
    this.Damage = damage;
  }
}
class EnemyBullet extends Bullet {
  public Firer: Ship = null;
  public constructor(firer: Ship, position: Vector3, direction: Vector3, spd: number, damage: number, mod: Files.Model) {
    super(firer, position, direction, spd, damage, mod);
  }
}
class PlayerBullet extends Bullet {
  public Firer: Ship = null;
  public constructor(firer: Ship, position: Vector3, direction: Vector3, spd: number, damage: number, mod: Files.Model) {
    super(firer, position, direction, spd, damage, mod);
  }
}
class Bomb extends Projectile {
  private _boomtimer: WaitTimer = new WaitTimer(2.5);

  public constructor(direction: Vector3) {
    super(55, direction, Files.Model.Bomb, function () { });
    this.RotationDelta.x = Math.PI;
    this.rotation.z = Math.PI;
  }
  public update(dt: number) {
    super.update(dt);
    this._boomtimer.update(dt);
    if (this._boomtimer.ready()) {
      g_audio.play(Files.Audio.Bomb);
      let exp: BombExplosion = new BombExplosion(this.position);

      this.destroy();
    }
  }
}
class BombExplosion extends Projectile {
  private _dietimer: WaitTimer = new WaitTimer(1.1);

  public constructor(dposition: Vector3) {
    super(0, new Vector3(0, 1, 0), Files.Model.Bomb_Explosion, function () { });
    this.position.copy(dposition);
  }
  public update(dt: number) {
    super.update(dt);
    this._dietimer.update(dt);

    let scale: number = 150;

    this.scale.x = 0.01 + this._dietimer.time01 * scale;
    this.scale.y = 0.01 + this._dietimer.time01 * scale;
    this.scale.z = 0.01 + this._dietimer.time01 * scale;
    this.rotation.y = this._dietimer.time01 * (Math.PI * 4.9378);
    this.Opacity = 1 - this._dietimer.time01;

    if (this._dietimer.ready()) {
      this.destroy();
    }
  }
}

class Random {
  private static _rand: MersenneTwister = new MersenneTwister;
  private static _initialized: boolean = false;

  private static randomInt(): number {
    if (this._initialized == false) {
      this._initialized = true;
      this._rand.init_seed(new Date().getTime());
    }
    return this._rand.random();
  }
  public static float(min: number, max: number) {
    let f01: number = this.randomInt();
    let n2 = min + (max - min) * f01;
    return n2;
  }
  public static randomColor(): Color {
    let c: Color = new Color();
    let v: Vector3 = this.randomNormal().multiplyScalar(2).subScalar(1);
    c.r = v.x;
    c.g = v.y;
    c.b = v.z;
    return c;
  }
  public static randomNormal(): Vector3 {
    let v: Vector3 = new Vector3();
    v.x = Random.float(-1, 1);
    v.y = Random.float(-1, 1);
    v.z = Random.float(-1, 1);
    v.normalize();
    return v;
  }
  public static bool() {
    //return this._random.random_incl() > 0.5;
    return Math.random() > 0.5;
  }
}
class Starfield extends THREE.Object3D {
  // private _starMesh: THREE.Mesh = null;
  //Stars relative to player.
  private _starScale: IAFloat = new IAFloat(0.2, 2);
  private _starBox: IAVec3 = new IAVec3(new Vector3(-900, -900, -900), new THREE.Vector3(900, 900, 600));
  //Area around player we don't want to make stars
  private _nogo: THREE.Box3 = new THREE.Box3(new Vector3(-200, -200, -200), new Vector3(200, 200, 200));
  private _maxStars: number = 300;
  private _stars: Array<THREE.Mesh> = new Array<THREE.Mesh>();
  get Stars(): Array<THREE.Mesh> { return this._stars; }
  public constructor() {               //rtop rbottom height rsegments hsegments openended
    super();


    //Make a bunch of stars.
    for (let i = 0; i < this._maxStars; ++i) {
      this.tryMakeStar(true);
    }
  }
  public update(dt: number) {
    //Check for dead stars.
    for (let iStar = this._stars.length - 1; iStar >= 0; iStar--) {
      let star: THREE.Mesh = this._stars[iStar];
      if (star.position.z - g_player.position.z >= 20) {
        this._stars.splice(iStar, 1);
        g_physics.Scene.remove(star);
      }
    }

    //Make new stars
    if (this._stars.length < this._maxStars) {
      let num = this._maxStars - this._stars.length;
      for (let iStar = 0; iStar < num; ++iStar) {
        this.tryMakeStar(false);
      }
    }

  }
  private tryMakeStar(z: boolean) {
    let star: THREE.Mesh = null;
    let pos: Vector3 = new Vector3();

    //Try to make a star.
    // Do not make stars too close to player (the nogo box)
    //try 1000 times, else, just quit, we'll try again next frame.
    //not precise but.. meh, they're decoration.
    let player_pos: Vector3 = g_player.WorldPosition.clone();
    for (let iTry = 0; iTry < 255; ++iTry) {
      pos = this._starBox.calc();
      if (z == false) {
        //If z is false, place the star at the edge of the player's view, which is negative
        pos.z = this._starBox.Min.z;
      }
      if (this._nogo.containsPoint(pos)) {
        continue;
      }
      else {
        pos.add(player_pos);
        star = this.makeStar(pos);
        break;
      }
    }
    if (star) {
      this._stars.push(star);
      g_physics.Scene.add(star);
    }
  }
  private makeStar(pos: Vector3): THREE.Mesh {
    let star: THREE.Mesh = null;
    var geo = new THREE.BoxBufferGeometry(1, 1, 1);
    var mat = new THREE.MeshBasicMaterial({
      transparent: false,
      side: THREE.FrontSide,
      color: 0xFFFFFF,
    });

    star = new THREE.Mesh(geo, mat);
    star.position.copy(pos);
    let s: number = this._starScale.calc();
    star.scale.set(s, s, s);
    let c: THREE.Color = new THREE.Color();
    let r: number = Random.float(0, 1);
    if (r > 0.9) { c.r = 158 / 255; c.g = 231 / 255; c.b = 254 / 255; }//light blue
    else if (r > 0.4) { c.r = 254 / 255; c.g = 255 / 255; c.b = 240 / 255; }//yellow
    else if (r > 0.3) { c.r = 123 / 255; c.g = 165 / 255; c.b = 234 / 255; }
    else if (r > 0.2) { c.r = 48 / 255; c.g = 48 / 255; c.b = 235 / 255; }//blu
    else if (r > 0.1) { c.r = 234 / 255; c.g = 156 / 255; c.b = 250 / 255; }//pinkish
    else if (r >= 0.0) { c.r = 252 / 255; c.g = 203 / 255; c.b = 112 / 255; }//orangish
    (star.material as THREE.MeshBasicMaterial).color.set(c);
    return star;
  }

}
class AsyncMusic {
  public audio: THREE.Audio = null;
  public stopped: boolean = false;
  public constructor(a: THREE.Audio) {
    this.audio = a;
  }
  public stop() {
    if (this.audio && this.audio.source) {
      this.audio.stop();
    }
  }
  public play() {
    if (this.audio && this.audio.source) {
      this.audio.play();
    }
  }
}
/**
 * Manages Audio using the THREE WebAudio interface
 */
interface AfterLoadMusicCallback { (audio: THREE.Audio): void; }
class AudioManager {
  public _listener: THREE.AudioListener = new THREE.AudioListener();
  public _audioLoader: THREE.AudioLoader = new THREE.AudioLoader();
  private _bufferCache: Dictionary<THREE.AudioBuffer> = {};
  private _cache: Dictionary<Array<THREE.Audio>> = {};

  private _music: Dictionary<AsyncMusic> = {};

  public mainMusicFile: Files.Audio = Files.Audio.Electro_Sketch;
  public mainMusicFile1: Files.Audio = Files.Audio.Electro_Sketch;
  public mainMusicFile2: Files.Audio = Files.Audio.Digital_Bark;
  public mainMusicFile3: Files.Audio = Files.Audio.Inner_Sanctum;
  public bossMusicFile: Files.Audio = Files.Audio.Moskito;

  public constructor() {
    this._listener = new THREE.AudioListener();
    this._audioLoader = new THREE.AudioLoader();

    //Choose a random Kevin MacLeod music track
    let n: number = Random.float(0, 1);
    if (n > 0.6) this.mainMusicFile = this.mainMusicFile1;
    else if (n > 0.3) this.mainMusicFile = this.mainMusicFile2;
    else if (n > 0.0) this.mainMusicFile = this.mainMusicFile3;

    g_camera.add(this._listener);
  }

  /**
   *  Playing Lots of Sounds
   *  There are multiple ways to do this.  The slowest - you can reload the sound.  Second fastest is to share the loaded AudioBuffer, 
   *  however there is still a slight performance hit, but you get every sound.
   *  The last is to use one sound, and save it and share it.  There are some audio anomolies because you can't use the same buffer for many sounds, however this is by far the fastest method.
   *  To make it faster, we use both methods, grow the sound buffer as needed, and use sounds already loaded.
   * @param file
   * @param loop 
   * @param cache 
   */
  public play(file: Files.Audio, loop: boolean = false, cache: boolean = true) {
    let that = this;
    let szfile: string = './dat/audio/' + file;

    //Three, or WebAudio must be doing some background caching, so the cache here is actually not needed, and hinders audio performance.
    if (cache === false) {
      this.loadAndPlaySound(szfile, loop);
    }
    else {
      if (szfile in this._cache) {
        //If the loaded sound is already playing, create a new one.
        //This is actualy somewhat slow, but we will at least catch all sounds.
        //This means our buffer will organically expand to fill the audio need.
        let played: boolean = false;
        for (let ibuffer = 0; ibuffer < this._cache[szfile].length; ++ibuffer) {
          if (this._cache[szfile][ibuffer].isPlaying === false) {
            this._cache[szfile][ibuffer].setLoop(loop);
            this._cache[szfile][ibuffer].play();
            played = true;
            break;
          }
        }
        //however we don't want to grow uncontrolled, so cap at 16 sounds.
        if (!played && this._cache[szfile].length < 16) {
          let aud: THREE.Audio = new THREE.Audio(this._listener);
          aud.setBuffer(this._bufferCache[szfile]);
          aud.setLoop(loop);
          aud.setVolume(1);
          aud.play();
          this._cache[szfile].push(aud);
        }
      }
      else {
        this.loadAndPlaySound(szfile, loop);
      }
    }

  }
  private loadAndPlaySound(file: string, loop: boolean): void {
    let that = this;
    this._audioLoader.load(file, function (buffer: THREE.AudioBuffer) {
      that._bufferCache[file] = buffer;
      that._cache[file] = new Array<THREE.Audio>();
      that._cache[file].push(new THREE.Audio(that._listener));
      that._cache[file][0].setBuffer(buffer);
      that._cache[file][0].setLoop(loop);
      that._cache[file][0].setVolume(1);
      that._cache[file][0].play();

    }, function (xhr: any) {
      Globals.logDebug(" " + file + " loading " + xhr)
    }, function (err: any) {
      Globals.logError('Error loading  sound ' + file + " : " + err);
    });
  }
  public playMusic(file: Files.Audio) {
    let audio_root: string = './dat/audio/';
    let music_file = audio_root + file;

    if (file in this._music && this._music[file] && this._music[file].audio && this._music[file].audio.source) {
      this._music[file].stop();
      this._music[file].play();
    }
    else {
      let that = this;
      //Lost sound handle, reload.
      g_audio._audioLoader.load(music_file, function (buffer: THREE.AudioBuffer) {
        let ret: THREE.Audio = null;
        ret = new THREE.Audio(g_audio._listener);
        ret.setBuffer(buffer);
        ret.setLoop(true);
        ret.setVolume(1);
        ret.play();
        that._music[file] = new AsyncMusic(ret);
      }, function (xhr: any) {
        Globals.logDebug(" " + music_file + " loading " + xhr)
      }, function (err: any) {
        Globals.logError('Error loading  sound ' + music_file + " : " + err);
      });
    }
  }
  public stopMusic(file: Files.Audio) {
    if (file in this._music) {
      let audio: AsyncMusic = this._music[file];
      if (audio && audio.audio && audio.audio.source) {
        audio.stop();
      }
      else {
        this._music[file] = null;
      }
    }

  }
  private _lastMasterVolume: number = 0;
  public disableAudio() {
    this._lastMasterVolume = this._listener.getMasterVolume();
    this._listener.setMasterVolume(0);
  }
  public enableAudio() {
    this._listener.setMasterVolume(this._lastMasterVolume);
  }
}


interface ModelCallback { (model: THREE.Mesh): void; };
interface ModelObjectCallback { (object: PhysicsObject, model: THREE.Mesh): void; };
class ModelManager {

  private _cache: Dictionary<THREE.Object3D> = {};
  private _modelBaseDir: string = './dat/model/';

  private _callbacks: Dictionary<Array<ModelCallback>> = {}

  constructor() {
    this.loadModels();
  }
  public setModelAsyncCallback(model: Files.Model, callback: ModelCallback): void {
    let szfile = this._modelBaseDir + model;

    if (szfile in this._cache) {
      let m: THREE.Mesh = this._cache[szfile] as THREE.Mesh;
      callback(m);
    }
    else {
      if (!this._callbacks[szfile]) {
        this._callbacks[szfile] = new Array<any>();
      }
      this._callbacks[szfile].push(callback);
    }
  }

  private loadModels(): void {
    let that = this;
    try {

      this.loadModel(Files.Model.Player_Ship, ['MainObject', 'Player_Seat', 'Gun1', 'Gun2'], function (success: boolean, objs: any, gltf: any) {
        if (success) {
          let player_ship: THREE.Object3D = objs['MainObject'];
          player_ship.scale.set(.6, .6, .6);

          let player_pos = objs['Player_Seat'].position;
          g_userGroup.position.copy(player_pos);
          return player_ship;
        }
        return null;
      });

      this.loadShip(Files.Model.Boss);
      this.loadShip(Files.Model.Enemy_Ship);
      this.loadShip(Files.Model.Enemy_Ship2);
      this.loadShip(Files.Model.Enemy_Ship3);

      this.loadItem(Files.Model.Big_Bullet);
      this.loadItem(Files.Model.Bullet);
      this.loadItem(Files.Model.Bomb);
      this.loadItem(Files.Model.Bomb_Explosion, false);
      this.loadItem(Files.Model.Item, true, new Vector3(1, 1, 1));
    }
    catch (e) {
      Globals.logError("Failed to load one or more models: " + e);
    }
  }
  private loadItem(mod: Files.Model, flatShade: boolean = true, defaultscale: Vector3 = new Vector3(0.6, 0.6, 0.6)) {
    this.loadModel(mod, ['MainObject'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['MainObject'];
        a.scale.copy(defaultscale);
        let b = a as THREE.Mesh;
        if (b) {
          let m = b.material as THREE.Material;
          if (m) {
            m.flatShading = flatShade;
          }
        }
        return a;
      }
      return null;
    });
  }
  private loadShip(mod: Files.Model, szobjs: Array<string> = null, loaded: any = null): void {
    let arr2 = null;
    let arr = ['MainObject'];
    if (szobjs != null) {
      arr2 = szobjs;
      arr2.concat(arr);
    }
    else {
      arr2 = arr;
    }

    this.loadModel(mod, arr2, function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let ship: THREE.Object3D = objs['MainObject'];
        ship.scale.set(.6, .6, .6);

        if (loaded) {
          loaded(success, ship, objs, gltf);
        }
        return ship;
      }
      else {
        if (loaded) {
          loaded(success, null, objs, gltf);
        }
        return null;
      }
    });
  }
  private loadModel(filename: string, obj_names_in_scene: Array<string>, afterLoad: any) {
    Globals.logDebug('loading model "' + filename + '".')
    let that = this;
    let loader = new GLTFLoader_.GLTFLoader();
    let szfile = this._modelBaseDir + filename;
    loader.load(
      szfile,
      function (gltf: any) {
        let success: boolean = true;

        //Grab a list of named objects the user requested. (why? we could just traverse the graph)
        let arrobjs: any = [];
        for (let i = 0; i < obj_names_in_scene.length; i++) {
          let sz = obj_names_in_scene[i];

          let obj = gltf.scene.getObjectByName(sz);
          if (!obj) {
            Globals.logError("Could not find model " + sz);
            success = false;
          }
          else {
            arrobjs[sz] = obj;
          }
        }

        //Call the after load lambda
        let obj = afterLoad(success, arrobjs, gltf);
        if (obj == null) {
          Globals.logError("loaded model was null, model must be returned from closure");
        }
        else {
          that._cache[szfile] = obj;
        }

        //Invoke callbacks to set models async
        try {
          if (that._callbacks[szfile] != null) {
            let mesh = obj as THREE.Mesh; // Must cast to mesh
            for (let ci = that._callbacks[szfile].length - 1; ci >= 0; ci--) {
              if (that._callbacks[szfile][ci]) {
                that._callbacks[szfile][ci](mesh);
              }
              else {
                Globals.logError("Model Callback was undefined for " + szfile);
              }
            }
            that._callbacks[szfile] = null;
          }
        }
        catch (e) {
          Globals.logError("exception thrown executing model load callbacks: " + e);
        }
        Globals.logDebug('...loaded model "' + filename + '" -- success.');
      },
      function (xhr: any) {
        Globals.logInfo('model ' + (xhr.loaded / xhr.total * 100).toFixed(2) + '% loaded.');
      },
      function (error: any) {
        Globals.logInfo('Error loading "' + szfile + '" : ' + error);
      }
    );
  }

}
class IAFloat {
  public Min: number = 0;
  public Max: number = 1;
  public constructor(min: number, max: number) {
    this.Min = min;
    this.Max = max;
  }
  public calc(): number {
    return Random.float(this.Min, this.Max);
  }
}
class IAVec3 {
  public Min: Vector3 = new Vector3(0, 0, 0);
  public Max: Vector3 = new Vector3(1, 1, 1);
  public constructor(min: Vector3, max: Vector3) {
    this.Min = min;
    this.Max = max;
  }
  public calc(): Vector3 {
    let r: Vector3 = new Vector3();
    r.x = Random.float(this.Min.x, this.Max.x);
    r.y = Random.float(this.Min.y, this.Max.y);
    r.z = Random.float(this.Min.z, this.Max.z);
    return r;
  }
}
class ParticleParams {
  public Count: IAFloat = new IAFloat(10, 20);
  public Speed: IAFloat = new IAFloat(70, 70); //m/s
  public Position: Vector3 = new Vector3();
  public Scale_Delta: Vector3 = new Vector3(0, 0, 0);
  public InitialScale: IAVec3 = new IAVec3(new Vector3(1, 1, 1), new Vector3(1, 1, 1));
  public UniformScale: boolean = false;
  public Rotation_Delta: Vector3 = new Vector3(0, 0, 0);
  public Color: IAVec3 = new IAVec3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
  public Opacity: IAFloat = new IAFloat(0, 0);
}
class Particle extends PhysicsObject {
  public constructor(m: THREE.Mesh) {//file:Files.Model) {
    super();

    //A direct clone for particles is ok, no need for crazy material with duplicatemodel
    let b2 = m.clone();
    this.setModel(b2);

  }
}
class Particles {
  // private _particles: Array<Particle> = new Array<Particle>();
  private _mesh: THREE.Mesh = null;

  public constructor() {
    var geo = new THREE.BoxBufferGeometry(1, 1, 1);
    geo.computeBoundingBox(); // for hit area
    var mat = new THREE.MeshBasicMaterial({
      //map: this._texture,
      transparent: false,
      side: THREE.FrontSide,
      color: 0xFFFFFF,
    });
    geo.computeBoundingBox();

    this._mesh = new THREE.Mesh(geo, mat);
  }
  public create(params: ParticleParams) {
    let ct: number = params.Count.calc();
    for (let i = 0; i < ct; ++i) {
      let p = new Particle(this._mesh);
      p.Velocity = Random.randomNormal().multiplyScalar(params.Speed.calc());
      p.RotationDelta.copy(params.Rotation_Delta);
      p.ScaleDelta.copy(params.Scale_Delta);
      p.position.copy(params.Position);
      p.Color = Utils.vec3ToColor(params.Color.calc());
      let sv: Vector3 = params.InitialScale.calc();
      if (params.UniformScale) {
        sv.x = sv.y = sv.z;
      }
      p.scale.copy(sv);
      p.OpacityDelta = params.Opacity.calc();
    }
  }
  public createBossDieParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = new IAFloat(150, 200);
    params.Position.copy(pos);
    params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.InitialScale.Min.set(0.5, 0.5, 0.5);
    params.InitialScale.Max.set(4, 4, 4);
    params.Scale_Delta.x =
      params.Scale_Delta.y =
      params.Scale_Delta.z = Random.float(-0.3, -0.2);
    params.Speed.Max = 100;
    params.Speed.Min = 0.2;//Random.float(10, 100);
    params.Color.Min.set(0.1, 0.1, 0.2);
    params.Color.Max.set(0.3, 1, 1.0);
    params.Opacity.Max = params.Opacity.Min = -0.4;//(-0.1,-0.1);
    this.create(params);
  }
  public createShipDieParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = new IAFloat(20, 30);
    params.Position.copy(pos);
    params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = Random.float(-2, -0.3);
    params.Speed.Max = params.Speed.Min = Random.float(10, 100);
    params.Color.Min.set(0.7, 0.7, 0);
    params.Color.Max.set(1, 1, 0);
    this.create(params);
  }
  public createItemParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = new IAFloat(5, 10);
    params.Position.copy(pos);
    params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = Random.float(-2, -0.3);
    params.Speed.Max = params.Speed.Min = Random.float(10, 40);
    params.Color.Min.set(0.3, 0.3, 0.7);
    params.Color.Max.set(0.3, 0.3, 1);
    this.create(params);
  }
  public createShipHitParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = new IAFloat(3, 8);
    params.Position.copy(pos);
    params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = Random.float(-2, -0.3);
    params.Speed.Max = params.Speed.Min = Random.float(40, 100);
    params.Color.Min.set(0.6, 0, 0);
    params.Color.Max.set(1, 0, 0);
    params.InitialScale.Min.set(0.3, 0.3, 0.3);
    params.InitialScale.Min.set(0.6, 0.6, 0.6);
    this.create(params);
  }
  public createBlasterParticlels(pos: Vector3, color: Color) {
    let params: ParticleParams = new ParticleParams();
    params.Count = new IAFloat(2, 4);
    params.Position.copy(pos);
    params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = 0;// new Vector3(1,1,1);//Random.float(-2, -0.3);
    params.Speed.Max = params.Speed.Min = Random.float(4, 6);
    params.Color.Min.set(color.r, color.g, color.b);
    params.Color.Max.set(color.r, color.g, color.b);
    params.InitialScale.Min.set(0.01, 0.01, 0.01);
    params.InitialScale.Max.set(0.02, 0.02, 0.02);
    params.UniformScale = true;
    params.Opacity.Max = params.Opacity.Min = -0.1;//(-0.1,-0.1);
    this.create(params);
  }
}
//A small rotating model for the title screen.
class TitleModel extends PhysicsObject {
  private _target: Vector3 = new Vector3(0, 0, 0);

  public constructor() {
    super();
    let that = this;
    g_models.setModelAsyncCallback(Files.Model.Player_Ship, function (m: THREE.Mesh) {
      let m2: THREE.Mesh = m.clone();
      m2.scale.set(3, 3, 3);
      that.setModel(m2);
    });
    this.RotationDelta.y = Math.PI * 0.113;
  }
  public update(dt: number) {
    let cam_dir: Vector3 = new Vector3();
    g_camera.getWorldDirection(cam_dir);
    let right: Vector3 = g_camera.up.clone().cross(cam_dir);
    let up = cam_dir.clone().cross(right).normalize();

    //target pos
    let lookat: Vector3 = g_player.position.clone().add(cam_dir.multiplyScalar(10).sub(up).multiplyScalar(2));
    let target: Vector3 = lookat.clone().sub(this.position);

    //let smooth:Vector3 = Utils.cosineInterpolate()

    this.position.add(target.multiplyScalar(0.25));

    super.update(dt);
  }
}
//gamestatemanager class

enum GameState { Title, Play, GameOver }
let g_gameState: GameState = GameState.Title;

let g_gameTitle: string = $('#gametitle').html();

let g_prof: Prof = null;
let g_input: Input = null;
let g_pointlight: THREE.PointLight = null;
let g_pointlight2: THREE.PointLight = null;
let g_pointlight3: THREE.PointLight = null;
let g_ambientlight: THREE.AmbientLight = null;
let g_camera: THREE.PerspectiveCamera = null;

let g_physics: PhysicsManager = null;

let g_renderer: THREE.WebGLRenderer = null;
let gui: dat.GUI = null;

let axis: THREE.AxesHelper = null;
let g_userGroup: THREE.Group = null;
let g_shipTimer: Timer = null;
let g_player: PlayerShip = null;
let g_audio: AudioManager = null;
let g_models: ModelManager = null;
let g_screen: Screen = null;
let g_particles: Particles = null;
//let g_mainMusic: THREE.Audio = null;
//let g_bossMusic: THREE.Audio = null;
let g_bossTimer: Timer = null;
let g_starfield: Starfield = null;

let g_score: TextCanvas = null;
let g_stats: TextCanvas = null;
let g_titleHeader: TextCanvas = null;
let g_titleSub: TextCanvas = null;
let g_gameover: TextCanvas = null;
let g_allTextObjects: Array<TextCanvas> = new Array<TextCanvas>();
let g_isgameover: boolean = false;


// https://threejsfundamentals.org/threejs/lessons/threejs-custom-geometry.html
// https://threejsfundamentals.org/threejs/lessons/threejs-webvr.html
// https://fossies.org/linux/three.js/examples/webvr_rollercoaster.html
$(document).ready(function () {
  Globals.setFlags(document.location);
  window.addEventListener('resize', function () {
    //This should cause the resize method to fire.
    $("#page_canvas").width(window.innerWidth);
    $("#page_canvas").height(window.innerHeight);
  }, false);

  initGame();
  $('#outPopUp').hide();
  gameLoop();
});
function initGame(): void {
  g_prof = new Prof();
  g_prof.frameStart();

  //Recreates the renderer (user can toggle VR off)
  const canvas: HTMLCanvasElement = document.querySelector('#page_canvas');

  g_renderer = new THREE.WebGLRenderer({ canvas });//You can pass canvas in here
  g_renderer.setClearColor(0xffffff, 1);
  g_renderer.setPixelRatio(window.devicePixelRatio);
  if (Globals.VRSupported()) {
    //This has no effect
    //https://github.com/mrdoob/three.js/issues/13225
    g_renderer.setSize(1920, 1080); // Set to 10px as purely a test
  }
  else {
    g_renderer.setSize(window.innerWidth, window.innerHeight);
  }

  Globals.setRenderer(g_renderer);

  if (Globals.VRSupported()) {
    g_renderer.vr.enabled = true;
    document.body.appendChild(WEBVR.createButton(g_renderer, { referenceSpaceType: 'local' }));
  }
  else {
    document.body.appendChild(g_renderer.domElement);
  }

  g_screen = new Screen(canvas);

  g_physics = new PhysicsManager();

  g_input = new Input();


  createScene();
  createCamera();

  g_audio = new AudioManager();
  g_models = new ModelManager();
  g_particles = new Particles();

  //makeGui();

  if (Globals.isDebug()) {
    axis = new THREE.AxesHelper(1);
    g_physics.Scene.add(axis);
  }

  //loadMusic();

  createPlayer();

  showTitle();


  // startGame();

  g_starfield = new Starfield();

  g_prof.frameEnd();

}

function listenForGameStart() {
  if (g_input.right.A.pressed() || g_input.right.Trigger.pressed() || g_input.left.A.pressed() || g_input.left.Trigger.pressed()) {
    startGame();
  }
}
function createPlayer() {

  g_player = new PlayerShip();
  g_player.add(g_userGroup);
  g_player.up = new Vector3(0, 1, 0);
  g_player.position.set(0, 0, 10);
  g_player.Velocity.set(0, 0, -10);
  g_player.DestroyCheck = function (ob: PhysicsObject): boolean { return false; /*do not destroy player */ }
  g_player.rotateY(0);

  createUIText(g_player);
}
function showTitle() {
  g_titleHeader.visible = true;
  g_titleSub.visible = true;

  g_models.setModelAsyncCallback(Files.Model.Player_Ship, function (m: THREE.Mesh) {
    g_player.hideModel();
  });
  let titleModel: TitleModel = new TitleModel();
}
function startGame() {
  g_gameState = GameState.Play;

  //Destroy the title model.
  g_physics.destroyAllObjects(function (ob: PhysicsObject) { return ob instanceof TitleModel; });
  g_player.showModel();

  g_bossTimer = new Timer(60 * 1000, function () {
    enterBoss();
  });

  g_stats.visible = true;
  g_gameover.visible = false;
  g_titleSub.visible = false;
  g_titleHeader.visible = false;

  if (isBossMode()) {
    exitBoss();
  }
  g_audio.stopMusic(g_audio.bossMusicFile);
  g_audio.stopMusic(g_audio.mainMusicFile);

  g_audio.playMusic(g_audio.mainMusicFile);

  g_shipTimer = new Timer(3000, function () {
    createEnemies();
  });
  g_isgameover = false;
}
function stopGame() {
  g_gameState = GameState.GameOver;
  g_player.model.visible = false;
  g_isgameover = true;
  g_gameover.visible = true;
  g_stats.visible = false;
  g_audio.play(Files.Audio.GameOver);
  g_audio.stopMusic(g_audio.mainMusicFile);
  g_audio.stopMusic(g_audio.bossMusicFile);
  g_bossTimer.stop();
}
function isBossMode() {
  return g_physics.findObjectOfType(function (ob: PhysicsObject) { return ob instanceof Boss; });
}
function enterBoss() {
  g_bossTimer.stop();
  g_shipTimer.stop();

  g_physics.destroyAllObjects(function (ob: PhysicsObject) { return ob instanceof EnemyShip; });

  g_audio.stopMusic(g_audio.mainMusicFile);
  g_audio.playMusic(g_audio.bossMusicFile);

  let b: Boss = new Boss();
  b.position.copy(g_player.position.clone().add(new Vector3(0, 0, -140)));
  //Move the boss backwards so it slowly inches towards the player.
  b.Velocity.set(0, 0, g_player.Velocity.z + 0.05);
}
function exitBoss() {
  //Add 1 minute to the boss appearing.
  g_bossTimer.Interval += 60 * 1000;
  g_bossTimer.start();
  g_shipTimer.start();

  g_audio.stopMusic(g_audio.bossMusicFile);
  g_audio.playMusic(g_audio.mainMusicFile);
}
class ShipProb {
  public prob = 0;
  public speed_base: number = 0;
  public speed: IAFloat = new IAFloat(0, 1);
  public scale: Vector3 = new Vector3(1, 1, 1);
  public droprate: number = 0;
  public rotation_delta: IAVec3 = new IAVec3(new Vector3(0, 0, 0), new Vector3(0, 0, 0));
  public firetime: IAFloat = new IAFloat(3000, 5000);
  public health: number = 10;
  public points: number = 0;
}
function createEnemies() {
  let nShips = 1;

  for (let i = 0; i < nShips; ++i) {
    let ships: Dictionary<ShipProb> = {};

    ships[Files.Model.Enemy_Ship] = { prob: 0.4, points: 2, health: 80, speed_base: 13, speed: new IAFloat(0, 10), scale: new Vector3(3, 3.3, 3), droprate: 20, rotation_delta: new IAVec3(new Vector3(0, 0, 0), new Vector3(0, 0, 0)), firetime: new IAFloat(3000, 5000) };//{prob:0.4};
    ships[Files.Model.Enemy_Ship2] = { prob: 0.6, points: 4, health: 350, speed_base: 5, speed: new IAFloat(0, 3), scale: new Vector3(1, 1, 1), droprate: 80, rotation_delta: new IAVec3(new Vector3(0, 0, 0), new Vector3(0, 0, 0)), firetime: new IAFloat(5000, 9000) };
    ships[Files.Model.Enemy_Ship3] = { prob: 1.0, points: 3, health: 50, speed_base: 20, speed: new IAFloat(0, 10), scale: new Vector3(1, 1, 1), droprate: 30, rotation_delta: new IAVec3(new Vector3(0, 0, Math.PI * 0.2), new Vector3(0, 0, Math.PI * 1.3)), firetime: new IAFloat(1000, 5000) };

    let f: number = Random.float(0, 1);
    let file: Files.Model = Files.Model.Enemy_Ship;
    let prob_struct: ShipProb = ships[Files.Model.Enemy_Ship];
    for (let i = 0; i < Object.keys(ships).length; i++) {
      let key = Object.keys(ships)[i];

      if (ships[key].prob >= f) {
        file = key as Files.Model;
        prob_struct = ships[key];
        break;
      }
    }

    try {
      let ship: EnemyShip = new EnemyShip(file, prob_struct.health, 1, prob_struct.droprate, prob_struct.firetime.calc(), prob_struct.points);
      ship.position.copy(g_player.position.clone().add(new Vector3(Random.float(-50, 50), Random.float(-13, 23), -200)));
      ship.Velocity.set(0, 0, prob_struct.speed_base + prob_struct.speed.calc());
      // ship.RotationDelta.set(0, 0, Random.float(0, 1) > 0.7 ? Random.float(-3, 3) : 0);
      ship.scale.copy(prob_struct.scale);
      ship.RotationDelta.copy(prob_struct.rotation_delta.calc());
    }
    catch (e) {

    }
  }
}
function createCamera() {
  const canvas: HTMLCanvasElement = document.querySelector('#page_canvas');
  g_camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

  //https://stackoverflow.com/questions/49471653/in-three-js-while-using-webvr-how-do-i-move-the-camera-position
  //In VR we actually add the camera to a group since user actually moves the camera(s) reltaive to origin
  g_userGroup = new THREE.Group()
  g_userGroup.add(g_camera);
  g_userGroup.position.set(0, 0.02, -0.12);
  g_userGroup.rotateY(0);
}
function vrDeviceIsPresenting(): boolean {
  //You can't resize if the vr device is presenting.
  return g_renderer.vr && g_renderer.vr.getDevice() && g_renderer.vr.getDevice().isPresenting;
}

class ProfFrame {
  private _start_time: number = 0;
  private _end_time: number = 0;
  private _profs: Dictionary<number> = {};
  get start_time(): number { return this._start_time; }
  get end_time(): number { return this._end_time; }
  get profs(): Dictionary<number> { return this._profs; }

  public frameStart() {
    this._start_time = Globals.getTimeMillis();
  }
  public begin(z: string): void {
    let n = Globals.getTimeMillis();
    this._profs[z] = n;
  }
  public end(z: string): void {
    let n = Globals.getTimeMillis();
    this._profs[z] = n - this._profs[z];
  }
  public frameEnd() {
    this._end_time = Globals.getTimeMillis();
  }
}
/**
 * A quick n dirty profiling API.  I was having some trouble with google, and this project is almost due.
 */
class Prof {
  private _frames: Array<ProfFrame> = new Array<ProfFrame>();
  private _frame: ProfFrame = null;

  private _iLastDumpedFrame = 0;
  private _lastDump: number = 0;
  public DumpRateInSeconds: number = 5;
  public DumpCount: number = 100;
  public TimeSliceInSeconds: number = 1; //  frame profiles are averaged over fixed slices

  public constructor() {
    this._lastDump = Globals.getTimeMillis();
  }
  public begin(z: string): void {
    if (Globals.isProf()) {
      this._frame.begin(z);
    }
  }
  public end(z: string): void {
    if (Globals.isProf()) {
      this._frame.end(z);
    }
  }
  public frameStart() {
    if (Globals.isProf()) {
      this._frame = new ProfFrame();
      this._frame.frameStart();
    }
  }
  public frameEnd() {
    if (Globals.isProf()) {
      this._frame.frameEnd();
      this._frames.push(this._frame);
      this._frame = null;
      let n = (Globals.getTimeMillis() - this._lastDump);
      if (n >= (this.DumpRateInSeconds * 1000)) {
        this.dumpCulprits();
        this._lastDump = Globals.getTimeMillis();

        //**Reset the frames to prevent big memory
        this._frames = new Array<ProfFrame>();
      }
    }
  }
  private dumpCulprits() {
    //Dump frame slice.
    //This is an average of the function times over the range of x seconds.
    let averages: Dictionary<number> = {};
    let nFrames: number = 0;

    if (this._frames) {
      //Ugh, this is such bad programming.  Use a binary tree at least.. c'mon.
      //Well.. this facebook thing is due in 2 days and I'm rushing.
      for (let ifr = 0; ifr < this._frames.length; ifr++) {
        let fr: ProfFrame = this._frames[ifr];
        if (fr.profs) {
          if (fr.start_time >= this._lastDump) {
            for (let key in fr.profs) {
              //todo - if(key in averages)
              if (!(key in averages)) {
                averages[key] = 0;
              }
              averages[key] += fr.profs[key];
            }
          }
          nFrames++;
          this._iLastDumpedFrame++;
        }
      }

      for (let key in averages) {
        averages[key] /= nFrames;
      }

      let output: string = "Slowest perfs in " + nFrames +
        " frames over " + this.DumpRateInSeconds + " seconds:";
      let keys: Array<string> = Utils.getSortedKeys(averages);
      for (let iavg = 1; iavg <= (this.DumpCount > keys.length ? keys.length : this.DumpCount); iavg++) {
        let key = keys[keys.length - iavg];
        let val = averages[key];
        output += "  " + key + ":" + val.toFixed(1) + "ms";
      }

      Globals.logInfo(output);
    }

  }
}
function gameLoop() {
  let last_time: number = 0;
  let delta: number = 0;

  var render = function (time: number) {
    g_prof.frameStart();
    {
      time *= 0.001;//convert to seconds I think
      delta = time - last_time;
      last_time = time;

      if (vrDeviceIsPresenting() == false) {
        if (resizeRendererToDisplaySize(g_renderer)) {
          const canvas = g_renderer.domElement;
          g_camera.aspect = canvas.clientWidth / canvas.clientHeight;
          g_camera.updateProjectionMatrix();
        }
      }

      if (g_gameState === GameState.Title) {
        listenForGameStart();
      }

      g_prof.begin("globals");
      Globals.updateGlobals(g_camera, g_userGroup);
      g_prof.end("globals");

      g_prof.begin("input");
      g_input.update(delta);
      g_prof.end("input");

      g_prof.begin("input");
      updateUI();
      g_prof.end("input");

      //
      if (g_shipTimer) {
        g_shipTimer.update(delta);
      }
      if (g_physics) {
        g_prof.begin("physics");
        g_physics.update(delta);
        g_prof.end("physics");

      }
      if (axis) {
        axis.position.set(g_player.position.x - 3, g_player.position.y - 3, g_player.position.z - 10);
      }

      //Lights
      if (g_pointlight) {
        g_pointlight.position.copy(g_player.position.clone().add(new Vector3(-500, 100, -500)));
      }
      if (g_pointlight2) {
        g_pointlight2.position.copy(g_player.position.clone().add(new Vector3(500, 100, -500)));
      }
      if (g_pointlight3) {
        g_pointlight2.position.copy(g_player.position.clone().add(new Vector3(0, 1, -2)));
      }

      if (g_bossTimer) {
        g_bossTimer.update(delta);
      }

      //Starfield
      if (g_starfield) {
        g_prof.begin("starfield");
        g_starfield.update(delta);
        g_prof.end("starfield");
      }
      g_prof.begin("render");
      g_renderer.render(g_physics.Scene, g_camera);
      g_prof.end("render");
    }
    g_prof.frameEnd();

  };
  g_renderer.setAnimationLoop(render);
}
function updateUI() {
  if (g_score && g_score.visible) {
    g_score.Text = "Score: " + g_player.score;
  }
  if (g_gameover && g_gameover.visible) {
    g_gameover.Text = "Game Over"
  }
  if (g_stats && g_stats.visible) {
    g_stats.Text = "Bombs: " + g_player.bombs + "/" + g_player.maxbombs + "\n "
      + "Health: " + g_player.health + "/" + g_player.maxhealth + "\n "
      + "Level: " + g_player.ShipLevel;
    if (Globals.isDebug()) {
      g_stats.Text += "\n " + "Objects: " + g_physics.Objects.length + "\n " +
        "\n " + "Stars: " + g_starfield.Stars.length + "\n ";
    }
  }
  for (let itext = 0; itext < g_allTextObjects.length; ++itext) {
    g_allTextObjects[itext].update(g_camera, g_userGroup);
  }

}
function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = canvas.clientWidth * pixelRatio | 0;
  const height = canvas.clientHeight * pixelRatio | 0;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function createScene() {
  let szGrid = 'dat/img/grd.png';
  let szStar = 'dat/img/starfield_0.png';
  let szStar2 = 'dat/img/starfield_1.png';
  let szStar3 = 'dat/img/starfield_2.png';
  let szBlack = 'dat/img/black.png';

  let bk = szStar2;

  g_physics.Scene = new THREE.Scene();
  {
    const loader: THREE.CubeTextureLoader = new THREE.CubeTextureLoader();
    const texture: THREE.CubeTexture = loader.load([
      bk, bk, bk, bk, bk, bk,
    ]);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    g_physics.Scene.background = texture;
  }

  g_ambientlight = new THREE.AmbientLight(0x404040);
  g_physics.Scene.add(g_ambientlight);

  g_pointlight = new THREE.PointLight(0xffff99, 1, 2000);
  g_physics.Scene.add(g_pointlight);
  g_pointlight2 = new THREE.PointLight(0xffff99, 1, 2000);
  g_physics.Scene.add(g_pointlight2);
  g_pointlight3 = new THREE.PointLight(0xffffff, 0.4, 100);
  g_physics.Scene.add(g_pointlight3);
}
function createUIText(player: PlayerShip): void {
  g_allTextObjects = new Array<TextCanvas>();


  //Create Console
  Globals.setConsole3D(g_physics.Scene, player);

  //Test Score
  let opts: TextCanvasOptions;

  opts = new TextCanvasOptions();
  opts.Lineheight = opts.Fontsize = Globals.userIsInVR() ? 300 : 100;
  opts.Text = "Score: 0";
  opts.Width = Globals.userIsInVR() ? 0.3 : 0.1;
  opts.Height = 0.1;
  opts.AutoHeight = false;
  g_score = new TextCanvas(opts);
  g_score.showWireframe(Globals.isDebug());
  g_score.AlignToScreen = true;
  g_score.ScreenX = 0.0;
  g_score.ScreenY = 0.9;
  g_score.ScreenZ = 3;
  player.add(g_score);
  g_allTextObjects.push(g_score);
  g_score.visible = false;

  opts = new TextCanvasOptions();
  opts.Lineheight = opts.Fontsize = Globals.userIsInVR() ? 300 : 100;
  opts.Width = Globals.userIsInVR() ? 0.3 : 0.1;
  opts.Height = 0.1;
  opts.AutoHeight = false;
  opts.Text = "Bombs: " + player.bombs;
  g_stats = new TextCanvas(opts);
  g_stats.showWireframe(Globals.isDebug());
  g_stats.AlignToScreen = true;
  g_stats.ScreenX = 0.7;
  g_stats.ScreenY = 0.9;
  g_stats.ScreenZ = 3;
  player.add(g_stats);
  g_allTextObjects.push(g_stats);
  g_stats.visible = false;

  opts = new TextCanvasOptions();
  opts.Fontsize = opts.Lineheight = 100;
  opts.Width = Globals.userIsInVR() ? 0.4 : 0.4;
  opts.Height = 0.3;
  opts.AutoHeight = false;
  opts.Text = "Game Over!";
  g_gameover = new TextCanvas(opts);
  g_gameover.showWireframe(Globals.isDebug());
  g_gameover.AlignToScreen = true;
  g_gameover.ScreenX = -0.1;
  g_gameover.ScreenY = 0.1;
  g_gameover.ScreenZ = 8;
  player.add(g_gameover);
  g_allTextObjects.push(g_gameover);
  g_gameover.visible = false;

  opts = new TextCanvasOptions();
  opts.Fontsize = opts.Lineheight = 80;
  opts.Width = Globals.userIsInVR() ? 0.5 : 0.5;
  opts.Height = 0.4;
  opts.AutoHeight = false;
  opts.Text = g_gameTitle;
  g_titleHeader = new TextCanvas(opts);
  g_titleHeader.showWireframe(Globals.isDebug());
  g_titleHeader.AlignToScreen = true;
  g_titleHeader.ScreenX = 0.3;
  g_titleHeader.ScreenY = 0.1;
  g_titleHeader.ScreenZ = 8;
  player.add(g_titleHeader);
  g_allTextObjects.push(g_titleHeader);
  g_titleHeader.visible = false;

  let bvr: boolean = Globals.userIsInVR();

  opts = new TextCanvasOptions();
  opts.Fontsize = opts.Lineheight = bvr ? 60 : 40;
  opts.Width = bvr ? 0.8 : 0.8;
  opts.Height = 0.4;
  opts.AutoHeight = false;
  let szvr: string =
    "      " + g_gameTitle + "\n. " +
    "Destroy the Enemy Space Fleet!\n " +
    "VR Controls:\n " +
    "  Left and Right triggers fire lasers.\n " +
    "  'A' button fires a bomb.\n " +
    "  The left joystick moves your spaceship.\n " +
    "\n " +
    "Press A to play.\n "
    ;
  opts.Text = Globals.userIsInVR() ? szvr : "Click to play.";
  g_titleSub = new TextCanvas(opts);
  g_titleSub.showWireframe(Globals.isDebug());
  g_titleSub.AlignToScreen = true;
  g_titleSub.ScreenX = 0.5;
  g_titleSub.ScreenY = bvr ? 0.5 : 0.6;
  g_titleSub.ScreenZ = 8;
  player.add(g_titleSub);
  g_allTextObjects.push(g_titleSub);
  g_titleSub.visible = false;

  //Globals.logInfo("hi1\nasdf\nhi2\n")
}

