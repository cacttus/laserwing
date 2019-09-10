import * as THREE from 'three';
import * as Globals from './globals';
import { PolarGridHelper } from 'three';

export class VRButton {
  public name: string; //'button_'+ i,
  public value: any; // button.value,
  public isTouched: boolean = false; //button.touched,
  public isPressed: boolean = false; //button.pressed,
  public isPrimary: boolean = false;;
}

// class VRControllerSpec {
//   public _name: string = "";
//   public _axis_name: string = "";
//   public _axis_indexes: number[] = null;
//   public _primaryButtonName: string = "";
//   public _buttons;
// }


export class VRInputManager {
  public _gamepads: Array<VRGamepad> = new Array<VRGamepad>();
  private _initMsgs: boolean = false;
  public Verbose = false;

  public static supported_controllers: any = {
    //////////////////
    //              //
    //   Daydream   //
    //              //
    //////////////////
    'Daydream Controller': {

      style: 'daydream',


      //  THUMBPAD
      //  Both a 2D trackpad and a button with both touch and press. 
      //  The Y-axis is “Regular”.
      //
      //              Top: Y = -1
      //                   ↑
      //    Left: X = -1 ←─┼─→ Right: X = +1
      //                   ↓
      //           Bottom: Y = +1

      axes: [{ name: 'thumbpad', indexes: [0, 1] }],
      buttons: ['thumbpad'],
      primary: 'thumbpad'
    },
    //////////////
    //          //
    //   Vive   //
    //          //
    //////////////
    'OpenVR Gamepad': {
      style: 'vive',
      //  THUMBPAD
      //  Both a 2D trackpad and a button. Its Y-axis is “Goofy” -- in
      //  contrast to Daydream, Oculus, Microsoft, etc.
      //
      //              Top: Y = +1
      //                   ↑
      //    Left: X = -1 ←─┼─→ Right: X = +1
      //                   ↓
      //           Bottom: Y = -1
      //
      //  Vive is the only goofy-footed y-axis in our support lineup so to
      //  make life easier on you WE WILL INVERT ITS AXIS in the code above.
      //  This way YOU don’t have to worry about it. 

      axes: [{ name: 'thumbpad', indexes: [0, 1] }],
      buttons: [


        //  THUMBPAD
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'thumbpad',


        //  TRIGGER
        //  Has very interesting and distinct behavior on Chromium.
        //  The threshold for releasing a pressed state is higher during
        //  engagement and lower during release.
        //
        //  Chromium
        //  if( value >  0.00 ) isTouched = true else isTouched = false
        //  if( value >= 0.55 ) isPressed = true   UPON ENGAGING
        //  if( value <  0.45 ) isPressed = false  UPON RELEASING
        //
        //  Firefox
        //  if( value >= 0.10 ) isTouched = isPressed = true
        //  if( value <  0.10 ) isTouched = isPressed = false
        //  --------------------------------------------------------------
        //  value:     Analog 0 to 1.
        //  isTouched: Duplicates isPressed in FF, independent in Chrome.
        //  isPressed: Corresponds to value.

        'trigger',


        //  GRIP
        //  Each Vive controller has two grip buttons, one on the left and
        //  one on the right. They are not distinguishable -- pressing 
        //  either one will register as a press with no knowledge of which
        //  one was pressed.
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'grip',


        //  MENU
        //  The menu button is the tiny button above the thumbpad -- NOT
        //  the one below it.
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'menu'
      ],
      primary: 'trigger'
    },
    ////////////////
    //            //
    //   Oculus   //
    //            //
    ////////////////
    'Oculus Touch (Right)': {
      //  Previously I’d named the style “Rift” and referred to this as a 
      // “Rift” in the comments because it’s so much easier to write and to 
      //  say than “Oculus”. Lazy, right? But deep down in your dark heart 
      //  I know you agree with me. I’ve changed it all to “oculus” now 
      //  because that’s what both the headset and the controllers report 
      //  themselves as. There’s no mention of “Rift” in those ID strings at
      //  all. I felt in the end consistency was better than ease.

      style: 'oculus',


      //  THUMBSTICK
      //  Oculus’s thumbstick has axes values and is also a button.
      //  The Y-axis is “Regular”.
      //
      //              Top: Y = -1
      //                   ↑
      //    Left: X = -1 ←─┼─→ Right: X = +1
      //                   ↓
      //           Bottom: Y = +1

      axes: [{ name: 'thumbstick', indexes: [0, 1] }],
      buttons: [


        //  THUMBSTICK
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'thumbstick',


        //  TRIGGER
        //  Oculus’s trigger in Chromium is far more fire-happy than 
        //  Vive’s. Compare these thresholds to Vive’s trigger. 
        //
        //  Chromium
        //  if( value >  0.0 ) isTouched = true else isTouched = false
        //  if( value >= 0.1 ) isPressed = true else isPressed = false
        //
        //  Firefox
        //  if( value >= 0.1 ) isTouched = isPressed = true
        //  if( value <  0.1 ) isTouched = isPressed = false
        //  --------------------------------------------------------------
        //  value:     Analog 0 to 1.
        //  isTouched: Duplicates isPressed in FF, independent in Chrome.
        //  isPressed: Corresponds to value.

        'trigger',


        //  GRIP
        //  Oculus’s grip button follows the exact same press thresholds
        //  as its trigger.

        'grip',


        //  A B X Y
        //  Oculus has two old-school video game buttons, A and B. (On the
        //  left-hand controller these are X and Y.)
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'A', 'B',


        //  THUMBREST
        //  Oculus has an inert base “button” that’s really just a resting
        //  place for your thumb. It does NOT report press.
        //  --------------------------------------------------------------
        //  value:     Always 0.
        //  isTouched: YES has real touch detection.
        //  isPressed: N/A.

        'thumbrest'
      ],
      primary: 'trigger'
    },
    'Oculus Touch (Left)': {
      style: 'oculus',
      axes: [{ name: 'thumbstick', indexes: [0, 1] }],
      buttons: [

        'thumbstick',
        'trigger',
        'grip',
        'X', 'Y',
        'thumbrest'
      ],
      primary: 'trigger'
    },
    'Oculus Go Controller': {
      style: 'oculus',


      //  THUMBPAD
      //  Oculus Go’s thumbpad has axes values and is also a button.
      //  The Y-axis is “Regular”.
      //
      //              Top: Y = -1
      //                   ↑
      //    Left: X = -1 ←─┼─→ Right: X = +1
      //                   ↓
      //           Bottom: Y = +1

      axes: [{ name: 'thumbpad', indexes: [0, 1] }],
      buttons: [


        //  THUMBPAD
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'thumbpad',


        //  TRIGGER
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'trigger'
      ],
      primary: 'trigger'
    },
    ///////////////////
    //               //
    //   Microsoft   //
    //               //
    ///////////////////
    //  This is the first Gamepad ID setup we’ve come across that forced us
    //  to loop through the supported object’s keys and compare values using
    //  startsWith(), instead of just accessing directly like so:
    //  supported = THREE.VRController.supported[ gamepad.id ].
    //  You can read all the details about the unqiue identifier suffix here:
    //  https://github.com/stewdio/THREE.VRController/issues/8
    'Spatial Controller (Spatial Interaction Source)': {
      //  It’s hard to know what to call these controllers. They report as
      // “Spatial Controllers” but are branded as “Motion Controllers”
      //  and they’re for “Windows Mixed Reality” devices... 
      // “Microsoft Windows Mixed Reality Spatial Motion Controller”?
      //  Their team prefers “Windows motion controllers”. But for our style
      //  property string we want pith -- a single short word that makes it
      //  easy to distinguish from Oculus, Vive, etc. So we’ll go with 
      // “microsoft” as in “this is a controller in the style of Microsoft”.
      //
      //  NOTE: Currently Windows Mixed Reality devices only function in 
      //  Microsoft Edge on latest builds of Windows 10.

      style: 'microsoft',
      axes: [


        //  THUMBSTICK
        //  The thumbstick is super twitchy, seems to fire quite a bit on
        //  its own. Its Y-axis is “Regular”.
        //
        //              Top: Y = -1
        //                   ↑
        //    Left: X = -1 ←─┼─→ Right: X = +1
        //                   ↓
        //           Bottom: Y = +1

        { name: 'thumbstick', indexes: [0, 1] },


        //  THUMBPAD
        //  Operates exactly the same as the thumbstick but without the
        //  extra twitchiness.

        { name: 'thumbpad', indexes: [2, 3] }
      ],
      buttons: [


        //  THUMBSTICK
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'thumbstick',


        //  TRIGGER
        //  Its physical range of motion noticably exceeds the range of
        //  values reported. For example when engaging you can continue
        //  to squueze beyond when the value reports 1. And when 
        //  releasing you will reach value === 0 before the trigger is 
        //  completely released. The value property dictates touch and
        //  press states as follows:
        //
        //  Upon engaging
        //  if( value >= 0.00 && value < 0.10 ) NO VALUES REPORTED AT ALL!
        //  if( value >= 0.10 ) isTouched = true
        //  if( value >= 0.12 ) isPressed = true
        //
        //  Upon releasing
        //  if( value <  0.12 ) isPressed = false
        //  if( value == 0.00 ) isTouched = false
        //  --------------------------------------------------------------
        //  value:     Analog 0 to 1.
        //  isTouched: Simulated, corresponds to value.
        //  isPressed: Corresponds to value.

        'trigger',


        //  GRIP
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'grip',


        //  MENU
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'menu',


        //  THUMBPAD
        //  This is the only button that has actual touch detection.
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'thumbpad'
      ],
      primary: 'trigger'
    }
  };

