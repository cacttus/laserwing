import * as $ from "jquery";
import * as THREE from 'three';
import * as Physijs from 'physijs-webpack';
import { Vector3, Vector2, Vector4, ShapeUtils, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D, AlwaysStencilFunc } from 'three';

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
    LevelUp = 'levelup.ogg',
    Moskito = 'moskito.ogg',
    GameOver = 'gameover.ogg',
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

      //TESTS
      //if (Globals.isDebug()) 
      {
        //f2
        if (e.keyCode === 113) { enterBoss(); }
        //f3
        if (e.keyCode === 114) { exitBoss(); }
      }


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
interface DestroyAllObjectsFunction { (ob: PhysicsObject): boolean; }
interface FindAllObjectsFunction { (ob: PhysicsObject): boolean; }
class PhysicsManager {
  private _objects: Array<PhysicsObject> = new Array<PhysicsObject>();
  private _collide: Array<PhysicsObject> = new Array<PhysicsObject>();

  public get Objects(): Array<PhysicsObject> { return this._objects; }
  private toDestroy: Array<PhysicsObject> = new Array<PhysicsObject>();

  public Scene: THREE.Scene = null; //= new THREE.Scene();

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
    if (obj.IsDestroyed === false) {
      this.Scene.remove(obj);
      this.toDestroy.push(obj);
      if (obj.OnDestroy) {
        obj.OnDestroy(obj);
      }
      obj.IsDestroyed = true;
    }
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
interface PhysicsObjectCollisionCheck { (b: PhysicsObject): void; }
interface PhysicsObjectDestroyCheck { (): boolean; }
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

  protected _afterLoadModel: ModelObjectCallback = null; //Called after ship is loaded.  This is actually implemented (sloppily) by subclasses.
  public OnDestroy: PhysicsObjectDestroyCallback = null;

  //Default destroy routine for all objects.
  private _destroy: PhysicsObjectDestroyCheck = function () {
    //Destroy if we are too far awawy from the player.
    let ca: boolean = Math.abs(this.WorldPosition.z - g_player.WorldPosition.z) > 500;//.distanceToSquared(player.WorldPosition) >= (camera.far * camera.far);
    //Destroy if we are behind the player (we only move forward in the z)
    let cb: boolean = this.position.z - g_player.position.z > 20;
    //Destroy if our scale is zero
    let cc: boolean = (this.scale.x < 0.0001) && (this.scale.y < 0.0001) && (this.scale.z < 0.0001);
    //Opacity is zero
    let cd: boolean = this._opacity <= 0;

    return ca || cb || cc || cd;
  }
  get Destroy(): any { return this._destroy; }
  set Destroy(v: any) { this._destroy = v; }

