import * as $ from "jquery";
import * as THREE from 'three';
import * as Physijs from 'physijs-webpack';
import { Vector3, Vector2, Vector4, ShapeUtils, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3 } from 'three';

import { WEBVR } from 'three/examples/jsm/vr/WebVR.js';
import * as GLTFLoader_ from 'three/examples/jsm/loaders/GLTFLoader';
import * as dat from 'dat.gui';
import * as OrbitControls from 'three-orbitcontrols';

import { VRInputManager, VRGamepad, VRButton } from './gamepad';
import { TextCanvas, TextCanvasOptions } from './TextCanvas';
import * as Globals from './globals';
//import * as Mersenne from 'mersenne-twister';//https://github.com/boo1ean/mersenne-twister


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
    Electro_Sketch = 'electro_sketch.ogg',
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
  }
}
//https://stackoverflow.com/questions/38213926/interface-for-associative-object-array-in-typescript
interface Dictionary<T> {
  [key: string]: T;
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
    const canvas = renderer.domElement;
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

  constructor() {
    this._buttons.push(this.w);
    this._buttons.push(this.s);
    this._buttons.push(this.a);
    this._buttons.push(this.d);
    let that = this;
    window.addEventListener("keydown", function (e) {
      //w
      if (e.keyCode === 87) { that.w.update(true); }
      //s
      if (e.keyCode === 83) { that.s.update(true); }
      //a
      if (e.keyCode === 65) { that.a.update(true); }
      //d
      if (e.keyCode === 68) { that.d.update(true); }
    });
    window.addEventListener("keyup", function (e) {
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

    //Pointler lock doesn't work.  
    //Browsers are practically useless for first person games.
    //
    //let g : any = g_screen.canvas as any;
    // g.requestPointerLock = g_screen.canvas.requestPointerLock;// || g_screen.canvas.mozRequestPointerLock || g_screen.canvas.webkitRequestPointerLock;
    // if(g_screen.canvas.requestPointerLock){
    //   g_screen.canvas.requestPointerLock();
    // }

    setInterval(function () {
      that.Left.update(that._lmbDown);
      that.Right.update(that._rmbDown);
    });
    document.addEventListener('mouseup', function (e) {
      e.preventDefault();
      if (e.button == 0) {
        that._lmbDown = false;
      }
      else if (e.button == 1) {
        //middle
      }
      else if (e.button == 2) {
        that._rmbDown = false;
      }
    });
    document.addEventListener('mousedown', function (e) {
      e.preventDefault();
      if (e.button == 0) {
        that._lmbDown = true;
      }
      else if (e.button == 1) {
        //middle
      }
      else if (e.button == 2) {
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

      let project_dist: number = 10;//This is how far into the world we project mouse from screen
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
      // let f : Frustum = new Frustum(new Vector3(0,0,-1), player.position);
      //let v3 : Vector3 = f.projectScreen(v2.x,v2.y);

      camera.lookAt(new Vector3(vxy3.x, vxy3.y, vxy3.z));


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
/**
 * @class Input
 * @brief Manages both VR and Desktop input devices 
 *  TODO: tablet + phone input.
 */
class Input {
  private _keyboard: Keyboard = null;
  private _vr: VRInputManager = null;
  private _mouse: Mouse = null;
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
          g_player.add(g);
          Globals.logInfo("added controller.");

          g.MoveController = function () {
            let p: Vector3 = g.position.clone();
            if (g.getHandedness() == "left") {
              //player.aimLeft(p);

            }
            else if (g.getHandedness() == "right") {
              // player.aimRight(p);

            }
          }
          g.ButtonPress = function (b: VRButton) {
            //player.fireBullet();
          }
          g.Joystick = function () {
          }
        }
      }
      let removeController: any = function (g: VRGamepad) {
        Globals.logInfo("Removed controller.");
        if (g.parent == g_physics.Scene) {
          g_physics.Scene.remove(g);
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
    return this.project(screen_x, screen_y, camera.near);
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
      camera.getWorldDirection(cam_dir);
    }
    if (cam_pos == null) {
      cam_pos = new Vector3();
      g_player.getWorldPosition(cam_pos);
    }

    let nearCenter: Vector3 = cam_pos.clone().add(cam_dir.clone().multiplyScalar(camera.near));
    let farCenter: Vector3 = cam_pos.clone().add(cam_dir.clone().multiplyScalar(camera.far));
    let ar = g_screen.elementHeight / g_screen.elementWidth;
    let tan_fov_2 = Math.tan(THREE.Math.degToRad(camera.getEffectiveFOV()) / 2.0);
    let rightVec = camera.up.clone().cross(cam_dir);

    let w_far_2 = tan_fov_2 * camera.far;
    let h_far_2 = w_far_2 * ar;
    let cup_far = camera.up.clone().multiplyScalar(h_far_2);
    let crt_far = rightVec.clone().multiplyScalar(w_far_2);
    this._ftl = farCenter.clone().add(cup_far).sub(crt_far);
    this._ftr = farCenter.clone().add(cup_far).add(crt_far);
    this._fbl = farCenter.clone().sub(cup_far).sub(crt_far);

    let w_near_2 = tan_fov_2 * camera.near;
    let h_near_2 = w_near_2 * ar;
    let cup_near = camera.up.clone().multiplyScalar(h_near_2);
    let crt_near = rightVec.clone().multiplyScalar(w_near_2);
    this._ntl = nearCenter.clone().add(cup_near).sub(crt_near);
    this._ntr = nearCenter.clone().add(cup_near).add(crt_near);
    this._nbl = nearCenter.clone().sub(cup_near).sub(crt_near);
  }
}
enum TimerState { Stopped, Running }
class Timer {
  public Func: any = null;
  public Interval: number = 10; //milliseconds
  private _t: number = 0; //milliseocnds
  private _state: TimerState = TimerState.Stopped;
  public constructor(interval: number, func: any) {
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
class PhysicsManager {
  private _objects: Array<PhysicsObject> = new Array<PhysicsObject>();
  private _collide: Array<PhysicsObject> = new Array<PhysicsObject>();

  public get Objects(): Array<PhysicsObject> { return this._objects; }
  private toDestroy: Array<PhysicsObject> = new Array<PhysicsObject>();

  public Scene: THREE.Scene = null; //= new THREE.Scene();

  public addOrRemoveCollider(ob: PhysicsObject) {
    if (ob.Collide != null) {
      for (let i = this._collide.length - 1; i >= 0; --i) {
        if (this._collide[i] == ob) {
          Globals.logError("Tried to add duplicate collider.");
          return;
        }
      }
      this._collide.push(ob);
    }
    else {
      this.removeCollider(ob);
    }
  }
  public add(obj: PhysicsObject) {
    for (let i = this._objects.length - 1; i >= 0; --i) {
      if (this._objects[i] == obj) {
        Globals.logError("Tried to add duplicate phy obj.");
        return;
      }
    }
    this._objects.push(obj);
    if (obj.Collide) {
      this._objects.push(obj);
    }
    this.Scene.add(obj);
  }
  public destroy(obj: PhysicsObject) {
    this.Scene.remove(obj);
    this.toDestroy.push(obj);
    obj.IsDestroyed = true;
  }
  private removeCollider(ob: PhysicsObject) {
    if (ob.Collide) {
      for (let j = this._collide.length - 1; j >= 0; --j) {
        if (this._collide[j] == ob) {
          this._collide.splice(j, 1);//delete
        }
      }
    }
  }
  public update(dt: number): void {
    //Preliminary destroy . distance
    for (let i = this._objects.length - 1; i >= 0; --i) {
      let ob = this._objects[i];

      if (ob.Destroy()) {
        //Objects must have a destroy function defined.
        this.destroy(ob);
      }
      else {
        ob.update(dt);
      }
    }

    //Collide with others
    for (let i = this._collide.length - 1; i >= 0; --i) {
      for (let j = this._collide.length - 1; j >= 0; --j) {
        if (j != i) {
          let a = this._collide[i];
          let b = this._collide[j];
          if (a.IsDestroyed == false && b.IsDestroyed == false) {
            if (a.Box.intersectsBox(b.Box)) {
              if (a.Collide) {
                a.Collide(b);
              }
              if (b.Collide) {
                b.Collide(a);
              }
            }
          }
        }
      }
    }

    //Remove destroyed.
    for (let i = this.toDestroy.length - 1; i >= 0; --i) {
      let ob = this.toDestroy[i];
      if (ob.IsDestroyed) {

        for (let j = this._objects.length - 1; j >= 0; --j) {
          if (this._objects[j] == ob) {
            this._objects.splice(j, 1);//delete
          }
        }
        this.removeCollider(ob);

      }
    }
    this.toDestroy = new Array<PhysicsObject>();

  }
}
class PhysicsObject extends THREE.Object3D {
  // protected _bbox = new THREE.Box3();
  private _velocity: Vector3 = new Vector3();
  private _isDestroyed: boolean = false;
  private _rotation: Vector3 = new Vector3();
  private _scale: Vector3 = new Vector3();
  protected _model: THREE.Object3D = null;
  private _boxHelper: THREE.BoxHelper = null;
  get model(): THREE.Object3D { return this._model; }

  private _destroy: any = function () {
    //Destroy if we are too far awawy from the player.
    let ca: boolean = Math.abs(this.WorldPosition.z - g_player.WorldPosition.z) > 500;//.distanceToSquared(player.WorldPosition) >= (camera.far * camera.far);
    //Destroy if we are behind the player (we only move forward in the z)
    let cb: boolean = this.position.z - g_player.position.z > 10;
    //Destroy if our scale is zero
    let cc: boolean = (this.scale.x < 0.0001) && (this.scale.y < 0.0001) && (this.scale.z < 0.0001);
    return ca || cb || cc;
  }
  get Destroy(): any { return this._destroy; }
  set Destroy(v: any) { this._destroy = v; }

  //Setting Collide will add or remove the object from the game's collider list
  //If collide is null, the object doesn't collide with anything.  This is for performance reasons.  Don't set Collide if the object doesn't collide (for example is a collidee)
  private _collide: any = null;
  get Collide(): any { return this._collide; }
  set Collide(f: any) {
    this._collide = f;
    g_physics.addOrRemoveCollider(this);
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
  set Color(val: Vector3) {
    if (this._model !== null) {
      let mod: THREE.Mesh = this._model as THREE.Mesh;
      if (mod) {
        if (mod.material) {
          let mat: THREE.MeshBasicMaterial = mod.material as THREE.MeshBasicMaterial;
          if (mat) {
            mat.color.setRGB(val.x, val.y, val.z);
          }
        }
      }
    }
  }
  public constructor() {
    super();
    g_physics.add(this);
  }
  public destroy() {
    g_physics.destroy(this);
  }
  public update(dt: number) {
    this.position.add(this.Velocity.clone().multiplyScalar(dt));
    let rdt = this.RotationDelta.clone().multiplyScalar(dt);
    this.rotation.x = (this.rotation.x + rdt.x) % Math.PI;
    this.rotation.y = (this.rotation.y + rdt.y) % Math.PI;
    this.rotation.z = (this.rotation.z + rdt.z) % Math.PI;
    this.scale.x += this._scale.x * dt;
    if (this.scale.x < 0) { this.scale.x = 0; }
    this.scale.y += this._scale.y * dt;
    if (this.scale.y < 0) { this.scale.y = 0; }
    this.scale.z += this._scale.z * dt;
    if (this.scale.z < 0) { this.scale.z = 0; }

    // if (this._bbox) {
    //   this._bbox.translate(this.position);
    // }
  }
  public get WorldPosition(): Vector3 {
    let v = new Vector3();
    this.getWorldPosition(v);
    return v;
  }
  public setModel(m: THREE.Object3D) {
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
      this.add(this._model);

      if (Globals.isDebug()) {
        this._boxHelper = new THREE.BoxHelper(this._model, new THREE.Color(0xffff00));
        this.add(this._boxHelper);
      }
    }
  }
}
//Ship class representing both player and enemy ship.
enum Direction { Left, Right, None }
class Ship extends PhysicsObject {
  protected _health: number = 100;
  protected _maxhealth: number = 100;
  get health(): number { return this._health; }
  get maxhealth(): number { return this._maxhealth; }
  set health(v: number) { this._health = v }
  //set maxhealth(v:number) { this._maxhealth=v }
  private _movedLeft: boolean = false;
  private _movedRight: boolean = false;
  private _movedUp: boolean = false;
  private _movedDown: boolean = false;
  private _pitch: number = 0;
  private _pitchspd: number = Math.PI * 0.25;
  private _maxpitch: number = Math.PI * 0.15;

  private _strafeSpeed: number = 12;
  private _liftSpeed: number = 12;

  private _roll: number = 0;
  private _rollspd: number = Math.PI * 0.25;
  private _maxroll: number = Math.PI * 0.25;

  private _barrelRollDirection: Direction = Direction.None;
  private _barrelRollSpeed: number = Math.PI * 3.8;
  private _barrelRollMax: number = Math.PI * 4;

  private _lastLeftPressTime: number = 0;
  private _lastRightPressTime: number = 0;
  private _lastUpPress: number = 0;
  private _lastDownPress: number = 0;
  private _rollPress: number = 0;
  private _pitchPress: number = 0;
  private _rollRelease: number = 0;
  private _pitchRelease: number = 0;

  public constructor() {
    super();
  }

  public moveLeft(dt: number) {
    this.position.x -= this._strafeSpeed * dt;
    // if (g_input.keyboard.a.pressed()) {
    //   this.checkBarrelRoll(this._lastLeftPressTime, Direction.Right);
    //   this._rollPress = this._roll;
    //   this._lastLeftPressTime = Globals.getTimeMillis();
    // }
    this._movedLeft = true;
  }
  public moveRight(dt: number) {
    this.position.x += this._strafeSpeed * dt;
    // if (g_input.keyboard.d.pressed()) {
    //   this.checkBarrelRoll(this._lastRightPressTime, Direction.Right);
    //   this._rollPress = this._roll;
    //   this._lastRightPressTime = Globals.getTimeMillis();
    // }
    this._movedRight = true;
  }
  public moveUp(dt: number) {
    this.position.y += this._liftSpeed * dt;
    // if (g_input.keyboard.w.pressed()) {
    //   this._pitchPress = this._pitch;
    //   this._lastUpPress = Globals.getTimeMillis();
    // }
    this._movedUp = true;
  }
  public moveDown(dt: number) {
    this.position.y -= this._liftSpeed * dt;
    // if (g_input.keyboard.s.pressed()) {
    //   this._pitchPress = this._pitch;
    //   this._lastDownPress = Globals.getTimeMillis();
    // }
    this._movedDown = true;
  }
  private checkBarrelRoll(lastPress: number, direction: Direction) {
    let barrelRollTime: number = 300;//ms
    if ((Globals.getTimeMillis() - lastPress) <= barrelRollTime) {
      this._barrelRollDirection = direction;
    }
  }
  private cosineInterpolate(y1: number, y2: number, mu: number) {
    //http://paulbourke.net/miscellaneous/interpolation/
    let mu2: number = 0;
    mu2 = (1 - Math.cos(mu * Math.PI)) * 0.5;
    return (y1 * (1 - mu2) + y2 * mu2);
  }
  private interp_bank(roll_or_pitch: { ref: number }, startPress: number, startRelease: number, add: number, maxval: number, sign: number): number {
    if (sign == 1) {
      roll_or_pitch.ref = Math.min(roll_or_pitch.ref + add, maxval);
      return this.cosineInterpolate(startPress, maxval, roll_or_pitch.ref);
    }
    else if (sign == -1) {
      roll_or_pitch.ref = Math.max(roll_or_pitch.ref - add, maxval);
      return this.cosineInterpolate(startPress, -maxval, roll_or_pitch.ref);
    }
    else if (sign === 0) {
      //Move Back to 0
      if (roll_or_pitch.ref < 0) {
        roll_or_pitch.ref = Math.min(roll_or_pitch.ref + add, 0);
        return this.cosineInterpolate(startRelease, 0, roll_or_pitch.ref);
      }
      else if (roll_or_pitch.ref > 0) {
        roll_or_pitch.ref = Math.max(roll_or_pitch.ref - add, 0);
        return this.cosineInterpolate(startRelease, 0, roll_or_pitch.ref);
      }
    }
    return 0;
  }
  private smooth_bank(l_or_u: boolean, r_or_d: boolean, roll_or_pitch: { ref: number }, startPress: number, startRelease: number, add: number, maxval: number): number {
    let ret: number = 0;
    if (l_or_u) {
      ret = this.interp_bank(roll_or_pitch, startPress, startRelease, add, maxval, 1);
    }
    else if (r_or_d) {
      ret = this.interp_bank(roll_or_pitch, startPress, startRelease, add, maxval, -1);
    }
    else {
      ret = this.interp_bank(roll_or_pitch, startPress, startRelease, add, maxval, 0);
    }

    return ret;
  }
  public update(dt: number) {
    super.update(dt);
    let pitch: number = 0;
    let roll: number = 0;

    //  pitch = this.smooth_bank(this._movedUp, this._movedDown, { ref: this._pitch }, this._pitchPress, this._pitchRelease, this._pitchspd * dt, this._maxpitch);

    // if (this._barrelRollDirection === Direction.Left) {
    //   roll = this.interp_bank({ ref: this._roll }, this._rollPress, this._rollRelease, this._barrelRollSpeed * dt, this._barrelRollMax, 1);
    // }
    // else if (this._barrelRollDirection === Direction.Right) {
    //   roll = this.interp_bank({ ref: this._roll }, this._rollPress, this._rollRelease, this._barrelRollSpeed * dt, this._barrelRollMax, -1);
    // }
    // else {
    //Smoothly interpolate.
    let obj = { ref: this._roll };
    roll = this.smooth_bank(this._movedLeft, this._movedRight, obj, this._rollPress, this._rollRelease, this._rollspd * dt, this._maxroll);
    this._roll = obj.ref;
    //}


    // this.matrixAutoUpdate = false;
    // let v: Vector3 = this.position;
    // let s: Vector3 = this.scale;

    // let mx = new THREE.Matrix4();
    // mx.makeRotationX(pitch);
    // let mz = new THREE.Matrix4();
    // mz.makeRotationZ(roll);
    // let mr = new THREE.Matrix4();
    // mr.multiplyMatrices(mx, mz);
    // this.matrix.multiply(mr);

    // let mt = new THREE.Matrix4();
    // mt.makeTranslation(v.x, v.y, v.z);

    // let mtr = new THREE.Matrix4();
    // mtr.multiplyMatrices(mt, mr);

    // let ms = new THREE.Matrix4();
    // ms.makeScale(s.x,s.x,s.z);

    // let mtrs = new THREE.Matrix4();
    // mtrs.multiplyMatrices(mtr,ms);

    // this.matrix.copy(mtrs);


    this.rotation.x = pitch;
    this.rotation.z = roll;

    //reset movement
    this._movedDown = this._movedLeft = this._movedRight = this._movedUp = false;
  }
}
class WaitTimer {
  private _time: number = 2;
  private _maxtime: number = 2;
  get time(): number { return this._time; }
  get time01(): number { return 1 - this._time / this._maxtime; }

  public constructor(maxtime: number) {
    this._maxtime = this._time = maxtime;
  }
  public update(dt: number): void {
    if (this._time > 0) {
      this._time -= dt;
      if (this._time <= 0) {
        this._time = 0;
      }
    }
  }
  public ready() {
    return this._time <= 0;
  }
  public reset() {
    this._time = this._maxtime;
  }
}
class PlayerShip extends Ship {
  // private _arms: Array<Arm> = new Array<Arm>();
  public bombs: number = 3;
  public maxbombs: number = 3;
  public score: number = 0;
  public bombTimer: WaitTimer = new WaitTimer(3);
  public bulletTimer: WaitTimer = new WaitTimer(0.2);
  public gun1pos: THREE.Object3D = null;
  public gun2pos: THREE.Object3D = null;
  public constructor() {
    super();
    this.Collide = function (b: PhysicsObject) {
      if (g_isgameover == false) {
        if (b instanceof EnemyShip) {
          g_particles.createShipHitParticles(this.position);
          g_particles.createShipDieParticles(this.position);
          g_audio.play(Files.Audio.Ship_Hit);
          this._health -= 100;
          b.destroy();
        }
        if (this._health <= 0) {
          this._health = 0;
          g_particles.createShipDieParticles(this.WorldPosition);
          g_audio.play(Files.Audio.Ship_Explode);

          stopGame();

          //g_gameovertimer.
        }
      }
    };
  }
  private _nresetclick = 0;
  public update(dt: number) {
    if (g_isgameover == false) {
      this.bombTimer.update(dt);
      this.bulletTimer.update(dt);

      if (g_input.keyboard) {
        if (g_input.keyboard.a.down()) {
          this.moveLeft(dt);
        }
        if (g_input.keyboard.d.down()) {
          this.moveRight(dt);
        }
        if (g_input.keyboard.w.down()) {
          this.moveUp(dt);
        }
        if (g_input.keyboard.s.down()) {
          this.moveDown(dt);
        }
      }

      if (g_input.mouse.Right.pressed()) {
        this.tryFireBomb();
      }
      if (g_input.mouse.Left.pressOrHold()) {
        this.tryFireBullet();
      }
    }
    else {
      if (g_input.mouse.Left.pressed()) {
        this._nresetclick++;
      }
      if (this._nresetclick == 4) {
        this._nresetclick = 0;
        startGame();
      }
    }

    super.update(dt);
  }
  private tryFireBullet(): void {
    if (this.bulletTimer.ready()) {
      let n = new THREE.Vector3();
      camera.getWorldDirection(n);
      //n.negate();


      let v: THREE.Vector3 = new THREE.Vector3();

      g_player.gun1pos.getWorldPosition(v);
      let b1: Bullet = new Bullet(n);
      b1.position.copy(v);

      g_player.gun2pos.getWorldPosition(v);
      let b2: Bullet = new Bullet(n);
      b2.position.copy(v);

      g_audio.play(Files.Audio.Shoot);
      this.bulletTimer.reset();
    }
  }
  private tryFireBomb(): void {
    if (this.bombs > 0) {
      if (this.bombTimer.ready()) {
        let n = new THREE.Vector3();
        camera.getWorldDirection(n);

        let b1: Bomb = new Bomb(n);

        //shoot from gun1, why not?
        let v: THREE.Vector3 = new THREE.Vector3();
        g_player.gun1pos.getWorldPosition(v);
        b1.position.copy(v);

        g_audio.play(Files.Audio.Bomb_Shoot);
        this.bombs -= 1;
      }

      this.bombTimer.reset();
    }
    else {
      g_audio.play(Files.Audio.Nope);

    }
  }
}
class EnemyShip extends Ship {
  private _droprate: number = 0;
  public constructor(model: THREE.Object3D, droprate: number) {
    super();

    this._droprate = droprate;//% chance of a drop.

    if (model) {
      this.setModel(model);
    }
    else {
      //Error
      Globals.logError("Error loading enemy ship model. Default model created.");
      this.setModel(this.createDefaultGeo());
    }

    this.Collide = function (b: PhysicsObject) {
      if (b instanceof Bullet) {
        this._health -= 20;
        g_audio.play(Files.Audio.Ship_Hit);
        g_physics.destroy(b);
        g_particles.createShipHitParticles(this.WorldPosition);
      }
      if (b instanceof BombExplosion) {
        this._health = 0;
      }
      if (b instanceof Bomb) {
      }

      if (this._health <= 0) {
        this._health = 0;
        g_particles.createShipDieParticles(this.WorldPosition);
        g_audio.play(Files.Audio.Ship_Explode);

        //Drop Item
        if (g_player.health < g_player.maxhealth || g_player.bombs < g_player.maxbombs) {
          let drop: number = (1.0 - this._droprate * 0.01);
          if (Random.float(0, 1) >= drop) {
            let item = new Item();
            item.position.copy(this.position);
          }
        }

        //Incement score
        g_player.score += 1;

        //Kill it
        this.destroy();
      }
    };

  }
  private createDefaultGeo(): THREE.Mesh {
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
class Projectile extends PhysicsObject {
  private _speed: number = 40;//.4;
  public constructor(spd: number, direction: Vector3, model: Files.Model) {
    super();

    this.Collide = function () { }//Force object to collide

    this._speed = spd;
    let b = g_models.getModel(model);
    if (b != null) {
      let b2 = b.clone();
      this.setModel(b2);

      this.lookAt(this.position.clone().add(direction));
    }
    else {
      Globals.logError("Could not find model" + model);
    }
    this.Velocity.copy(direction.clone().multiplyScalar(this._speed));
  }
}
class Item extends Projectile {
  private _health = 5;
  public constructor() {
    super(0, new Vector3(0, 0, -1), Files.Model.Item);
    this.RotationDelta.y = Math.PI * 1.0093;
    let that = this;

    this.Collide = function (b: PhysicsObject) {
      if (g_isgameover == false) {
        if (b instanceof Bullet) {
          that._health -= 1;
          g_particles.createItemParticles(this.WorldPosition);
          b.destroy();
        }
        else if (b instanceof PlayerShip) {
          that.giveItem();
        }

        if (that._health <= 0) {
          that._health = 0;
          that.giveItem();
        }
      }
    };

  }
  private giveItem() {
    g_audio.play(Files.Audio.Get_Item);
    let playership: PlayerShip = g_player;

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
    this.destroy();
  }
}
class Bullet extends Projectile {
  public constructor(direction: Vector3) {
    super(90, direction, Files.Model.Bullet);
    //this.Opacity = 0.7;
  }
}
class Bomb extends Projectile {
  private _boomtimer: WaitTimer = new WaitTimer(2.5);

  public constructor(direction: Vector3) {
    super(55, direction, Files.Model.Bomb);
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
    super(0, new Vector3(0, 1, 0), Files.Model.Bomb_Explosion);
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
// class Arm extends THREE.Object3D {
//   private _points: THREE.Points = null;
//   private _armMesh: THREE.Mesh = null;
//   public Pos: Vector3 = new Vector3();

//   private _aimpoint: Vector3 = new Vector3();
//   get AimPoint(): Vector3 { return this._aimpoint; }
//   private _aimnormal: Vector3 = new Vector3();
//   get AimNormal(): Vector3 { return this._aimnormal; }
//   public constructor() {
//     super();
//     this.createMeshes();
//   }
//   public getP0(): Vector3 {
//     return this.getPoint(0);
//   }
//   public getP1(): Vector3 {
//     return this.getPoint(1);
//   }
//   public shoot() {
//     // let b: Bullet = new Bullet(this);
//   }
//   public aim(at: Vector3) {
//     this._aimpoint = at;
//     //Attempt to rotate FIRST then trnaslate
//     this.position.set(0, 0, 0);
//     this.rotation.set(0, 0, 0);
//     this.updateMatrix();
//     this.position.set(this.Pos.x, this.Pos.y, this.Pos.z);
//     this.updateMatrix();

//     let wp = new Vector3();
//     this.getWorldPosition(wp);

//     let world_pt = wp;//wp.clone().add(this.getP0());

//     this._aimnormal = at.clone().sub(world_pt);
//     this._aimnormal.normalize();
//     var left = this._aimnormal.clone().cross(this.up).normalize();

//     var amt = Math.acos(this.up.dot(this._aimnormal));

//     this.rotateOnAxis(left, amt);
//   }
//   private getPoint(idx: number): Vector3 {
//     if (idx <= 1) {
//       if (this._points) {
//         if (this._points.geometry) {
//           let g: THREE.Geometry = this._points.geometry as THREE.Geometry;
//           if (g && g.vertices && g.vertices.length >= 2) {
//             return g.vertices[idx];
//           }
//         }
//       }
//     }
//     return null;
//   }
//   private createMeshes(): void {
//     var xy = 0.02;
//     var z = 1.7;
//     //create Arms

//     //https://threejs.org/examples/?q=points#webgl_custom_attributes_points
//     // Contact points for the mesh.
//     let p0: Vector3 = new Vector3(0, 0, -z / 2);
//     let p1: Vector3 = new Vector3(0, 0, z / 2);
//     let points_geo: THREE.Geometry = new THREE.Geometry();
//     points_geo.vertices.push(p0);
//     points_geo.vertices.push(p1);
//     var pointMaterial = new THREE.PointsMaterial({ color: 0xFF0000, size: 0.1 });
//     this._points = new THREE.Points(points_geo, pointMaterial);
//     this
//     this.add(this._points);

//     //Arm.  TODO: later we load this in
//     var arm_geo = new THREE.BoxBufferGeometry(xy, xy, z);
//     arm_geo.computeBoundingBox(); // for hit area
//     var arm_mat = new THREE.MeshBasicMaterial({
//       //map: this._texture,
//       transparent: false,
//       side: THREE.DoubleSide,
//       color: 0xF0FFF0,
//     });
//     this._armMesh = new THREE.Mesh(arm_geo, arm_mat);
//     this.add(this._armMesh);

//     //move pivots
//     //   this._armMesh.translateZ(z / 2);
//     //   this._points.translateZ(z / 2);

//     this._points.visible = Globals.isDebug();//Not sure if this will actually stop update the points.
//   }
// }
class Random {
  // private static _random: Mersenne = new Mersenne();
  public static float(min: number, max: number) {
    // let n = this._random.random_incl();
    let n = Math.random();
    let n2 = min + (max - min) * n;
    return n2;
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
  public constructor() {               //rtop rbottom height rsegments hsegments openended
    super();

    var geo = new THREE.CylinderGeometry(20, 20, 100, 32, 1, true);
    var texture = THREE.ImageUtils.loadTexture('./dat/img/starfield_1.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 3);
    var mat = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide, depthTest: false });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.position.set(0, 0, 0);

    this.matrixAutoUpdate = false;

    this.add(mesh);
    //https://discourse.threejs.org/t/always-render-mesh-on-top-of-another/120/4
    this.renderOrder = 0;//Render this first.
  }
  private _z: number = 0;
  public update(dt: number) {
    this._z = (this._z + Math.PI * dt * 0.15) % (Math.PI * 2);
    this.rotation.x = Math.PI * 0.5;
    this.updateMatrix();
    this.rotation.y = this._z;
    this.updateMatrix();
  }
}
class RenderManager {
}
/**
 * Manages Audio using the THREE WebAudio interface
 */
class AudioManager {
  public _listener: THREE.AudioListener = new THREE.AudioListener();
  public _audioLoader: THREE.AudioLoader = new THREE.AudioLoader();
  private _cache: Dictionary<THREE.Audio> = {};

  public constructor() {
    this._listener = new THREE.AudioListener();
    this._audioLoader = new THREE.AudioLoader();
    camera.add(this._listener);
  }

  public play(file: Files.Audio, loop: boolean = false, cache: boolean = false) {
    let that = this;
    let szfile: string = './dat/audio/' + file;

    //Three, or WebAudio must be doing some background caching, so the cache here is actually not needed, and hinders audio performance.
    if (cache === false) {
      //reload instance each time.
      this._audioLoader.load(szfile, function (buffer: THREE.AudioBuffer) {
        let a = new THREE.Audio(that._listener);
        a.setBuffer(buffer);
        a.setLoop(loop);
        a.setVolume(1);
        a.play();
      }, function (xhr: any) {
        Globals.logDebug(" " + szfile + " loading " + xhr)
      }, function (err: any) {
        Globals.logError('Error loading  sound ' + szfile + " : " + err);
      });
    }
    else {
      if (szfile in this._cache) {
        this._cache[szfile].setLoop(loop);
        this._cache[szfile].play();
      }
      else {
        this.loadSound(szfile, loop);
      }
    }

  }
  private loadSound(file: string, loop: boolean): void {
    this._cache[file] = new THREE.Audio(this._listener);
    let that = this;
    this._audioLoader.load(file, function (buffer: THREE.AudioBuffer) {
      that._cache[file].setBuffer(buffer);
      that._cache[file].setLoop(loop);
      that._cache[file].setVolume(1);
      that._cache[file].play();
    }, function (xhr: any) {
      Globals.logDebug(" " + file + " loading " + xhr)
    }, function (err: any) {
      Globals.logError('Error loading  sound ' + file + " : " + err);
    });
  }
}
class ModelManager {
  private _cache: Dictionary<THREE.Object3D> = {};
  constructor() {
    this.loadModels();
  }
  public getModel(model: Files.Model): THREE.Object3D {
    let szfile = './dat/model/' + model;

    if (szfile in this._cache) {
      return this._cache[szfile];
    }
    else {
      Globals.logError("Model " + szfile + " was not loaded.");
      return null;
    }
  }
  private loadModels(): void {
    let that = this;
    this.loadModel(Files.Model.Player_Ship, ['Player_Ship', 'Player_Seat', 'Gun1', 'Gun2'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let player_ship: THREE.Object3D = objs['Player_Ship'];
        player_ship.scale.set(.6, .6, .6);
        g_player.setModel(player_ship);
        g_player.gun1pos = new THREE.Object3D();
        g_player.gun1pos.position.copy(objs['Gun1'].position);
        player_ship.add(g_player.gun1pos);

        g_player.gun2pos = new THREE.Object3D();
        g_player.gun2pos.position.copy(objs['Gun2'].position);
        player_ship.add(g_player.gun2pos);

        let player_pos = objs['Player_Seat'].position;
        user.position.copy(player_pos);
        return player_ship;
      }
      return null;
    });
    this.loadModel(Files.Model.Enemy_Ship, ['Enemy_Ship'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let enemy_ship: THREE.Object3D = objs['Enemy_Ship'];
        enemy_ship.scale.set(.6, .6, .6);
        return enemy_ship;
      }
      return null;
    });
    this.loadModel(Files.Model.Enemy_Ship2, ['Enemy_Ship2'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let enemy_ship: THREE.Object3D = objs['Enemy_Ship2'];
        enemy_ship.scale.set(.6, .6, .6);
        return enemy_ship;
      }
      return null;
    });
    this.loadModel(Files.Model.Enemy_Ship3, ['Enemy_Ship3'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let enemy_ship: THREE.Object3D = objs['Enemy_Ship3'];
        enemy_ship.scale.set(.6, .6, .6);
        return enemy_ship;
      }
      return null;
    });
    this.loadModel(Files.Model.Bullet, ['Bullet'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['Bullet'];
        a.scale.set(.6, .6, .6);
        let b = a as THREE.Mesh;
        if (b) {
          let m = b.material as THREE.Material;
          if (m) {
            m.flatShading = true;
          }
        }
        return a;
      }
      return null;
    });
    this.loadModel(Files.Model.Bomb, ['Bomb'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['Bomb'];
        a.scale.set(.6, .6, .6);
        let b = a as THREE.Mesh;
        if (b) {
          let m = b.material as THREE.Material;
          if (m) {
            m.flatShading = true;
          }
        }
        return a;
      }
      return null;
    });
    this.loadModel(Files.Model.Bomb_Explosion, ['Bomb_Explosion'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['Bomb_Explosion'];
        a.scale.set(.6, .6, .6);
        let b = a as THREE.Mesh;
        if (b) {
          let m = b.material as THREE.Material;
          if (m) {
            m.flatShading = true;
          }
        }
        return a;
      }
      return null;
    });
    this.loadModel(Files.Model.Item, ['Item'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['Item'];
        a.scale.set(1.5, 1.5, 1.5);
        let b = a as THREE.Mesh;
        if (b) {
          let m = b.material as THREE.Material;
          if (m) {
            m.flatShading = true;
          }
        }
        return a;
      }
      return null;
    });
  }
  private loadModel(filename: string, obj_names_in_scene: Array<string>, afterLoad: any) {
    let that = this;
    let loader = new GLTFLoader_.GLTFLoader();
    let szfile = './dat/model/' + filename;
    loader.load(
      szfile,
      function (gltf: any) {
        let success: boolean = true;
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
        if (afterLoad) {
          let obj = afterLoad(success, arrobjs, gltf);
          if (obj == null) {
            Globals.logError("loaded model was null, model must be returned from closure");
          }
          else {
            that._cache[szfile] = obj;
          }
        }
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
  public Count: number = 10;
  public Speed: number = 70; //m/s
  public Position: Vector3 = new Vector3();
  public Scale: Vector3 = new Vector3(0, 0, 0);
  public InitialScale: IAVec3 = new IAVec3(new Vector3(1, 1, 1), new Vector3(1, 1, 1));
  public Rotation: Vector3 = new Vector3(0, 0, 0);
  public Color: IAVec3 = new IAVec3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
}
class Particle extends PhysicsObject {
  public constructor(m: THREE.Mesh) {
    super();
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
    for (let i = 0; i < params.Count; ++i) {
      let p = new Particle(this._mesh);
      p.Velocity = Random.randomNormal().multiplyScalar(params.Speed);
      p.RotationDelta.copy(params.Rotation);
      p.ScaleDelta.copy(params.Scale);
      p.position.copy(params.Position);
      p.Color = params.Color.calc();
      p.scale.copy(params.InitialScale.calc());
    }
  }
  public createShipDieParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = 20;
    params.Position.copy(pos);
    params.Rotation.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Scale.x = params.Scale.y = params.Scale.z = Random.float(-2, -0.3);
    params.Speed = Random.float(10, 100);
    params.Color.Min.set(0.7, 0.7, 0);
    params.Color.Max.set(1, 1, 0);
    this.create(params);
  }
  public createItemParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = 5;
    params.Position.copy(pos);
    params.Rotation.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Scale.x = params.Scale.y = params.Scale.z = Random.float(-2, -0.3);
    params.Speed = Random.float(10, 40);
    params.Color.Min.set(0.3, 0.3, 0.7);
    params.Color.Max.set(0.3, 0.3, 1);
    this.create(params);
  }
  public createShipHitParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = 5;
    params.Position.copy(pos);
    params.Rotation.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Scale.x = params.Scale.y = params.Scale.z = Random.float(-2, -0.3);
    params.Speed = Random.float(40, 100);
    params.Color.Min.set(0.6, 0, 0);
    params.Color.Max.set(1, 0, 0);
    params.InitialScale.Min.set(0.9, 0.9, 0.9);
    params.InitialScale.Min.set(1.2, 1.2, 1.2);
    this.create(params);
  }
}

let g_input: Input = null;
let g_pointlight: THREE.PointLight = null;
let g_pointlight2: THREE.PointLight = null;
let g_pointlight3: THREE.PointLight = null;
let g_ambientlight: THREE.AmbientLight = null;
let camera: THREE.PerspectiveCamera = null;

let g_physics: PhysicsManager = null;

let renderer: THREE.WebGLRenderer = null;
let gui: dat.GUI = null;
let score: TextCanvas = null;
let g_bombs: TextCanvas = null;
let axis: THREE.AxesHelper = null;
let user: THREE.Group = null;
let g_shipTimer: Timer = null;
let g_player: PlayerShip = null;
let g_audio: AudioManager = null;
let g_models: ModelManager = null;
let g_screen: Screen = null;
let g_particles: Particles = null;
let g_music: THREE.Audio = null;

let g_gameover: TextCanvas = null;
let g_isgameover: boolean = false;

// https://threejsfundamentals.org/threejs/lessons/threejs-custom-geometry.html
// https://threejsfundamentals.org/threejs/lessons/threejs-webvr.html
// https://fossies.org/linux/three.js/examples/webvr_rollercoaster.html
$(document).ready(function () {

  //Check that vr flag is enabled.
  const url_params = (new URL("" + document.location)).searchParams;
  let debug: boolean = url_params.get('debug') === 'true';
  let showConsole: boolean = url_params.get('console') === 'true';
  Globals.setDebug(debug, showConsole);

  initGame();

  window.addEventListener('resize', function () {
    //This should cause the resize method to fire.
    $("#page_canvas").width(window.innerWidth);
    $("#page_canvas").height(window.innerHeight);

  }, false);


});
function initGame(): void {
  //Recreates the renderer (user can toggle VR off)
  const canvas: HTMLCanvasElement = document.querySelector('#page_canvas');

  renderer = new THREE.WebGLRenderer({ canvas });//You can pass canvas in here
  renderer.setClearColor(0xffffff, 1);
  renderer.setPixelRatio(window.devicePixelRatio);
  if (Globals.VRSupported()) {
    //This has no effect
    //https://github.com/mrdoob/three.js/issues/13225
    renderer.setSize(1920, 1080); // Set to 10px as purely a test
  }
  else {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  Globals.setRenderer(renderer);

  if (Globals.VRSupported()) {
    renderer.vr.enabled = true;
    document.body.appendChild(WEBVR.createButton(renderer, { referenceSpaceType: 'local' }));
  }
  else {
    document.body.appendChild(renderer.domElement);
  }

  g_screen = new Screen(canvas);

  g_physics = new PhysicsManager();

  g_input = new Input();

  createScene();
  createCamera();

  g_audio = new AudioManager();

  makeGui();

  g_models = new ModelManager();

  createUIText();

  g_particles = new Particles();


  if (Globals.isDebug()) {
    axis = new THREE.AxesHelper(1);
    g_physics.Scene.add(axis);

  }

  loadMusic();

  startGame();

  renderLoop();
}
function loadMusic() {
  let music_file = './dat/audio/' + Files.Audio.Electro_Sketch;
  g_audio._audioLoader.load(music_file, function (buffer: THREE.AudioBuffer) {
    g_music = new THREE.Audio(g_audio._listener);
    g_music.setBuffer(buffer);
    g_music.setLoop(true);
    g_music.setVolume(1);
    g_music.play();
  }, function (xhr: any) {
    Globals.logDebug(" " + music_file + " loading " + xhr)
  }, function (err: any) {
    Globals.logError('Error loading  sound ' + music_file + " : " + err);
  });
}
function startGame() {
  if (g_player.model) {
    //won't be loaded when starting fresh, but after a Game Over, this will be set
    g_player.model.visible = true;
  }
  g_player.score = 0;
  g_bombs.visible = true;
  g_gameover.visible = false;
  if (g_music && g_music.isPlaying === false) {
    g_music.play();
  }
  g_shipTimer = new Timer(3000, function () {
    createEnemies();
  });
  g_isgameover = false;
  g_player.health = g_player.maxhealth;
  g_player.bombs = g_player.maxbombs;
}
function stopGame() {
  g_player.model.visible = false;
  g_isgameover = true;
  g_gameover.visible = true;
  g_bombs.visible = false;
  if(g_music) { 
    g_music.stop();
  }

}

class ShipProb {
  public prob = 0;
  public speed_base: number = 0;
  public speed: IAFloat = new IAFloat(0, 1);
  public scale: Vector3 = new Vector3(1, 1, 1);
  public droprate: number = 0;
}
function createEnemies() {
  let nShips = 1;

  for (let i = 0; i < nShips; ++i) {
    let ships: Dictionary<ShipProb> = {};

    ships[Files.Model.Enemy_Ship] = { prob: 0.4, speed_base: 20, speed: new IAFloat(0, 10), scale: new Vector3(3, 3.3, 3), droprate: 20 };//{prob:0.4};
    ships[Files.Model.Enemy_Ship2] = { prob: 0.6, speed_base: 15, speed: new IAFloat(0, 10), scale: new Vector3(1, 1, 1), droprate: 80 };
    ships[Files.Model.Enemy_Ship3] = { prob: 1.0, speed_base: 25, speed: new IAFloat(0, 10), scale: new Vector3(1, 1, 1), droprate: 30 };

    let f: number = Random.float(0, 1);
    let ship: Files.Model = Files.Model.Enemy_Ship;
    let prob_struct: ShipProb = ships[Files.Model.Enemy_Ship];
    for (let i = 0; i < Object.keys(ships).length; i++) {
      let key = Object.keys(ships)[i];

      if (ships[key].prob >= f) {
        ship = key as Files.Model;
        prob_struct = ships[key];
        break;
      }
    }
    if (!ship) {
      ship = Files.Model.Enemy_Ship;
    }

    //Create enemy ship and 
    let m: THREE.Mesh = g_models.getModel(ship) as THREE.Mesh;
    if (m) {
      let mclone: THREE.Mesh = m.clone();
      let ship: EnemyShip = new EnemyShip(mclone, prob_struct.droprate);
      ship.position.copy(g_player.position.clone().add(new Vector3(Random.float(-20, 20), Random.float(-13, 23), -200)));
      ship.Velocity.set(0, 0, prob_struct.speed_base + prob_struct.speed.calc());
      // ship.RotationDelta.set(0, 0, Random.float(0, 1) > 0.7 ? Random.float(-3, 3) : 0);
      ship.scale.copy(prob_struct.scale);
    }
  }
}
function createCamera() {
  const canvas: HTMLCanvasElement = document.querySelector('#page_canvas');
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

  //https://stackoverflow.com/questions/49471653/in-three-js-while-using-webvr-how-do-i-move-the-camera-position
  //In VR we actually add the camera to a group since user actually moves the camera(s) reltaive to origin
  user = new THREE.Group()
  user.add(camera);
  user.position.set(0, 0.02, -0.12);
  user.rotateY(0);

  g_player = new PlayerShip();
  g_player.add(user);
  g_player.up = new Vector3(0, 1, 0);
  g_player.position.set(0, 0, 10);
  g_player.Velocity.set(0, 0, -10);
  g_player.Destroy = function () { /*do not destroy player */ }
  g_player.rotateY(0);
}
function renderLoop() {
  let last_time: number = 0;
  let delta: number = 0;


  var render = function (time: number) {
    time *= 0.001;//convert to seconds I think
    delta = time - last_time;
    last_time = time;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    Globals.updateGlobals(camera, user);

    if (score) {
      score.Text = "Score: " + g_player.score;
      score.update(camera, user);
    }
    if (g_gameover) {
      g_gameover.Text = "Game Over!"
      g_gameover.update(camera, user);
    }
    if (g_bombs) {
      g_bombs.Text = "Bombs: " + g_player.bombs + "/" + g_player.maxbombs + "\n "
        + "Health: " + g_player.health + "/" + g_player.maxhealth;
      g_bombs.update(camera, user);
    }
    if (g_shipTimer) {
      g_shipTimer.update(delta);
    }
    if (g_physics) {
      g_physics.update(delta);
    }
    if (axis) {
      axis.position.set(g_player.position.x - 3, g_player.position.y - 3, g_player.position.z - 10);
    }
    if (g_pointlight) {
      g_pointlight.position.copy(g_player.position.clone().add(new Vector3(-500, 100, -500)));
    }
    if (g_pointlight2) {
      g_pointlight2.position.copy(g_player.position.clone().add(new Vector3(500, 100, -500)));
    }
    if (g_pointlight3) {
      g_pointlight2.position.copy(g_player.position.clone().add(new Vector3(0, 1, -2)));
    }
    renderer.render(g_physics.Scene, camera);
  };
  renderer.setAnimationLoop(render);
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
  let szStar3 = 'dat/img/starfield_3.png';

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
function createUIText(): void {
  //Create Console
  Globals.setConsole3D(g_physics.Scene, g_player);

  //Test Score
  let opts: TextCanvasOptions;

  opts = new TextCanvasOptions();
  opts.Lineheight = opts.Fontsize = Globals.userIsInVR() ? 300 : 100;
  opts.Text = "Score: 0";
  opts.Width = Globals.userIsInVR() ? 0.3 : 0.1;
  opts.Height = 0.1;
  opts.AutoHeight = false;

  score = new TextCanvas(opts);
  score.showWireframe(Globals.isDebug());
  score.AlignToScreen = true;
  score.ScreenX = 0.0;
  score.ScreenY = 0.9;
  score.ScreenZ = 3;

  g_player.add(score);
  opts = new TextCanvasOptions();
  opts.Lineheight = opts.Fontsize = Globals.userIsInVR() ? 300 : 100;
  opts.Width = Globals.userIsInVR() ? 0.3 : 0.1;
  opts.Height = 0.1;
  opts.AutoHeight = false;
  opts.Text = "Bombs: " + g_player.bombs;
  g_bombs = new TextCanvas(opts);
  g_bombs.showWireframe(Globals.isDebug());
  g_bombs.AlignToScreen = true;
  g_bombs.ScreenX = 0.7;
  g_bombs.ScreenY = 0.9;
  g_bombs.ScreenZ = 3;

  g_player.add(g_bombs);

  opts = new TextCanvasOptions();
  opts.Fontsize = opts.Lineheight = 200;
  opts.Width = Globals.userIsInVR() ? 0.3 : 0.3;
  opts.Height = 0.2;
  opts.AutoHeight = false;
  opts.Text = "Game Over!";
  g_gameover = new TextCanvas(opts);
  g_gameover.showWireframe(Globals.isDebug());
  g_gameover.AlignToScreen = true;
  g_gameover.ScreenX = 0.3;
  g_gameover.ScreenY = 0.1;
  g_gameover.ScreenZ = 8;

  g_player.add(g_gameover);

  g_gameover.visible = false;

  //Globals.logInfo("hi1\nasdf\nhi2\n")
}

function makeGui() {
  gui = new dat.GUI();
  //TODO: 
  //this is the debug GUI
}