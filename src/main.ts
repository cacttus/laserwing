import * as $ from "jquery";
import * as THREE from 'three';
import * as Physijs from 'physijs-webpack';
import { Vector3, Vector2, ShapeUtils, PerspectiveCamera, Box3, Geometry, Scene } from 'three';

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
  }
  export enum Model {
    Player_Ship = 'player_ship.glb',
    Enemy_Ship = 'enemy_ship.glb',
    Bullet = 'bullet.glb',
  }
}
//https://stackoverflow.com/questions/38213926/interface-for-associative-object-array-in-typescript
interface Dictionary<T> {
  [key: string]: T;
}
enum ButtonState { Press, Hold, Release, Up }
class KeyboardButton {
  private _state: ButtonState = ButtonState.Up;
  get state(): ButtonState { return this._state; }
  public pressed(): boolean { return this.state === ButtonState.Press; }
  public down(): boolean { return this.state === ButtonState.Press || this.state === ButtonState.Hold; }
  public update(up: boolean) {
    if (up) {
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
/**
 * Keyboard Input class
 */
class Keyboard {
  private _w: KeyboardButton = new KeyboardButton();
  private _s: KeyboardButton = new KeyboardButton();
  private _a: KeyboardButton = new KeyboardButton();
  private _d: KeyboardButton = new KeyboardButton();
  private _buttons: Array<KeyboardButton> = new Array<KeyboardButton>();

  get w(): KeyboardButton { return this._w; }
  get s(): KeyboardButton { return this._s; }
  get a(): KeyboardButton { return this._a; }
  get d(): KeyboardButton { return this._d; }
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
  public constructor() {
    super();
    let that = this;

    document.addEventListener('mousedown', function (e) {
      player.shootArms();
    });
    //var controls = new OrbitControls.default();
    document.addEventListener('mousemove', function (e) {


      //animate arms based on cursor position.
      e.preventDefault();
      if (!that.moved) {
        that.moved = true;
      }

      //getMousePos
      //https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
      const canvas = renderer.domElement;
      let rect = canvas.getBoundingClientRect();
      let scaleX = canvas.width / rect.width;   // relationship bitmap vs. element for X
      let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y
      let rel_x = (e.clientX - rect.left) * scaleX;
      let rel_y = (e.clientY - rect.top) * scaleY;

      let project_dist: number = 10;//This is how far into the world we project mouse from screen
      let f: Frustum = new Frustum(camera);
      let mouse_pos = f.project(rel_x, canvas.width, rel_y, canvas.height, project_dist);
      that.copy(mouse_pos);

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


      player.aimArms(that);

    }, false);
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
          player.add(g);
          Globals.logInfo("added controller.");

          g.MoveController = function () {
            let p: Vector3 = g.position.clone();
            if (g.getHandedness() == "left") {
              player.aimLeft(p);

            }
            else if (g.getHandedness() == "right") {
              player.aimRight(p);

            }
          }
          g.ButtonPress = function (b: VRButton) {
            player.shootArms();
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
  private Points_fpt_ftl: Vector3;//back topleft
  private Points_fpt_ftr: Vector3;//back topright
  private Points_fpt_fbl: Vector3;//back bottomleft
  //private Points_fpt_ntl: Vector3;//back bottomleft
  public constructor(c: PerspectiveCamera) {
  }
  public project(screen_x: number, screen_w: number, screen_y: number, screen_h: number, dist: number): Vector3 {
    //Doing this the old way
    let cam_dir: Vector3 = new Vector3();
    camera.getWorldDirection(cam_dir);
    let cam_pos: Vector3 = new Vector3();
    player.getWorldPosition(cam_pos);

    let wrx = screen_x / screen_w;//) * 2 - 1;
    let wry = screen_y / screen_h;//) * 2 + 1;
    let farCenter: Vector3 = cam_pos.clone().add(cam_dir.clone().multiplyScalar(camera.far));
    let ar = screen_h / screen_w;
    let tan_fov_2 = Math.tan(THREE.Math.degToRad(camera.getEffectiveFOV()) / 2.0);
    let w_far_2 = tan_fov_2 * camera.far;
    let h_far_2 = w_far_2 * ar;
    let rightVec = camera.up.clone().cross(cam_dir);

    let cup = camera.up.clone().multiplyScalar(h_far_2);
    let crt = rightVec.clone().multiplyScalar(w_far_2);

    this.Points_fpt_ftl = farCenter.clone().add(cup).sub(crt);
    this.Points_fpt_ftr = farCenter.clone().add(cup).add(crt);
    this.Points_fpt_fbl = farCenter.clone().sub(cup).sub(crt);

    let dx = this.Points_fpt_ftr.clone().sub(this.Points_fpt_ftl).multiplyScalar(wrx);
    let dy = this.Points_fpt_fbl.clone().sub(this.Points_fpt_ftl).multiplyScalar(wry);

    let mouse_pos_3d: Vector3 = this.Points_fpt_ftl.clone().add(dx).add(dy);

    mouse_pos_3d.normalize().multiplyScalar(dist);

    mouse_pos_3d.add(cam_pos);

    return mouse_pos_3d;
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
  public get Objects(): Array<PhysicsObject> { return this._objects; }
  private toDestroy: Array<PhysicsObject> = new Array<PhysicsObject>();

  public Scene: THREE.Scene = null; //= new THREE.Scene();


  public add(obj: PhysicsObject) {
    for (let i = this._objects.length - 1; i >= 0; --i) {
      if (this._objects[i] == obj) {
        Globals.logError("Tried to add duplicate phy obj.");
        return;
      }
    }
    this._objects.push(obj);
    this.Scene.add(obj);
  }
  public destroy(obj: PhysicsObject) {
    this.Scene.remove(obj);
    this.toDestroy.push(obj);
    obj.IsDestroyed = true;
  }

  public update(dt: number): void {
    //Preliminary destroy . distance
    for (let i = this._objects.length - 1; i >= 0; --i) {
      let ob = this._objects[i];
      let ca : boolean = ob.OutOfWorld === OutOfWorldResponse.Destroy && ob.WorldPosition.z > 300;//.distanceToSquared(player.WorldPosition) >= (camera.far * camera.far);
      let cb : boolean = ob.position.z - player.position.z > 5;
      if (ca||cb) {
        this.destroy(ob);
      }
      else {
        ob.update(dt);
      }
    }

    //Collide with others
    for (let i = this._objects.length - 1; i >= 0; --i) {
      for (let j = this._objects.length - 1; j >= 0; --j) {
        if (j != i) {
          let a = this._objects[i];
          let b = this._objects[j];
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
      if (this.toDestroy[i].IsDestroyed) {
        for (let j = this._objects.length - 1; j >= 0; --j) {
          if (this._objects[j] == this.toDestroy[i]) {
            this._objects.splice(j, 1);//delete
          }
        }
      }
    }
    this.toDestroy = new Array<PhysicsObject>();

  }
}
enum OutOfWorldResponse { Destroy, None }
class PhysicsObject extends THREE.Object3D {
  protected _bbox = new THREE.Box3();
  get Box(): Box3 { return this._bbox; }
  private _velocity: Vector3 = new Vector3();
  private _isDestroyed: boolean = false;
  private _rotation: Vector3 = new Vector3;

  private _model: THREE.Object3D = null;
  public setModel(m: THREE.Object3D) {
    if (this._model) {
      this.remove(this._model);
    }
    this._bbox = new THREE.Box3().setFromObject(m);

    this._model = m;
    this.add(this._model);
  }

  public OutOfWorld: OutOfWorldResponse = OutOfWorldResponse.Destroy;
  public Collide: any = null;

  get IsDestroyed(): boolean { return this._isDestroyed; }
  set IsDestroyed(b: boolean) { this._isDestroyed = b; }

  get Velocity(): Vector3 { return this._velocity; }
  set Velocity(val: Vector3) { this._velocity = val; }
  get Rotation(): Vector3 { return this._rotation; }
  set Rotation(val: Vector3) { this._rotation = val; }

  public get WorldPosition(): Vector3 {
    let v = new Vector3();
    this.getWorldPosition(v);
    return v;
  }

  public constructor() {
    super();
    g_physics.add(this);
  }

  public update(dt: number) {
    this.position.add(this.Velocity.clone().multiplyScalar(dt));
    let rdt = this.Rotation.clone().multiplyScalar(dt);
    this.rotation.x = (this.rotation.x + rdt.x) % Math.PI;
    this.rotation.y = (this.rotation.y + rdt.y) % Math.PI
    this.rotation.z = (this.rotation.z + rdt.z) % Math.PI
  }
}
//Ship class representing both player and enemy ship.
enum Direction { Left, Right, None }
class Ship extends PhysicsObject {

  private _movedLeft: boolean = false;
  private _movedRight: boolean = false;
  private _movedUp: boolean = false;
  private _movedDown: boolean = false;
  private _pitch: number = 0;
  private _pitchspd: number = Math.PI * 0.25;
  private _maxpitch: number = Math.PI * 0.15;

  private _strafeSpeed: number = 4;
  private _liftSpeed: number = 4;

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
    if (l_or_u) {
      return this.interp_bank(roll_or_pitch, startPress, startRelease, add, maxval, 1);
    }
    else if (r_or_d) {
      return this.interp_bank(roll_or_pitch, startPress, startRelease, add, maxval, -1);
    }
    else {
      return this.interp_bank(roll_or_pitch, startPress, startRelease, add, maxval, 0);
    }
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
    roll = this.smooth_bank(this._movedLeft, this._movedRight, { ref: this._roll }, this._rollPress, this._rollRelease, this._rollspd * dt, this._maxroll);
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


    // this.rotation.x = pitch;
  // this.rotation.z = roll;

    //reset movement
    this._movedDown = this._movedLeft = this._movedRight = this._movedUp = false;
  }
}
class PlayerShip extends Ship {
  private _arms: Array<Arm> = new Array<Arm>();
  public shootArms(): void {
    let n = new THREE.Vector3();
     player.getWorldDirection(n);
    n.negate();
    let b1 : Bullet = new Bullet(n);
    b1.position.copy(player.position.clone().sub(new THREE.Vector3(0.4,0,0)));
    
    let b2 : Bullet = new Bullet(n);
    b2.position.copy(player.position.clone().add(new THREE.Vector3(0.4,0,0)));

    
    // for (let i: number = 0; i < this._arms.length; i++) {
    //   if (this._arms[i]) {
    //     this._arms[i].shoot();
    //   }
    // }

    g_audio.play(Files.Audio.Shoot);
  }
  public constructor() {
    super();

    // let a1: Arm = new Arm();
    // a1.Pos.set(-0.5, -0.0, -0);//This is our cached positio POST rotation
    // a1.up = new Vector3(0, 0, 1);// This is important for LookAt
    // this.add(a1);
    // this._arms.push(a1);

    // let a2: Arm = new Arm();
    // a2.Pos.set(0.5, -0.0, -0);//This is our cached positio POST rotation
    // a2.up = new Vector3(0, 0, 1);// This is important for LookAt
    // this.add(a2);
    // this._arms.push(a2);
  }

  public aimArms(mouse: Mouse): void {
    for (let i: number = 0; i < this._arms.length; i++) {
      if (this._arms[i]) {
        //   this._arms[i].aim(mouse);
      }
    }
  }
  public aimLeft(p: Vector3) {
    if (this._arms.length > 0 && this._arms[0]) {
      this._arms[0].aim(p);
    }
  }
  public aimRight(p: Vector3) {
    if (this._arms.length > 1 && this._arms[1]) {
      this._arms[1].aim(p);
    }
  }
  public update(dt: number) {

    if (g_input.keyboard) {
      if (g_input.keyboard.a.down()) {
        player.moveLeft(dt);
      }
      if (g_input.keyboard.d.down()) {
        player.moveRight(dt);
      }
      if (g_input.keyboard.w.down()) {
        player.moveUp(dt);
      }
      if (g_input.keyboard.s.down()) {
        player.moveDown(dt);
      }
    }

    super.update(dt);
  }
}
class EnemyShip extends Ship {
  public constructor(model: THREE.Object3D) {
    super();
    if (model) {
      this.setModel(model);
    }
    else {
      //Error
      Globals.logError("Error loading enemy ship model. Default model created.");
      this.setModel(this.createDefaultGeo());
    }
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
class Bullet extends PhysicsObject {
  private _speed: number = 40;//.4;

  public constructor(direction : Vector3) {
    super();
    let b = g_models.getModel(Files.Model.Bullet);
    let b2 = b.clone();

    this.setModel(b2);
    // //Arm.  TODO: later we load this in
    // var geo = new THREE.BoxBufferGeometry(.2, .2, .4);
    // var mat = new THREE.MeshBasicMaterial({
    //   //map: this._texture,
    //   transparent: false,
    //   side: THREE.DoubleSide,
    //   color: 0x3FC073,
    // });
    // geo.computeBoundingBox();
    // let mesh: THREE.Mesh = new THREE.Mesh(geo, mat);
    // this.add(mesh);

    // let p: Vector3 = v3;//arm.AimNormal;// new Vector3();
    // //arm.getWorldDirection(p);
     this.Velocity.copy(direction.multiplyScalar(this._speed));

    // //arm.getWorldPosition(p);
    // //this.position.copy(p);



    // this.rotate.set(arm.rotation.x, arm.rotation.y, arm.rotation.z);
  }

}
class Arm extends THREE.Object3D {
  private _points: THREE.Points = null;
  private _armMesh: THREE.Mesh = null;
  public Pos: Vector3 = new Vector3();

  private _aimpoint: Vector3 = new Vector3();
  get AimPoint(): Vector3 { return this._aimpoint; }
  private _aimnormal: Vector3 = new Vector3();
  get AimNormal(): Vector3 { return this._aimnormal; }
  public constructor() {
    super();
    this.createMeshes();
  }
  public getP0(): Vector3 {
    return this.getPoint(0);
  }
  public getP1(): Vector3 {
    return this.getPoint(1);
  }
  public shoot() {
   // let b: Bullet = new Bullet(this);
  }
  public aim(at: Vector3) {
    this._aimpoint = at;
    //Attempt to rotate FIRST then trnaslate
    this.position.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
    this.updateMatrix();
    this.position.set(this.Pos.x, this.Pos.y, this.Pos.z);
    this.updateMatrix();

    let wp = new Vector3();
    this.getWorldPosition(wp);

    let world_pt = wp;//wp.clone().add(this.getP0());

    this._aimnormal = at.clone().sub(world_pt);
    this._aimnormal.normalize();
    var left = this._aimnormal.clone().cross(this.up).normalize();

    var amt = Math.acos(this.up.dot(this._aimnormal));

    this.rotateOnAxis(left, amt);
  }
  private getPoint(idx: number): Vector3 {
    if (idx <= 1) {
      if (this._points) {
        if (this._points.geometry) {
          let g: THREE.Geometry = this._points.geometry as THREE.Geometry;
          if (g && g.vertices && g.vertices.length >= 2) {
            return g.vertices[idx];
          }
        }
      }
    }
    return null;
  }
  private createMeshes(): void {
    var xy = 0.02;
    var z = 1.7;
    //create Arms

    //https://threejs.org/examples/?q=points#webgl_custom_attributes_points
    // Contact points for the mesh.
    let p0: Vector3 = new Vector3(0, 0, -z / 2);
    let p1: Vector3 = new Vector3(0, 0, z / 2);
    let points_geo: THREE.Geometry = new THREE.Geometry();
    points_geo.vertices.push(p0);
    points_geo.vertices.push(p1);
    var pointMaterial = new THREE.PointsMaterial({ color: 0xFF0000, size: 0.1 });
    this._points = new THREE.Points(points_geo, pointMaterial);
    this
    this.add(this._points);

    //Arm.  TODO: later we load this in
    var arm_geo = new THREE.BoxBufferGeometry(xy, xy, z);
    arm_geo.computeBoundingBox(); // for hit area
    var arm_mat = new THREE.MeshBasicMaterial({
      //map: this._texture,
      transparent: false,
      side: THREE.DoubleSide,
      color: 0xF0FFF0,
    });
    this._armMesh = new THREE.Mesh(arm_geo, arm_mat);
    this.add(this._armMesh);

    //move pivots
    //   this._armMesh.translateZ(z / 2);
    //   this._points.translateZ(z / 2);

    this._points.visible = Globals.isDebug();//Not sure if this will actually stop update the points.
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
  private _listener: THREE.AudioListener = new THREE.AudioListener();
  private _audioLoader: THREE.AudioLoader = new THREE.AudioLoader();
  private _cache: Dictionary<THREE.Audio> = {};

  public constructor() {
    this._listener = new THREE.AudioListener();
    this._audioLoader = new THREE.AudioLoader();
    camera.add(this._listener);
  }
  public play(file: Files.Audio, loop: boolean = false) {
    let szfile: string = './dat/audio/' + file;

    if (szfile in this._cache) {
      this._cache[szfile].setLoop(loop);
      this._cache[szfile].play();
    }
    else {
      this.loadSound(szfile, loop);
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
    this.loadModel(Files.Model.Player_Ship, ['Player_Ship', 'Player_Seat'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let player_ship: THREE.Object3D = objs['Player_Ship'];
        player_ship.scale.set(.6, .6, .6);
        player.setModel(player_ship);
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
    this.loadModel(Files.Model.Bullet, ['Bullet'], function (success: boolean, objs: any, gltf: any) {
      if (success) {
        let a: THREE.Object3D = objs['Bullet'];
        a.scale.set(.6, .6, .6);
        let b =a as THREE.Mesh;
        if(b){
          let m = b.material as THREE.Material;
          if(m){
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


let g_input: Input = null;
let light: THREE.PointLight = new THREE.PointLight(0xffff99, 1, 100);
let camera: THREE.PerspectiveCamera = null;

let g_physics: PhysicsManager = null;

let renderer: THREE.WebGLRenderer = null;
let gui: dat.GUI = null;
let score: TextCanvas = null;
let axis: THREE.AxesHelper = null;
let user: THREE.Group = null;
let shipTimer: Timer = null;
let player: PlayerShip = null;
let g_audio: AudioManager = null;
let g_models: ModelManager = null;

// https://threejsfundamentals.org/threejs/lessons/threejs-custom-geometry.html
// https://threejsfundamentals.org/threejs/lessons/threejs-webvr.html
// https://fossies.org/linux/three.js/examples/webvr_rollercoaster.html
$(document).ready(function () {

  //Check that vr flag is enabled.
  const url_params = (new URL("" + document.location)).searchParams;
  let debug: boolean = url_params.get('debug') === 'true';
  let showConsole: boolean = url_params.get('console') === 'true';
  Globals.setDebug(debug, showConsole);

  createRenderer();

  window.addEventListener('resize', function () {
    //This should cause the resize method to fire.
    $("#page_canvas").width(window.innerWidth);
    $("#page_canvas").height(window.innerHeight);

  }, false);


});
function createRenderer(): void {
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

  g_physics = new PhysicsManager();

  g_input = new Input();

  createScene();
  createCamera();

  g_audio = new AudioManager();

  makeGui();

  g_models = new ModelManager();

  createUIText();

  shipTimer = new Timer(3000, function () {
    let nShips = Random.bool() ? 2 : 1;//(Random.bool() ? 2 : (Random.bool() ? 4 : 6));
    for (let i = 0; i < nShips; ++i) {
      //Create enemy ship and 
      let m: THREE.Mesh = g_models.getModel(Files.Model.Enemy_Ship) as THREE.Mesh;
      if (m) {
        let mclone: THREE.Mesh = m.clone();
        let ship: EnemyShip = new EnemyShip(mclone);
        ship.position.copy(player.position.clone().add(new Vector3(Random.float(-20, 20), Random.float(-13, 23), -60)));
        ship.Velocity.set(0, 0, 1.04 + Random.float(0.7, 9.05));
        ship.Rotation.set(0,0,Random.float(0,1) > 0.7 ? Random.float(-3,3) : 0);
      }

      //scene.add(ship);
    }
  });

  if (Globals.isDebug()) {
    axis = new THREE.AxesHelper(1);
    g_physics.Scene.add(axis);

  }

  renderLoop();
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

  player = new PlayerShip();
  player.add(user);
  player.up = new Vector3(0, 1, 0);
  player.position.set(0, 0, 10);
  player.Velocity.set(0, 0, -1);
  player.OutOfWorld = OutOfWorldResponse.None;
  player.rotateY(0);
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
      score.update(camera, user);
    }
    if (shipTimer) {
      shipTimer.update(delta);
    }
    if (g_physics) {
      g_physics.update(delta);
    }
    if (axis) {
      axis.position.set(player.position.x - 3, player.position.y - 3, player.position.z - 10);
    }
    if (light) {
      light.position.copy(player.position.clone().add(new Vector3(10, 10, -10)));
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

  g_physics.Scene.add(light);
}


function createUIText(): void {

  //Create Console
  Globals.setConsole3D(g_physics.Scene, player);

  //Test Score
  let opts: TextCanvasOptions = new TextCanvasOptions();
  opts.Lineheight = opts.Fontsize = Globals.userIsInVR() ? 300 : 100;
  opts.Text = "Score: 0";
  opts.Width = Globals.userIsInVR() ? 0.3 : 0.1;
  opts.Height = 0.1;
  opts.AutoHeight = false;
  score = new TextCanvas(opts);
  score.showWireframe(Globals.isDebug());
  //score.resetTransform();
  score.AlignToScreen = true;
  score.ScreenX = 0.0;
  score.ScreenY = 0.9;

  player.add(score);
  //Globals.logInfo("hi1\nasdf\nhi2\n")
}

function makeGui() {
  gui = new dat.GUI();
  //TODO: 
  //this is the debug GUI
}