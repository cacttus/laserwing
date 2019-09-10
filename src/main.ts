import * as $ from "jquery";
import * as THREE from 'three';
import * as Physijs from 'physijs-webpack';
import { Vector3, Vector2, ShapeUtils, PerspectiveCamera, Box3, Geometry } from 'three';

import { WEBVR } from 'three/examples/jsm/vr/WebVR.js';
import * as GLTFLoader_ from 'three/examples/jsm/loaders/GLTFLoader';
import * as dat from 'dat.gui';
import * as OrbitControls from 'three-orbitcontrols';

import { VRInputManager, VRGamepad, VRButton } from './gamepad';
import { TextCanvas, TextCanvasOptions } from './TextCanvas';
import * as Globals from './globals';
import * as Mersenne from 'mersenne-twister';//https://github.com/boo1ean/mersenne-twister

let g_physics: PhysicsManager = null;

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
class Mouse extends Vector3 {
    public moved: boolean = false;
}
class PhysicsManager {
    private _objects: Array<PhysicsObject> = new Array<PhysicsObject>();
    public get Objects(): Array<PhysicsObject> { return this._objects; }
    private toDestroy: Array<PhysicsObject> = new Array<PhysicsObject>();

    public Scene : THREE.Scene = null; //= new THREE.Scene();


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
            if (ob.OutOfWorld === OutOfWorldResponse.Destroy && ob.WorldPosition.distanceToSquared(player.WorldPosition) >= (camera.far*camera.far)) {
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
    get Box(): Box3 { return this._mesh.geometry.boundingBox; }
    private _velocity: Vector3 = new Vector3();
    private _mesh: THREE.Mesh = null;
    private _isDestroyed: boolean = false;

    public OutOfWorld: OutOfWorldResponse = OutOfWorldResponse.Destroy;
    public Collide: any = null;

    get IsDestroyed(): boolean { return this._isDestroyed; }
    set IsDestroyed(b: boolean) { this._isDestroyed = b; }

    get Velocity(): Vector3 { return this._velocity; }
    set Velocity(val: Vector3) { this._velocity = val; }

    public get WorldPosition(): Vector3{
        let v = new Vector3();
        this.getWorldPosition(v);
        return v;
    }

    public constructor() {
        super();
        g_physics.add(this);
    }
    protected constructMesh(g: THREE.BufferGeometry, m: THREE.Material) {
        this._mesh = new THREE.Mesh(g, m);
        this.add(this._mesh);
        g.computeBoundingBox();
    }
    public update(dt: number) {
        this.position.add(this.Velocity.clone().multiplyScalar(dt));
    }
}
class Ship extends PhysicsObject {
    private _movedLeft : boolean = false;
    private _movedRight : boolean = false;
    private _movedUp : boolean = false;
    private _movedDown : boolean = false;
    private _pitch : number = 0;
    private _pitchspd : number = Math.PI*0.25;
   // private _pitchspd_delta : number = Math.PI*0.025;
    private _maxpitch : number = Math.PI*0.15;
    
    private _roll : number = 0;
    private _rollspd : number = Math.PI*0.25;
    //private _rollspd_delta : number = Math.PI*0.05;
    private _maxroll : number = Math.PI*0.25;

    private cosineInterpolate( y1 : number, y2 : number, mu : number)
     {
        //http://paulbourke.net/miscellaneous/interpolation/
        let   mu2 : number =0;
        mu2 = (1-Math.cos(mu*Math.PI))*0.5;
        return(y1*(1-mu2)+y2*mu2);
     }