  //Setting Collide will add or remove the object from the game's collider list
  //If collide is null, the object doesn't collide with anything.  This is for performance reasons.  Don't set Collide if the object doesn't collide (for example is a collidee)
  private _collide: PhysicsObjectCollisionCheck = null;
  get Collide(): PhysicsObjectCollisionCheck { return this._collide; }
  set Collide(f: PhysicsObjectCollisionCheck) {
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
  set OpacityDelta(val:number) { this._opacityDelta = val;}
  get OpacityDelta() : number { return this._opacityDelta;}
  private _opacity:number =1;
  private _opacityDelta:number =0;

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
    this.rotation.x = (this.rotation.x + rdt.x) % Math.PI;
    this.rotation.y = (this.rotation.y + rdt.y) % Math.PI;
    this.rotation.z = (this.rotation.z + rdt.z) % Math.PI;
    this.scale.x += this._scale.x * dt;
    if (this.scale.x < 0) { this.scale.x = 0; }
    this.scale.y += this._scale.y * dt;
    if (this.scale.y < 0) { this.scale.y = 0; }
    this.scale.z += this._scale.z * dt;
    if (this.scale.z < 0) { this.scale.z = 0; }

    if(this._opacityDelta != 0 ) {
      this._opacity += this._opacityDelta * dt;
      this._opacity = Math.min(1, Math.max(0,this._opacity));
      this.Opacity = this._opacity;
    }

  }
  public get WorldPosition(): Vector3 {
    let v = new Vector3();
    this.getWorldPosition(v);
    return v;
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
      this.add(this._model);

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

//Ship class representing both player and enemy ship.
enum Direction { Left, Right, None }
class Ship extends PhysicsObject {
  protected _bulletSpeed: number = 30;
  protected _damage = 10;

  private _health: number = 100;
  get health(): number { return this._health; }
  set health(v: number) { this._health = v }

  protected _maxhealth: number = 100;
  get maxhealth(): number { return this._maxhealth; }

  private _guns: Array<Object3D> = new Array<Object3D>();
  get Guns(): Array<Object3D> { return this._guns; }
  set Guns(guns: Array<Object3D>) { this._guns = guns; }


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

  public constructor(sz_m: Files.Model, afterload: ModelObjectCallback) {
    super();

    this._afterLoadModel = afterload;

    let that = this;
    g_models.setModelAsyncCallback(sz_m, function (m: THREE.Mesh) {
      if (m) {
        let mclone: THREE.Mesh = m.clone();
        that.setModel(mclone);

        mclone.traverse(function (ob: any) {
          if (ob instanceof Object3D) {
            let n: string = ob.name;
            if (n.toLowerCase().startsWith('gun') && n.length >= 4) {
              let id: number = 0;

              if (id >= 0) {
                that.Guns.push(ob);
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
  public fireBullets(dir: Vector3) {
    let n = dir;
    let v: THREE.Vector3 = new THREE.Vector3();

    for (let i = 0; i < this.Guns.length; ++i) {
      let gun: Object3D = this.Guns[i];

      gun.getWorldPosition(v);

      let b1: Bullet = new Bullet(this, n, this._bulletSpeed, this._damage);
      b1.position.copy(v);
    }
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
  get interval(): number { return this._maxtime; }
  set interval(n: number) { this._maxtime = n; }
  get time(): number { return this._time; }
  get time01(): number { return 1 - this._time / this._maxtime; }

  public constructor(maxtime: number) {
    this._maxtime = this._time = maxtime;
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
    this._time = this._maxtime;
  }
}
class PlayerShip extends Ship {
  public bombs: number = 3;
  public maxbombs: number = 3;
  public score: number = 0;
  public bombTimer: WaitTimer = new WaitTimer(3);
  public bulletTimer: WaitTimer = new WaitTimer(0.2);
  public ShipLevel: number = 1;

  public constructor() {
    super(Files.Model.Player_Ship, function (that: PhysicsObject, m: THREE.Mesh) {
      that.Color = (that as PlayerShip).getColorForShipLevel((that as PlayerShip).ShipLevel);
    });

    let that = this;

    this._bulletSpeed = 90;

    //Set the collision routine.
    this.Collide = function (b: PhysicsObject) {
      if (g_isgameover == false) {
        if (b instanceof Bullet) {
          if ((b as Bullet).Firer instanceof EnemyShip) {

            this._health -= (b as Bullet).Damage;
            g_audio.play(Files.Audio.Ship_Hit);
            g_physics.destroy(b);
            g_particles.createShipHitParticles(this.WorldPosition);
          }
        }
        else if (b instanceof EnemyShip) {
          g_particles.createShipHitParticles(this.position);
          g_particles.createShipDieParticles(this.position);
          g_audio.play(Files.Audio.Ship_Hit);
          this._health -= 100;
          b.destroy();
        }
        else if (b instanceof Boss) {
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
        }
      }
    };
  }

  public levelUp(): void {
    this.ShipLevel += 1;
    this.Color = this.getColorForShipLevel(this.ShipLevel);

    if (this.ShipLevel === 1) {
      this._damage = 10;
    }
    else if (this.ShipLevel === 2) {
      this._damage = 20;
    }
    else if (this.ShipLevel === 3) {
      this._damage = 30;
    }
    else {
      this._damage = this.ShipLevel * 2 * 10;
    }

    g_audio.play(Files.Audio.LevelUp);
  }

  public getColorForShipLevel(level: number): Vector3 {
    let color: Vector3 = new Vector3(1, 1, 1);
    if (level === 1) {
      color = new Vector3(0.2, 0.4, 1);
    }
    else if (level === 2) {
      color = new Vector3(0.2, 1, 0.3);
    }
    else if (level === 3) {
      color = new Vector3(1, 0.5, 0.2);
    }
    else if (level === 4) {
      color = new Vector3(0, 0.5, 1.0);
    }
    else if (level === 5) {
      color = new Vector3(0.7, 0.1, 0.3);
    }
    else if (level === 6) {
      color = new Vector3(1, 0.0, 0.0);
    }
    else if (level === 7) {
      color = new Vector3(0.48, 0.4, 1.0);
    }
    else if (level === 8) {
      color = new Vector3(0.45, 0.45, 0.12);
    }
    else if (level === 9) {
      color = new Vector3(1, 1, 1);
    }
    else if (level === 10) {
      color = new Vector3(.1, .1, .2);
    }
    return color;
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

      //n.negate();
      let n = new THREE.Vector3();
      camera.getWorldDirection(n);
      this.fireBullets(n);

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
        this.Guns[0].getWorldPosition(v);
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
  private _fireTimer: Timer = null;
  private _fireTime: number = 10000;
  private _points: number = 0;
  private _numdrops: number = 0;
  get Points(): number { return this._points; }

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
      item.position.copy(this.position.clone().add(Random.randomNormal().multiplyScalar(2)));
    }
  }

  public constructor(model: Files.Model, health: number, droprate: number, numdrops: number, firetime: number, points: number) {
    super(model, function () { });
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

          that.health -= (b as Bullet).Damage;
          g_audio.play(Files.Audio.Ship_Hit);
          g_physics.destroy(b);
          g_particles.createShipHitParticles(that.WorldPosition);
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

  private fire() {

    let dir: Vector3 = new Vector3();

    //Point the bullet a ways away from the player for the effect of "trying" to shoot player.
    let v: Vector3 = g_player.WorldPosition.clone();

    dir.copy(v.sub(new Vector3(0, 0, Random.float(0, 1) * g_player.Velocity.z * 1.5)));

    dir.sub(this.WorldPosition);
    dir.normalize();

    this.fireBullets(dir);
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
    this.Collide = function (b: PhysicsObject) {
      if (b instanceof Bullet) {
        if ((b as Bullet).Firer instanceof PlayerShip) {
          this._health -= (b as Bullet).Damage;
          g_audio.play(Files.Audio.Ship_Hit);
          g_physics.destroy(b);
          g_particles.createShipHitParticles(this.WorldPosition);
        }
      }
      if (this._health <= 0) {
        this._health = 0;
        g_particles.createBossDieParticles(this.WorldPosition);
        g_audio.play(Files.Audio.Ship_Explode);
        this.destroy();
        exitBoss();
      }
    }

    this.Destroy = function () {
      let x = this.position.z - g_player.position.z;
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
        let b2 = b.clone();
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
  private _health = 10;

  private _isLevelItem = false;

  public constructor(isLevelItem: boolean) {
    super(0, new Vector3(0, 0, -1), Files.Model.Item, function () { });
    this.RotationDelta.y = Math.PI * 1.0093;
    let that = this;
    this._isLevelItem = isLevelItem;

    //fun colors.
    this.Color = Random.randomColor().clamp(new Vector3(.2, .1, .2), new THREE.Vector3(1, 1, 1));

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
  public Firer: PhysicsObject = null;
  public constructor(firer: PhysicsObject, direction: Vector3, spd: number, damage: number) {
    super(spd, direction, Files.Model.Bullet, function (that: PhysicsObject, m: THREE.Mesh) {
      if (firer instanceof PlayerShip) {
        that.Color = g_player.getColorForShipLevel(g_player.ShipLevel);
      }
    });
    let that = this;

    this.Firer = firer;
    this.Damage = damage;
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
  // private static _random: Mersenne = new Mersenne();
  public static float(min: number, max: number) {
    // let n = this._random.random_incl();
    let n = Math.random();
    let n2 = min + (max - min) * n;
    return n2;
  }
  public static randomColor(): Vector3 {
    return this.randomNormal().multiplyScalar(2).subScalar(1);
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
    // this.loadShip(Files.Model.Player_Ship, ['Player_Seat'], function (success: boolean, ship: Object3D, objs: any, gltf: any) {
    //   let player_pos = objs['Player_Seat'].position;
    //   user.position.copy(player_pos);
    //   return ship;
    // });
    this.loadModel(Files.Model.Boss, ['MainObject'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let boss: THREE.Object3D = objs['MainObject'];
        boss.scale.set(.6, .6, .6);

        return boss;
      }
      return null;

    });
    this.loadModel(Files.Model.Player_Ship, ['MainObject', 'Player_Seat', 'Gun1', 'Gun2'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let player_ship: THREE.Object3D = objs['MainObject'];
        player_ship.scale.set(.6, .6, .6);

        let player_pos = objs['Player_Seat'].position;
        user.position.copy(player_pos);
        return player_ship;
      }
      return null;
    });

    this.loadShip(Files.Model.Enemy_Ship);

    this.loadShip(Files.Model.Enemy_Ship2);

    this.loadShip(Files.Model.Enemy_Ship3);

    this.loadModel(Files.Model.Bullet, ['MainObject'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['MainObject'];
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
    this.loadModel(Files.Model.Bomb, ['MainObject'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['MainObject'];
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
    this.loadModel(Files.Model.Bomb_Explosion, ['MainObject'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['MainObject'];
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
    this.loadModel(Files.Model.Item, ['MainObject'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['MainObject'];
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
        if (that._callbacks[szfile] != null) {
          let mesh = obj as THREE.Mesh; // Must cast to mesh
          for (let ci = 0; ci < that._callbacks[szfile].length; ci--) {
            that._callbacks[szfile][ci](mesh);
          }
          that._callbacks[szfile] = null;
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
  public Count: number = 10;
  public Speed: IAFloat = new IAFloat(70,70); //m/s
  public Position: Vector3 = new Vector3();
  public Scale: Vector3 = new Vector3(0, 0, 0);
  public InitialScale: IAVec3 = new IAVec3(new Vector3(1, 1, 1), new Vector3(1, 1, 1));
  public Rotation: Vector3 = new Vector3(0, 0, 0);
  public Color: IAVec3 = new IAVec3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
  public Opacity: IAFloat = new IAFloat(0,0);
}
class Particle extends PhysicsObject {
  public constructor(m: THREE.Mesh) {//file:Files.Model) {
    super();
    // let that =this;
    // g_models.setModelAsyncCallback(file, function(m: THREE.Mesh){
    let b2 = m.clone();
    this.setModel(b2);
    //});
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
      p.Velocity = Random.randomNormal().multiplyScalar(params.Speed.calc());
      p.RotationDelta.copy(params.Rotation);
      p.ScaleDelta.copy(params.Scale);
      p.position.copy(params.Position);
      p.Color = params.Color.calc();
      p.scale.copy(params.InitialScale.calc());
      p.OpacityDelta = params.Opacity.calc();
    }
  }
  public createBossDieParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = 150;
    params.Position.copy(pos);
    params.Rotation.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.InitialScale.Min.set(0.5,0.5,0.5);
    params.InitialScale.Max.set(4,4,4);
    params.Scale.x =
    params.Scale.y = 
    params.Scale.z = Random.float(-0.3, -0.2);
    params.Speed.Max = 0.2;
    params.Speed.Min = 100;//Random.float(10, 100);
    params.Color.Min.set(0.1, 0.1, 0.2);
    params.Color.Max.set(0.3, 1, 1.0);
    params.Opacity.Max = params.Opacity.Min = -0.1;//(-0.1,-0.1);
    this.create(params);
  }
  public createShipDieParticles(pos: Vector3) {
    let params: ParticleParams = new ParticleParams();
    params.Count = 20;
    params.Position.copy(pos);
    params.Rotation.x = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.y = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Rotation.z = Random.float(-Math.PI * 2, Math.PI * 2);
    params.Scale.x = params.Scale.y = params.Scale.z = Random.float(-2, -0.3);
    params.Speed.Max = params.Speed.Min = Random.float(10, 100);
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
    params.Speed.Max = params.Speed.Min = Random.float(10, 40);
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
    params.Speed.Max = params.Speed.Min = Random.float(40, 100);
    params.Color.Min.set(0.6, 0, 0);
    params.Color.Max.set(1, 0, 0);
    params.InitialScale.Min.set(0.9, 0.9, 0.9);
    params.InitialScale.Min.set(1.2, 1.2, 1.2);
    this.create(params);
  }
}

enum GameState { Title, Play, GameOver }
let g_gameState: GameState = GameState.Title;

let g_gameTitle: string = $('gametitle').text();

let g_input: Input = null;
let g_pointlight: THREE.PointLight = null;
let g_pointlight2: THREE.PointLight = null;
let g_pointlight3: THREE.PointLight = null;
let g_ambientlight: THREE.AmbientLight = null;
let camera: THREE.PerspectiveCamera = null;

let g_physics: PhysicsManager = null;

let renderer: THREE.WebGLRenderer = null;
let gui: dat.GUI = null;

let axis: THREE.AxesHelper = null;
let user: THREE.Group = null;
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

class AsyncMusic {
  public audio : THREE.Audio = null;
  public stopped : boolean = false;
  public constructor(a:THREE.Audio){
    this.audio = a;
  }
  public stop() { 
    if(this.audio && this.audio.source){
      this.audio.stop();
    }
  }
  public play(){
    if(this.audio && this.audio.source){
      this.audio.play();
    }
  }
}

let g_score: TextCanvas = null;
let g_stats: TextCanvas = null;
let g_titleHeader: TextCanvas = null;
let g_titleSub: TextCanvas = null;
let g_gameover: TextCanvas = null;
let g_allTextObjects: Array<TextCanvas> = new Array<TextCanvas>();
let g_isgameover: boolean = false;
let g_music: Dictionary<AsyncMusic> = {};

let g_mainMusicFile: Files.Audio = Files.Audio.Electro_Sketch;
let g_bossMusicFile: Files.Audio = Files.Audio.Moskito;

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
  g_models = new ModelManager();
  g_particles = new Particles();

  makeGui();

  if (Globals.isDebug()) {
    axis = new THREE.AxesHelper(1);
    g_physics.Scene.add(axis);
  }

  //loadMusic();

  createPlayer();

  showTitle();

  listenForGameStart();

  // startGame();

  g_starfield = new Starfield();

  renderLoop();
}


interface AfterLoadMusicCallback { (audio: THREE.Audio): void; }
function playMusic(file: Files.Audio) {
  let audio_root: string = './dat/audio/';
  let music_file = audio_root + file;

  if (file in g_music && g_music[file] && g_music[file].audio && g_music[file].audio.source) {
    g_music[file].stop();
    g_music[file].play();
  }
  else {
    //Lost sound handle, reload.
    g_audio._audioLoader.load(music_file, function (buffer: THREE.AudioBuffer) {
      let ret: THREE.Audio = null;
      ret = new THREE.Audio(g_audio._listener);
      ret.setBuffer(buffer);
      ret.setLoop(true);
      ret.setVolume(1);
      ret.play();
      g_music[file] = new AsyncMusic(ret);
    }, function (xhr: any) {
      Globals.logDebug(" " + music_file + " loading " + xhr)
    }, function (err: any) {
      Globals.logError('Error loading  sound ' + music_file + " : " + err);
    });
  }
}
function stopMusic(file: Files.Audio) {
  if (file in g_music) {
    let audio : AsyncMusic = g_music[file];
    if (audio && audio.audio && audio.audio.source) {
      audio.stop();
    }
    else {
      g_music[file] = null;
    }
  }

}
// function loadMusic() {
//   let audio_root: string = './dat/audio/';
//   //World
//   {
//     let music_file = audio_root + Files.Audio.Electro_Sketch;
//     g_audio._audioLoader.load(music_file, function (buffer: THREE.AudioBuffer) {
//       g_mainMusic = new THREE.Audio(g_audio._listener);
//       g_mainMusic.setBuffer(buffer);
//       g_mainMusic.setLoop(true);
//       g_mainMusic.setVolume(1);
//     }, function (xhr: any) {
//       Globals.logDebug(" " + music_file + " loading " + xhr)
//     }, function (err: any) {
//       Globals.logError('Error loading  sound ' + music_file + " : " + err);
//     });
//   }

//   //Boss
//   {
//     let music_file = audio_root + Files.Audio.Moskito;
//     g_audio._audioLoader.load(music_file, function (buffer: THREE.AudioBuffer) {
//       g_bossMusic = new THREE.Audio(g_audio._listener);
//       g_bossMusic.setBuffer(buffer);
//       g_bossMusic.setLoop(true);
//       g_bossMusic.setVolume(1);
//     }, function (xhr: any) {
//       Globals.logDebug(" " + music_file + " loading " + xhr)
//     }, function (err: any) {
//       Globals.logError('Error loading  sound ' + music_file + " : " + err);
//     });
//   }
// }
function listenForGameStart() {
  if (Globals.userIsInVR()) {
    //TODO:
  }
  else {

    document.addEventListener('mousedown', function (e) {
      if (g_gameState === GameState.Title) {
        e.preventDefault();
        if (e.button == 0) {
          startGame();
        }
        else if (e.button == 1) {
          //middle
        }
        else if (e.button == 2) {
        }
      }
    });
  }
}
function createPlayer() {

  g_player = new PlayerShip();
  g_player.add(user);
  g_player.up = new Vector3(0, 1, 0);
  g_player.position.set(0, 0, 10);
  g_player.Velocity.set(0, 0, -10);
  g_player.Destroy = function () { /*do not destroy player */ }
  g_player.rotateY(0);

  createUIText(g_player);
}
function showTitle() {
  g_titleHeader.visible = true;
  g_titleSub.visible = true;


}
function startGame() {
  g_gameState = GameState.Play;

  g_bossTimer = new Timer(60 * 1000, function () {
    enterBoss();
  });

  // if (g_player.model) {
  //won't be loaded when starting fresh, but after a Game Over, this will be set
  //   g_player.model.visible = true;
  // }
  // g_player.score = 0;
  g_stats.visible = true;
  g_gameover.visible = false;
  g_titleSub.visible = false;
  g_titleHeader.visible = false;

  if (isBossMode()) {
    exitBoss();
  }
  stopMusic(g_bossMusicFile);
  stopMusic(g_mainMusicFile);

  playMusic(g_mainMusicFile);

  g_shipTimer = new Timer(3000, function () {
    createEnemies();
  });
  g_isgameover = false;
  // g_player.health = g_player.maxhealth;
  // g_player.bombs = g_player.maxbombs;
}
function stopGame() {
  g_gameState = GameState.GameOver;
  g_player.model.visible = false;
  g_isgameover = true;
  g_gameover.visible = true;
  g_stats.visible = false;
  g_audio.play(Files.Audio.GameOver);
  stopMusic(g_mainMusicFile);
  stopMusic(g_bossMusicFile);
  g_bossTimer.stop();
}
function isBossMode() {
  return g_physics.findObjectOfType(function (ob: PhysicsObject) { return ob instanceof Boss; });
}
function enterBoss() {
  g_bossTimer.stop();
  g_shipTimer.stop();

  g_physics.destroyAllObjects(function (ob: PhysicsObject) { return ob instanceof EnemyShip; });

  stopMusic(g_mainMusicFile);
  playMusic(g_bossMusicFile);

  let b: Boss = new Boss();
  b.position.copy(g_player.position.clone().add(new Vector3(0, 0, -140)));
  //Move the boss backwards so it slowly inches towards the player.
  b.Velocity.set(0, 0, g_player.Velocity.z + 0.05);
}
function exitBoss() {
  //add 60s for each new boss interval.
  g_bossTimer.Interval += 60;
  g_bossTimer.start();
  g_shipTimer.start();

  stopMusic(g_bossMusicFile);
  playMusic(g_mainMusicFile);
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

    ships[Files.Model.Enemy_Ship] = { prob: 0.4, points: 2, health: 60, speed_base: 13, speed: new IAFloat(0, 10), scale: new Vector3(3, 3.3, 3), droprate: 20, rotation_delta: new IAVec3(new Vector3(0, 0, 0), new Vector3(0, 0, 0)), firetime: new IAFloat(3000, 5000) };//{prob:0.4};
    ships[Files.Model.Enemy_Ship2] = { prob: 0.6, points: 4, health: 240, speed_base: 5, speed: new IAFloat(0, 3), scale: new Vector3(1, 1, 1), droprate: 80, rotation_delta: new IAVec3(new Vector3(0, 0, 0), new Vector3(0, 0, 0)), firetime: new IAFloat(5000, 9000) };
    ships[Files.Model.Enemy_Ship3] = { prob: 1.0, points: 3, health: 30, speed_base: 20, speed: new IAFloat(0, 10), scale: new Vector3(1, 1, 1), droprate: 30, rotation_delta: new IAVec3(new Vector3(0, 0, Math.PI * 0.2), new Vector3(0, 0, Math.PI * 1.3)), firetime: new IAFloat(1000, 5000) };

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
      let ship: EnemyShip = new EnemyShip(file, prob_struct.health, 1,  prob_struct.droprate, prob_struct.firetime.calc(), prob_struct.points);
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
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

  //https://stackoverflow.com/questions/49471653/in-three-js-while-using-webvr-how-do-i-move-the-camera-position
  //In VR we actually add the camera to a group since user actually moves the camera(s) reltaive to origin
  user = new THREE.Group()
  user.add(camera);
  user.position.set(0, 0.02, -0.12);
  user.rotateY(0);

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

    updateUI();

    if (g_shipTimer) {
      g_shipTimer.update(delta);
    }
    if (g_physics) {
      g_physics.update(delta);
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

    //Starfield
    if (g_starfield) {
      g_starfield.update(delta);
    }


    renderer.render(g_physics.Scene, camera);
  };
  renderer.setAnimationLoop(render);
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
    g_allTextObjects[itext].update(camera, user);
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

  opts = new TextCanvasOptions();
  opts.Fontsize = opts.Lineheight = 40;
  opts.Width = Globals.userIsInVR() ? 0.8 : 0.8;
  opts.Height = 0.4;
  opts.AutoHeight = false;
  opts.Text = Globals.userIsInVR() ? "Press B to play." : "Click to play.";
  g_titleSub = new TextCanvas(opts);
  g_titleSub.showWireframe(Globals.isDebug());
  g_titleSub.AlignToScreen = true;
  g_titleSub.ScreenX = 0.5;
  g_titleSub.ScreenY = 0.6;
  g_titleSub.ScreenZ = 8;
  player.add(g_titleSub);
  g_allTextObjects.push(g_titleSub);
  g_titleSub.visible = false;

  //Globals.logInfo("hi1\nasdf\nhi2\n")
}

function makeGui() {
  gui = new dat.GUI();
  //TODO: 
  //this is the debug GUI
}