  public AddedGamepadCallback: any = null;
  public RemovedGamepadCallback: any = null;

  public constructor(add: any, remove: any) {
    var that = this;
    Globals.logInfo("Setting up Input");
    this.AddedGamepadCallback = add;
    this.RemovedGamepadCallback = remove;
    //Poll for gamepads
    setInterval(function () {

      //**NOTE: poll() should be on more of a 500ms timer
      that.poll();

      that.update();
    }, 10);
  }

  // this is different from Poll - which checks for NEW or REMOVED controllers/
  // this actually updates the current controllers
  public update(): void {


    //****HUGE BUG 
    //For some reason setInterval without update() is not updating the controllers 
    // no idea why this is happening.  It's late.

    for (let i: number = 0; i < this._gamepads.length; ++i) {
      let gp: VRGamepad = this._gamepads[i];
      gp.update();

    }
  }

  //Poll For new pads & Update Existing pads
  private poll(): void {
    try {

      if (navigator.getGamepads == null) {
        if (this._initMsgs == false) {
          Globals.logError("VR setup Failed, no gamepads.");
        }
      }
      else {

        if (this._initMsgs == false) {
          Globals.logDebug("Found " + navigator.getGamepads().length + " gamepads.");
        }

        // Globals.logDebug(": " + navigator.getGamepads());
        for (var n = 0; n < navigator.getGamepads().length; ++n) {
          let gamepad: any = navigator.getGamepads()[n];
          //Globals.logDebug(": " + gamepad);
          if (gamepad !== undefined &&//  Just for you, Microsoft Edge!
            gamepad !== null &&       //  Meanwhile Chrome and Firefox do it this way.
            gamepad.pose !== undefined &&
            gamepad.pose !== null) {
            if (gamepad.pose.orientation !== null || gamepad.pose.position !== null) {

              if (this._gamepads[n] === undefined) {
                Globals.logDebug("Created valid gamepad");
                this._gamepads[n] = new VRGamepad(this, gamepad);
                Globals.logDebug("VR gamepad created");
                if (this.AddedGamepadCallback) {
                  this.AddedGamepadCallback(this._gamepads[n]);
                }
                Globals.logDebug("Total: " + this._gamepads.length + " gamepads.");
              }
              else {
                if (this._initMsgs == false) {
                  Globals.logError("Gamepad " + gamepad.id + " was not a valid VR gamepad.");
                }

              }
            }
          }
          else if (this._gamepads[n] !== undefined && this._gamepads[n] !== null) {

            if (this.RemovedGamepadCallback) {
              this.RemovedGamepadCallback(this._gamepads[n]);
            }
            this._gamepads[n].disconnect();
            this._gamepads[n] = null;
            Globals.logDebug("Removed gamepad.");
          }
          else {
            if (gamepad == null) {
              //**Gamepad will be null at startup
              if (this._initMsgs == false) {
                Globals.logError("Gamepad was null.");
              }
            }
            else {
              Globals.logError("Gamepad " + gamepad.id + " was not a valid VR gamepad.");
            }
          }
        }
      }

      this._initMsgs = true;
    }
    catch (ex) {
      Globals.logError("Gamepad: " + ex)
    }
  }


}


