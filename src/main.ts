//import * as g from "./G";
import * as $ from "jquery";
//import {gl} from "./G";
//import {_GLTFLoader} from 'three-gltf-loader';
import * as THREE from 'three';
import {Scene, PerspectiveCamera, Mesh
     , BoxGeometry,
     MeshNormalMaterial,
     PointLight,
    } from "three";

import * as GLTFLoader_ from 'three/examples/jsm/loaders/GLTFLoader';
// class MyGame implements g.IGame {
//     init() : void {
 
//     }
//     update() : void {

//     }
//     quit() : void {
 
//     }
//     draw(shader:  WebGLShader) : void{

//     }
// }     
 
//
// game create.
//
$(document).ready(function () {
    let scene : Scene = new Scene();
    let camera : PerspectiveCamera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    let renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0xffffff, 1 );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );    
 

   // let geometry : BoxGeometry = new BoxGeometry( 1, 1, 1 );
   // let material : MeshNormalMaterial = new MeshNormalMaterial( { color: 0x00ff00 } );
    //let cube : Mesh = new Mesh( geometry, material );
    //scene.add( cube );
    
    let light : PointLight = new PointLight( 0xffff99, 1, 100 );
    light.position.set( 20, 20, 20 );
    scene.add( light );


    camera.position.z = 5;

    let monkey : Scene = null;

    let loader = new GLTFLoader_.GLTFLoader();
    loader.load(
        // resource URL
        'test.glb',
        // called when the resource is loaded
        function ( gltf : any ) {
            scene.add( gltf.scene );
            monkey = gltf.scene;
            monkey.position.set(0,0,0);

            gltf.animations; // Array<THREE.AnimationClip>
            gltf.scene; // THREE.Scene
            gltf.scenes; // Array<THREE.Scene>
            gltf.cameras; // Array<THREE.Camera>
            gltf.asset; // Object
        },
        // called while loading is progressing
        function ( xhr : any ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error : any ) {
            console.log( 'An error happened' );
        }
    );
    let x : number = 0; 
    let z : number = 0; 
    let y : number = 0; 

    //let monkey_x : number =0;

    var animate = function () {
        requestAnimationFrame( animate );

        x = (x+0.02) % 6.28;
        z = (z+0.02) % 6.28;
        y = (y+0.30) % 6.28;

        let sinx : number = Math.cos(x);
        let sinz : number = Math.sin(z) ;
        let siny : number = Math.sin(y);

        light.position.set( sinx, siny, sinz);

        if(monkey!=null){
           // monkey_x = (monkey_x - 0.02) % 6.28;
            //let monkey_sinx = Math.cos(monkey_x);
            //let monkey_sinz = Math.sin(monkey_x);
            monkey.rotation.x += 0.01;
            monkey.rotation.y += 0.01;
           // monkey.position.set(monkey_sinx,0,monkey_sinz);
        }


     //   cube.rotation.x += 0.01;
      //  cube.rotation.y += 0.01;

        renderer.render( scene, camera );
    };

    animate();

  //  let e: g.Engine = new g.Engine(new MyGame());
   // e.run();
});

