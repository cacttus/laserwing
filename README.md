# ThreeJSTest 

Music By Kevin MacLeod
Electro Sketch by Kevin MacLeod is licensed under a Creative Commons Attribution license (https://creativecommons.org/licenses/by/4.0/)
Source: http://incompetech.com/music/royalty-free/?keywords=electro+sketch&Search=Search
Artist: http://incompetech.com/

# Install requirements
*npm
*git bash

# How to Run
Open a separate window and run 
  npx webpack --watch --colors
Then on your main git bash run
  npm start
This will start webpack-dev-server
Also note You do not need @types/three because three comes with its own tuypes
  
# Takeaways
1. Audio mixing is BAD.  "Audio is already playing" should not be a thing.  Mix the audio into an audio buffer.
2. Can't control the mouse cursor for a true First Person Shooter feel.  This, among other things, is crippling feature that will prevent browsers from ever being seen as serious by game developers. 