    public constructor() {
        super();
        this.createGeo();
    }
    private createGeo(): void {
        var geo = new THREE.BoxBufferGeometry(.3, .03, .2);
        geo.computeBoundingBox(); // for hit area
        var mat = new THREE.MeshBasicMaterial({
            //map: this._texture,
            transparent: false,
            side: THREE.DoubleSide,
            color: 0x9FC013,
        });

        this.constructMesh(geo, mat);
    }
    public moveLeft(dt: number) {
        this.position.x -= 4 * dt;
        this._movedLeft = true;
    }
    public moveRight(dt: number) {
        this.position.x += 4 * dt;
        this._movedRight = true;
    }
    public moveUp(dt: number) {
        this.position.y += 4 * dt;
        this._movedUp = true;
    }
    public moveDown(dt: number) {
        this.position.y -= 4 * dt;
        this._movedDown = true;
    }
    public update(dt:number){
        super.update(dt);
        let roll : number=0;
        let pitch:number=0;
        if(this._movedLeft){
            this._roll = Math.min(this._roll + this._rollspd * dt, this._maxroll);
            roll = this.cosineInterpolate(0,this._maxroll, this._roll);
        }
        else if(this._movedRight){
            this._roll = Math.max(this._roll - this._rollspd * dt, -this._maxroll);
            roll = this.cosineInterpolate(0,-this._maxroll, this._roll);
        }
        else{
            if(this._roll>0){
                this._roll = Math.max(this._roll - this._rollspd * dt, 0);
              //  if(this._roll < 0) { this._roll = 0;}
                roll = this.cosineInterpolate(0,this._maxroll, this._roll);
            }
            else{
                this._roll = Math.min(this._roll + this._rollspd * dt, 0);
               // if(this._roll > 0) { this._roll = 0;}
                roll = this.cosineInterpolate(0,-this._maxroll, this._roll);
            }
        }
        if(this._movedUp){
            this._pitch = Math.min(this._pitch + this._pitchspd * dt, this._maxpitch);
            pitch  = this.cosineInterpolate(0,this._maxpitch, this._pitch);
        }
        else if(this._movedDown){
            this._pitch = Math.max(this._pitch - this._pitchspd * dt, -this._maxpitch);
            pitch = this.cosineInterpolate(0,-this._maxpitch, this._pitch);
        }
        else{
            if(this._pitch>0){
                this._pitch = Math.max(this._pitch - this._pitchspd * dt, 0);
              //  if(this._pitch < 0) { this._pitch = 0;}
                pitch = this.cosineInterpolate(0,this._maxpitch, this._pitch);
            }
            else{
                this._pitch = Math.min(this._pitch + this._pitchspd * dt, 0);
              //  if(this._pitch > 0) { this._pitch = 0;}
                pitch = this.cosineInterpolate(0,-this._maxpitch, this._pitch);
            }
        }

        this.rotation.x = pitch;
        this.rotation.z = roll;

        //Reset Movement
        this._movedDown = this._movedLeft = this._movedRight = this._movedUp = false;
    }
}
class PlayerShip extends Ship {
    private _arms: Array<Arm> = new Array<Arm>();
    public shootArms(): void {
        for (let i: number = 0; i < this._arms.length; i++) {
            if (this._arms[i]) {
                this._arms[i].shoot();
            }
        }
    }
    public constructor() {
        super();

        let a1: Arm = new Arm();
        a1.Pos.set(-0.5, -0.0, -0);//This is our cached positio POST rotation
        a1.up = new Vector3(0, 0, 1);// This is important for LookAt
        this.add(a1);
        this._arms.push(a1);

        let a2: Arm = new Arm();
        a2.Pos.set(0.5, -0.0, -0);//This is our cached positio POST rotation
        a2.up = new Vector3(0, 0, 1);// This is important for LookAt
        this.add(a2);
        this._arms.push(a2);
    }