export class VRGamepad extends THREE.Object3D {
  //#region Private Members
  private _errors: string = "";
  private _pos: THREE.Vector3;
  private _quaternion: THREE.Quaternion = new THREE.Quaternion();
  // private _matrix : THREE.Matrix4 = new THREE.Matrix4();
  private _gamepad: any = null;
  // private _axes : ReadonlyArray<number> = null;
  private _primaryButtonName: string = null;
  private _handedness: GamepadHand = null;
  private _buttons: Array<VRButton> = new Array<VRButton>();
  private _style: string = "";
  private _axes: Array<number> = new Array<number>();
  private _mgr: VRInputManager = null;
  //#endregion

  public MoveController : any = null; // callback
  public ButtonPress : any = null; // callback
  public Joystick : any = null; //callback

  public constructor(mgr: VRInputManager, gamepad: Gamepad) {
    super();
    this._mgr = mgr;
    this._gamepad = gamepad;
    try {
      if (this.isSupported(gamepad) == false) {
        Globals.logError("Gamepad " + gamepad.id + " not supported.");
      }
      else {

        this.matrixAutoUpdate = false;

        this.update();
        //Update the controller every 60ms

      }
    } catch (ex) {
      Globals.logError('' + ex);
    }

  }

  //#region Public Methods
  public getHandedness(): GamepadHand {
    if (this._gamepad === null) {
      return null;
    }
    return this._gamepad.hand;
  }
  public getAxis(index: number): number {
    if (this._gamepad === null) {
      return null;
    }
    return this._gamepad.axes[index];
  }
  public getAxes(nameOrIndex: any): ReadonlyArray<number> {
    if (this._gamepad === null) {
      return null;
    }

    let values: number[] = [];

    if (nameOrIndex === undefined) {
      return this._gamepad.axes;
    }
    else if (typeof nameOrIndex === 'string') {
      this._gamepad.axes.byName[nameOrIndex].forEach(function (index: number) {
        values.push(this._gamepad.axes[index])
      })
      return values
    }
    else if (typeof nameOrIndex === 'number') {
      return this._gamepad.axes[nameOrIndex];
    }
  }
  public getButton(idx: number): GamepadButton {
    return this._gamepad.buttons[idx];
  }
  //pass 'primary' to get primary button
  // public getButton(name: string): GamepadButton {
  //   if (name === 'primary') {
  //     name = this._primaryButtonName;
  //   }
  //   return this._gamepad.buttons.byName[name];
  // }
  //#endregion


  public disconnect(): void {

  }

  //#region Private Methods
  private isSupported(gamepad: Gamepad): boolean {

    var key = Object.keys(VRInputManager.supported_controllers).find(function (id: string) {
      if (gamepad.id.startsWith(id)) {
        return true;
      }
    });

    let supported: any = VRInputManager.supported_controllers[key];

    if (supported !== undefined) {
      this._style = supported.style;

      // if( supported.axes !== undefined ){

      //   supported.axes.forEach( function( axesMap ){

      //     this._gamepad.axes.byName[ axesMap.name ] = axesMap.indexes
      //   })
      // }
      if (supported.buttons !== undefined) {
        let that: VRGamepad = this;

        supported.buttons.forEach(function (buttonName: string, i: number) {
          let v: VRButton = new VRButton();
          v.name = buttonName;
          v.isPrimary = supported.buttons[i].isPrimary
          that._buttons.push(v);
        });
        this._primaryButtonName = supported.primary;

        return true;
      }
    }
    return false;
  }

  public update(): void {
    let pose: GamepadPose = this._gamepad.pose;

    // gamepad.axes.forEach( function( axis, i ){

    //   axes[ i ] = axis
    // })


    // //  Similarly we’ll create a default set of button objects.

    // buttons.byName = {}
    // gamepad.buttons.forEach( function( button, i ){

    //   buttons[ i ] = {

    //     name:     'button_'+ i,
    //     value:     button.value,
    //     isTouched: button.touched,
    //     isPressed: button.pressed,
    //     isPrimary: false
    //   }
    // })

    if (pose.orientation !== null) {
      this.quaternion.fromArray(Array.prototype.slice.call(pose.orientation));
    }
    if (pose.position !== null) {

      this.position.fromArray(Array.prototype.slice.call(pose.position));
      this.matrix.compose(this.position, this.quaternion, this.scale);
    }
    else {

      // if( this.armModel === undefined ){

      //  // if( THREE.VRController.verbosity >= 0.5 )  Globals.logInfo( '> #'+ gamepad.index +' '+ gamepad.id +' (Handedness: '+ this.getHandedness() +') adding OrientationArmModel' )
      //   this.armModel = new OrientationArmModel()
      // }


      // //  Now and forever after we can just update this arm model
      // //  with the head (camera) position and orientation
      // //  and use its output to predict where the this is.

      // this.armModel.setHeadPosition( this.head.position )
      // this.armModel.setHeadOrientation( this.head.quaternion )
      // this.armModel.setControllerOrientation(( new THREE.Quaternion() ).fromArray( pose.orientation ))
      // this.armModel.update()
      // this.matrix.compose(

      //   this.armModel.getPose().position,
      //   this.armModel.getPose().orientation,
      //   this.scale
      // )

    }

    //Multiply the standing matrix by the controller matrix. 
    let stm: THREE.Matrix4 = Globals.getStandingMatrix();
    this.matrix.multiplyMatrices(stm, this.matrix)
    this.matrixWorldNeedsUpdate = true
    if(this.MoveController){
      this.MoveController();
    }

    //  Poll for changes in handedness, axes, and button states.
    //  If there’s a change this function fires the appropriate event.

    this.pollForChanges()


    //  Do we have haptics? Do we have haptic channels? Let’s vibrate!

    this.applyVibes()


    //  If you’ve ever wanted to run the same function over and over --
    //  once per update loop -- now’s your big chance.

    // if (typeof this.updateCallback === 'function') {
    //   this.updateCallback()
    // }

  }