    public aimArms(mouse: Mouse): void {
        for (let i: number = 0; i < this._arms.length; i++) {
            if (this._arms[i]) {
                this._arms[i].aim(mouse);
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
}
class Bullet extends PhysicsObject {
    private _speed: number = 40;//.4;

    public constructor(arm: Arm) {
        super();
        //Arm.  TODO: later we load this in
        var geo = new THREE.BoxBufferGeometry(.2, .2, .4);
        var mat = new THREE.MeshBasicMaterial({
            //map: this._texture,
            transparent: false,
            side: THREE.DoubleSide,
            color: 0x3FC073,
        });
        this.constructMesh(geo, mat);

        let p: Vector3 = arm.AimNormal;// new Vector3();
        //arm.getWorldDirection(p);
        this.Velocity.copy(p.multiplyScalar(this._speed));

        arm.getWorldPosition(p);
        this.position.copy(p);

        this.rotation.set(arm.rotation.x, arm.rotation.y, arm.rotation.z);
    }

}
class Arm extends THREE.Object3D {
    private _points: THREE.Points = null;
    private _armMesh: THREE.Mesh = null;
    public Pos: Vector3 = new Vector3();
    
    private _aimpoint : Vector3 = new Vector3();
    get AimPoint() : Vector3 { return this._aimpoint; }
    private _aimnormal : Vector3 = new Vector3();
    get AimNormal() : Vector3 { return this._aimnormal; }
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
        let b: Bullet = new Bullet(this);
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
    private static _random: Mersenne = new Mersenne();
    public static float(min: number, max: number) {
        let n = this._random.random_incl();
        let n2 = min + (max - min) * n;
        return n2;
    }
    public static bool() {
        return this._random.random_incl() > 0.5;
    }
}
class Starfield extends THREE.Object3D {
    public constructor(){               //rtop rbottom height rsegments hsegments openended
        super();

        var geo = new THREE.CylinderGeometry( 20, 20, 100, 32, 1, true );
        var texture = THREE.ImageUtils.loadTexture('./dat/img/starfield_1.png');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10,3);
        var mat = new THREE.MeshLambertMaterial({map:texture, side:THREE.DoubleSide, depthTest:false});
        var mesh = new THREE.Mesh( geo, mat );
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.position.set(0,0,0);

        this.matrixAutoUpdate=false;

        this.add(mesh);
//https://discourse.threejs.org/t/always-render-mesh-on-top-of-another/120/4
        this.renderOrder = 0;//Render this first.
    }
    private _z : number =0;
    public update(dt : number){
        this._z = (this._z + Math.PI * dt * 0.15) % (Math.PI*2);
        this.rotation.x = Math.PI * 0.5;
        this.updateMatrix();
        this.rotation.y = this._z;
        this.updateMatrix();
    }
}
class RenderManager {
    
}

let mouse: Mouse = new Mouse();
let light: THREE.PointLight = new THREE.PointLight(0xffff99, 1, 100);
//let monkey: THREE.Scene = null;
let camera: THREE.PerspectiveCamera = null;


let renderer: THREE.WebGLRenderer = null;
let inputManager: VRInputManager = null;
let gui: dat.GUI = null;
let score: TextCanvas = null;
let axis: THREE.AxesHelper = null;
let user: THREE.Group = null;
//let bullets: Array<Bullet> = new Array<Bullet>();
let shipTimer: Timer = null;
let player: PlayerShip = null;
//let starfield : Starfield = null;

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

    createInput();
    createScene();
    createCamera();
    makeGui();
    loadModels();
    createUIText();

    shipTimer = new Timer(1000, function () {
        let nShips = Random.bool() ? 2 : (Random.bool() ? 2 : (Random.bool() ? 4 : 6));
        for (let i = 0; i < nShips; ++i) {
            //Create enemy ship and 
            let ship: Ship = new Ship();
            ship.position.copy(player.position.clone().add(new Vector3(Random.float(-20, 20), Random.float(-13, 23), -30)));
            ship.Velocity.set(0, 0, 1.04 + Random.float(0.7, 9.05));
            ship.scale.set(Random.float(0.8,5),Random.float(0.8,2),Random.float(0.8,2));
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
    //user.lookAt(new Vector3(0, 0, 0));
    user.rotateY( 0);//lookAt(new Vector3(0, 0, 0));

    player = new PlayerShip();
    player.add(user);
    player.up = new Vector3(0,1,0);
    player.position.set(0, 0, 10);
    player.Velocity.set(0, 0, -1);
    player.OutOfWorld = OutOfWorldResponse.None;
    player.rotateY( 0);//lookAt(new Vector3(0, 0, 0));
    /*
    //In VR we actually add the camera to a group since user actually moves the camera(s) reltaive to origin
    user = new THREE.Group()
    user.add(camera);
    user.position.set(0, 0.02, 0 - 0.12);
    user.lookAt(new Vector3(0, 0, 0));

    player = new PlayerShip();
    player.add(user);
    player.position.set(0, 0, 10);
    player.Velocity.set(0, 0, -1.);
    player.OutOfWorld = OutOfWorldResponse.None;
    //scene.add(player);
    */
    //scene.add(player);
}

let mousePoint: PointGeo = null;

let key_a: boolean = false;
let key_w: boolean = false;
let key_s: boolean = false;
let key_d: boolean = false;
function createInput() {

    //This will be unnecessary
    window.addEventListener("keydown", function (e) {
        //w
        if (e.keyCode === 87) { key_w = true; }
        //s
        if (e.keyCode === 83) { key_s = true; }
        //a
        if (e.keyCode === 65) { key_a = true; }
        //d
        if (e.keyCode === 68) { key_d = true; }
    });
    window.addEventListener("keyup", function (e) {
        //w
        if (e.keyCode === 87) { key_w = false; }
        //s
        if (e.keyCode === 83) { key_s = false; }
        //a
        if (e.keyCode === 65) { key_a = false; }
        //d
        if (e.keyCode === 68) { key_d = false; }
    });
    document.addEventListener('mousedown', function (e) {
        player.shootArms();
    });
    //var controls = new OrbitControls.default();
    document.addEventListener('mousemove', function (e) {

        if (Globals.userIsInVR()) {
            //Let the VR input manager handle 
        }
        else {
            //animate arms based on cursor position.
            e.preventDefault();
            if (!mouse.moved) {
                mouse.moved = true;
            }

            //This is how far into the world we project mouse from screen
            let project_dist: number = 10;

            let f: Frustum = new Frustum(camera);

            //getMousePos
            //https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
            const canvas = renderer.domElement;
            let rect = canvas.getBoundingClientRect();
            let scaleX = canvas.width / rect.width;   // relationship bitmap vs. element for X
            let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y
            let rel_x = (e.clientX - rect.left) * scaleX;
            let rel_y = (e.clientY - rect.top) * scaleY;
            
//            let mouse_pos = f.project(e.clientX, window.innerWidth, e.clientY, window.innerHeight, project_dist);
            let mouse_pos = f.project(rel_x, canvas.width, rel_y, canvas.height, project_dist);


            mouse.copy(mouse_pos);

            if (Globals.isDebug()) {
                if (mousePoint == null) {
                    mousePoint = new PointGeo();
                    g_physics.Scene.add(mousePoint);
                }
                mousePoint.position.set(0, 0, 0);
                mousePoint.rotation.set(0, 0, 0);
                mousePoint.updateMatrix();
                mousePoint.position.set(mouse.x, mouse.y, mouse.z);
                mousePoint.updateMatrix();
            }
            player.aimArms(mouse);
        }
    }, false);

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

    inputManager = new VRInputManager(addController, removeController);
    inputManager.Verbose = Globals.isDebug();

}
function animateArms(hand0_or_mouse: Vector3, hand1: Vector3) {

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

        //animateMonkey();

        Globals.updateGlobals(camera, user);
        score.update(camera, user);
        shipTimer.update(delta);

        if (key_a) {
            player.moveLeft(delta);
        }
        if (key_d) {
            player.moveRight(delta);
        }
        if (key_w) {
            player.moveUp(delta);
        }
        if (key_s) {
            player.moveDown(delta);
        }

        g_physics.update(delta);

        //starfield.update(delta);

        light.position.copy(player.position.clone().add(new Vector3(10, 10, 10)));

        renderer.render(g_physics.Scene, camera);
    };
    renderer.setAnimationLoop(render);
}

// let ax: number = 0;
// let az: number = 0;
// let ay: number = 0;
// function animateMonkey() {
//     ax = (ax + 0.02) % 6.28;
//     az = (az + 0.02) % 6.28;
//     ay = (ay + 0.30) % 6.28;

//     let sinx: number = Math.cos(ax);
//     let sinz: number = Math.sin(az);
//     let siny: number = Math.sin(ay);

//     if (monkey != null) {
//         monkey.position.x = 0;
//         monkey.position.y = 1.6;
//         monkey.position.z = -2;
//         monkey.rotation.y += 0.01;
//     }
// }
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

let player_ship_model : THREE.Object3D = null;

function loadModels(): void {
    let loader = new GLTFLoader_.GLTFLoader();
    loader.load(
        // resource URL
        './dat/model/player_ship.glb',
        // called when the resource is loaded
        function (gltf: any) {
            //monkey = gltf.scene;
            
            //monkey.position.set(0, 0, 0);
            //monkey.background = new THREE.Color(0xFF000F);
            let obj = gltf.scene.getObjectByName('player_ship');
            if(obj){
                player_ship_model = obj;

            player_ship_model.scale.set(0.6,0.6,0.6);
           // player_ship_model.translateY(-0.3);
           // player_ship_model.translateZ(-0.3);
            //g_physics.Scene.add(player_ship_model);
            player.add(player_ship_model);
        }
        else{
            Globals.logError("Could not find model");
        }
            
            //gltf.animations; // Array<THREE.AnimationClip>
            //gltf.scene; // THREE.Scene
            //gltf.scenes; // Array<THREE.Scene>
            //gltf.cameras; // Array<THREE.Camera>
            //gltf.asset; // Object
        },
        // called while loading is progressing
        function (xhr: any) {
            Globals.logInfo('monkey ' + (xhr.loaded / xhr.total * 100).toFixed(2) + '% loaded.');
        },
        // called when loading has errors
        function (error: any) {
            Globals.logInfo('An error happened.' + error);
        }
    );

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