  private pollForChanges(): void {
    var controllerInfo = '> #' + this._gamepad.index + ' ' + this._gamepad.id + ' (Handedness: ' + this._gamepad.handedness + ') ';
    //var axesNames = Object.keys(this._axes.byName);

    //  Did the handedness change?
    if (this._handedness !== this._gamepad.hand) {
      if (this._mgr.Verbose) {
        Globals.logDebug(controllerInfo + 'hand changed from "' + this._handedness + '" to "' + this._gamepad.hand + '"')
      }

      this._handedness = this._gamepad.hand;
      //controller.dispatchEvent({ type: 'hand changed', hand: handedness })
    }

    //  Do we have named axes? 
    //  If so let’s ONLY check and update those values.
    // if (axesNames.length > 0) {

    //   axesNames.forEach(function (axesName) {

    //     let axesValues : any= [];

    //     axesChanged = false
    //     axes.byName[axesName].forEach(function (index) {

    //       if (this._gamepad.axes[index] !== axes[index]) {

    //         axesChanged = true
    //         axes[index] = gamepad.axes[index]
    //       }
    //       axesValues.push(axes[index])
    //     })
    //     if (axesChanged) {
    //       //  Vive’s thumbpad is the only controller axes that uses 
    //       //  a “Goofy” Y-axis. We’re going to INVERT it so you
    //       //  don’t have to worry about it!
    //       if (this._style === 'vive' && axesName === 'thumbpad') axesValues[1] *= -1

    //       if (verbosity >= 0.7)  Globals.logInfo(controllerInfo + axesName + ' axes changed', axesValues)
    //       dispatchEvent(new Event() axesName + ' axes changed', axes: axesValues ));
    //     }
    //   })
    // }


    //  Otherwise we need to check and update ALL values.

    // else {

    let that: VRGamepad = this;

    var axesChanged = false;
    this._gamepad.axes.forEach(function (axis: number, i: number) {
      if (axis !== that._axes[i]) {
        axesChanged = true
        that._axes[i] = axis;
      }
    })

    if (axesChanged) {
      if (this._mgr.Verbose) {
        Globals.logDebug(controllerInfo + 'axes changed ' + JSON.stringify(this._axes));
      }
      if(this.Joystick){
        this.Joystick();
      }
      //controller.dispatchEvent({ type: 'axes changed', axes: axes })
    }
    //}

    //  Did any button states change?
    this._buttons.forEach(function (button, i) {
      var controllerAndButtonInfo = controllerInfo + button.name + ' ';
      var isPrimary = button.isPrimary;
      //var eventAction;
      //  If this button is analog-style then its values will range from
      //  0.0 to 1.0. But if it’s binary you’ll only received either a 0
      //  or a 1. In that case 'value' usually corresponds to the press
      //  state: 0 = not pressed, 1 = is pressed.

      if (button.value !== that._gamepad.buttons[i].value) {
        button.value = that._gamepad.buttons[i].value;
        if (that._mgr.Verbose) {
          Globals.logDebug(controllerAndButtonInfo + 'value changed ' + button.value);
        }
        if(this.ButtonPress){
          this.ButtonPress(button);
        }
        //dispatchEvent({ type: button.name + ' value changed', value: button.value })
        //if (isPrimary) controller.dispatchEvent({ type: 'primary value changed', value: button.value })
      }
      //  Some buttons have the ability to distinguish between your hand
      //  making contact with the button and the button actually being
      //  pressed. (Useful!) Some buttons fake a touch state by using an
      //  analog-style value property to make rules like: for 0.0 .. 0.1
      //  touch = true, and for >0.1 press = true. 
      if (button.isTouched !== that._gamepad.buttons[i].touched) {

        button.isTouched = that._gamepad.buttons[i].touched;
        if (that._mgr.Verbose) {
          var eventAction = button.isTouched ? 'began' : 'ended';
          Globals.logDebug(controllerAndButtonInfo + 'touch ' + eventAction);
        }
        //  controller.dispatchEvent({ type: button.name + ' touch ' + eventAction })
        //  if (isPrimary) controller.dispatchEvent({ type: 'primary touch ' + eventAction })
      }
      //  This is the least complicated button property.
      if (button.isPressed !== that._gamepad.buttons[i].pressed) {
        button.isPressed = that._gamepad.buttons[i].pressed
        if (that._mgr.Verbose) {
          var eventAction = button.isPressed ? 'began' : 'ended';
          Globals.logDebug(controllerAndButtonInfo + 'press ' + eventAction);
        }
        if(this.ButtonPress){
          this.ButtonPress(button);
        }
        // controller.dispatchEvent({ type: button.name + ' press ' + eventAction })
        // if (isPrimary) controller.dispatchEvent({ type: 'primary press ' + eventAction })
      }
    })


  }

  private renderVibes(): void {
    //  First we need to clear away any past-due commands,
    //  and update the current intensity value.

    // const 
    // now = window.performance.now(),
    // controller = this

    // controller.vibeChannels.forEach( function( channel ){

    //   while( channel.length && now > channel[ 0 ][ 0 ]){

    //     channel.intensity = channel[ 0 ][ 1 ]
    //     channel.shift()
    //   }
    //   if( typeof channel.intensity !== 'number' ) channel.intensity = 0
    // })


    // //  Now each channel knows its current intensity so we can sum those values.

    // const sum = Math.min( 1, Math.max( 0, 

    //   this.vibeChannels.reduce( function( sum, channel ){

    //     return sum + +channel.intensity

    //   }, 0 )
    // ))
    // this.vibeChannels.intensity = sum
    // return sum
  }

  private applyVibes(): void {

    //if (this._gamepad.hapticActuators &&
    // this._gamepad.hapticActuators[ 0 ]){

    // const
    // renderedIntensity = this.renderVibes(),
    // now = window.performance.now()

    // if( renderedIntensity !== this.vibeChannels.prior ||
    //   now - this.vibeChannels.lastCommanded > THREE.VRController.VIBE_TIME_MAX / 2 ){

    //   this.vibeChannels.lastCommanded = now
    //   this._gamepad.hapticActuators[ 0 ].pulse( renderedIntensity, THREE.VRController.VIBE_TIME_MAX )
    //   this.vibeChannels.prior = renderedIntensity
    // }
    //}
  }

  //#endregion

}


