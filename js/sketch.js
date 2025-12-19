// --------------------------------------------------
// PARAMÈTRES GLOBAUX
// --------------------------------------------------
let grille = 6;
let grille_video = 2;
let zoom = 0.008;
let zoom_stars = 0.05;
let temps = 0;
// -------------------------------
// CHAOS MASTER
// -------------------------------
let chaosMode = false;
let chaosTimer = 0;
let chaosInterval = 600;
let chaosMontagne = false;

let sceneWidth;
let musicEnergy = 0;

// vidéos
let videoA, videoB;

// images
let images = [];
let filledCells = [];
let gridSize = 100;
let cols, rows;
let lastAddTime = 0;
let lastChangeTime = 0;
let baseInterval = 500;
let minSize = 50;
let maxSize = 150;

// son
let sound, fft, amp;


// états effets
let effects = {
  videoA: false,
  videoB: false,
  images: false,
  negative: false,
  threshold: false,
  carCrash3D: false
};



// -------------------------------
// CAR CRASH 3D
// -------------------------------
let carScene;
let carModel;
let carTex;

let carRotationSpeed = 0.002;
let carZoom = 0.01;
let carTemps = 0;

let asciiWords = ["WORLD","DISASTER","COMPILATION","CHAOS","CRASH"];
let asciiLayer3D;

// TEXTE CENTRAL
let words = ["WORLD","DISASTER","COMPILATION","NOTINBED","©2025"];
let currentWord = -1;
let showWord = false;
let wordStartTime = 0;

// --------------------------------------------------
// PRELOAD
// --------------------------------------------------
function preload(){
  sound = loadSound('sound/worldisastercompilation.1.mp3');
  carModel = loadModel('img/car.obj', true);
carTex = loadImage('img/texture.png');
    let helvetica;
helvetica = loadFont('Helvetica.otf');

  for(let i=1;i<=6;i++){
    images.push(loadImage(`img/img${i}.jpg`));


  }
}

// --------------------------------------------------
// SETUP
// --------------------------------------------------
function setup(){
  let c = createCanvas(window.innerWidth*0.8, window.innerHeight);
  c.parent("scene");

  sceneWidth = width;
  frameRate(30);
  colorMode(HSL,360,100,100,100);
  textFont('monospace');  
  textFont('helvetica');

  fft = new p5.FFT(0.9,1024);
  amp = new p5.Amplitude();
  amp.setInput(sound);

  // vidéos
  videoA = createVideo('img/disaster.mp4',()=>{
    videoA.loop(); videoA.volume(0); videoA.hide();
  });
  videoB = createVideo('img/disasterglobal.mp4',()=>{
    videoB.loop(); videoB.volume(0); videoB.hide();
  });

  // grille images
  cols = floor(width / gridSize);
  rows = floor(height / gridSize);

  // scène 3D offscreen
carScene = createGraphics(width, height, WEBGL);
carScene.frameRate(30);


// couche ASCII
asciiLayer3D = createGraphics(width, height);
asciiLayer3D.textFont('monospace');
asciiLayer3D.textAlign(CENTER, CENTER);
asciiLayer3D.colorMode(HSL,360,100,100,100);

}

// --------------------------------------------------
// DRAW
// --------------------------------------------------

function draw(){
  background(0);

  let rawEnergy = amp.getLevel();
  musicEnergy = lerp(musicEnergy, rawEnergy, 0.08);
  let lowFreq = fft.getEnergy("bass")/255;
  temps += 0.01 + musicEnergy*0.15;

  // ciel
drawSky();

// vidéos 
if(effects.videoA) drawVideoGridNoise(videoA,0.5,0.2,1.2);
if(effects.videoB) drawVideoGridNoise(videoB,0.3,0.5,1.5);

// images 
if(effects.images) drawImageGridDatamosh();

// montagnes 
montagneSecondaire(lowFreq);
montagne(lowFreq);

// texte central
drawBigWord();



 // crash
if(effects.carCrash3D) drawCarCrash3D();

// post traitement
if(effects.negative) filter(INVERT);
if(effects.threshold) filter(THRESHOLD,0.4);
 

  let icon = document.getElementById("soundIcon");
if(icon){
  icon.style.opacity = sound.isPlaying() ? 1 : 0;
}

chaosMasterControl();

updateUIEffects();




}

// --------------------------------------------------
// CIEL
// --------------------------------------------------
function drawSky(){
  textAlign(CENTER,CENTER);
  let level = musicEnergy;
  for(let x=10;x<width-10;x+=grille){
    for(let y=10;y<height-10;y+=grille){
      let n = noise(x*zoom_stars,y*zoom_stars,temps);
      if(n>0.78){
        fill(0,0,100,map(n,0,1,20,200)*level);
        text("☆",x,y);
      }
    }
  }
}


// --------------------------------------------------
// VIDÉOS
// --------------------------------------------------
function drawVideoGridNoise(video,sMin,sMax,flowMax){
  colorMode(RGB,255);
  video.loadPixels();
  noStroke();

  let seuil = map(musicEnergy,0,0.4,sMax,sMin,true);
  let flow = map(musicEnergy,0,0.4,0.2,flowMax,true);

  for(let x=0;x<sceneWidth;x+=grille){
    for(let y=0;y<height;y+=grille){
      let n = noise(x*zoom,y*zoom,temps*flow);
      if(n>seuil){
        let px = floor(map(x,0,sceneWidth,0,video.width));
        let py = floor(map(y,0,height,0,video.height));
        let i = (px+py*video.width)*4;
        fill(video.pixels[i],video.pixels[i+1],video.pixels[i+2]);
        rect(x,y,grille_video,grille_video);
      }
    }
  }
  colorMode(HSL,360,100,100,100);
}

// --------------------------------------------------
// MONTAGNES
// --------------------------------------------------
function montagne(level){
  noStroke();
  for(let x=0;x<sceneWidth;x+=grille-2){
    for(let y=0;y<height;y+=grille-2){
      let n = noise(x*zoom,y*zoom,temps+level*3);
      
      // CHAOS : si activé, modifie le mapping de montagneY
      let montagneY;
      if(chaosMontagne){
        montagneY = map(noise(x*zoom,temps+level*3),0,1,height*0.8,height*0.1);
      } else {
        montagneY = map(noise(x*zoom,temps+level*3),0,1,height*0.8,height);
      }

      if(y>montagneY && n>0.02){
        let contraste = pow(n,1.8);
        let gris = map(contraste,0,1,10,150);
        let relief = map(y,montagneY,height,1.5,0.2);
        fill(0,0,gris*relief);
        rect(x,y,grille,grille);
      }
    }
  }
}


function montagneSecondaire(level){
  noStroke();
  for(let x=0;x<sceneWidth;x+=grille-2){
    for(let y=0;y<height;y+=grille-2){
      let n = noise(x*zoom*1.2,y*zoom,temps+level*1.5);
      let montagneY = map(noise(x*zoom*1.2,temps+level*1.5),0,1,height*0.8,height);
      if(y>montagneY && n>0.02){
        let contraste = pow(n,1.6);
        let gris = map(contraste,0,1,5,20);
        let relief = map(y,montagneY,height,1.8,0.4);
        fill(0,0,gris*relief);
        rect(x,y,grille,grille);
      }
    }
  }
}

// --------------------------------------------------
// GRILLE D'IMAGES
// --------------------------------------------------
function addRandomImage(){
  let freeCells = [];
  for (let i = 0; i < cols; i++){
    for (let j = 0; j < rows; j++){
      let occupied = filledCells.some(c => c.i === i && c.j === j);
      if(!occupied) freeCells.push({i,j});
    }
  }

  if(freeCells.length > 0){
    let cell = random(freeCells);
    let img = random(images);
    filledCells.push({i:cell.i,j:cell.j,img:img});
  }
}

function drawImageGridDatamosh(){
  let addInterval = map(musicEnergy,0,0.3,baseInterval,50,true);
  let changeInterval = map(musicEnergy,0,0.3,1000,100,true);

  if(millis() - lastAddTime > addInterval){
    addRandomImage();
    lastAddTime = millis();
  }

  if(millis() - lastChangeTime > changeInterval){
    for(let cell of filledCells){
      if(random() < musicEnergy*2){
        cell.img = random(images);
      }
    }
    lastChangeTime = millis();
  }

  let imgSize = map(mouseX,0,width,minSize,maxSize,true);
  for(let cell of filledCells){
    let x = cell.i * gridSize + (gridSize - imgSize)/2;
    let y = cell.j * gridSize + (gridSize - imgSize)/2;
    tint(255,200);
    image(cell.img,x,y,imgSize,imgSize);
    noTint();
  }
}

// --------------------------------------------------
// TEXTE CENTRAL
// --------------------------------------------------
function drawBigWord(){
  if(!showWord) return;
  if(millis()-wordStartTime>400){ showWord=false; return; }

  push();
  textAlign(CENTER,CENTER);
  textSize(min(width,height)*0.1);
  noStroke();

  if(effects.videoA||effects.videoB) blendMode(EXCLUSION);
  else blendMode(BLEND);

  fill(0,0,100);
  text(words[currentWord],width/2,height/2);
  pop();
}




function drawCarCrash3D(){

  let level = musicEnergy;
  carTemps += level * 0.4;

  // -------------------------------
  // 3D CAR SCENE
  // -------------------------------
  carScene.clear();
carScene.colorMode(RGB,255);




  carScene.ambientLight(160);
  carScene.directionalLight(255,255,255,0.5,1,-0.5);

  carScene.rotateX(-PI/6);
  carScene.rotateY(frameCount * carRotationSpeed);

  if(carModel){
    carScene.push();
    carScene.rotateX(PI/2);
    carScene.rotateZ(PI);

    let pulse = 2 * (1 + level * 0.3);
    carScene.scale(pulse);

    if(carTex) carScene.texture(carTex);
    carScene.noStroke();
    carScene.model(carModel);
    carScene.pop();
  }

  // -------------------------------
  // ASCII FIELD
  // -------------------------------
  asciiLayer3D.clear();

  let marge = 100;
  let grille = 20;

  for(let x=marge;x<width-marge;x+=grille){
    for(let y=marge;y<height-marge;y+=grille){

      let d = dist(x,y,width/2,height/2);
      if(d<220) continue;

      let n = noise(x*carZoom,y*carZoom,carTemps);

      if(n>0.55){
        let size = map(n,0.55,1,8,24) + level*20;
        asciiLayer3D.textSize(size);
       asciiLayer3D.fill(0,0,100,180);




        let ox = sin(carTemps+x)*level*50;
        let oy = cos(carTemps+y)*level*50;

        let word = random(asciiWords);
        asciiLayer3D.text(word,x+ox,y+oy);
      }
    }
  }

  // -------------------------------
  // COMPOSITING
  // -------------------------------
 // -------------------------------
// COMPOSITING FINAL
// -------------------------------
push();

// 1. voiture = rendu normal
blendMode(BLEND);
image(carScene,0,0,width,height);

// 2. texte = adaptatif
blendMode(EXCLUSION);
image(asciiLayer3D,0,0,width,height);

// reset
blendMode(BLEND);

pop();


}

function chaosMasterControl(){

  if(!chaosMode) return;

  
  let e = constrain(musicEnergy * 3, 0, 1);

  
  carRotationSpeed = 0.001 + e * 0.005;
  
  effects.negative = random() < 0.5 * e;
  effects.threshold = !effects.negative && random() < 0.3 * e;


  if(random() < 0.5 * e){
    currentWord = (currentWord + 1) % words.length;
    showWord = true;
    wordStartTime = millis();
  }


  for(let cell of filledCells){
    if(random() < e*0.5){
      cell.img = random(images);
    }
  }

}

function updateUIEffects(){

  const effectMap = {
    1: 'videoA',
    2: 'videoB',
    3: 'images',
    5: 'negative',
    6: 'threshold',
    7: 'carCrash3D',
    8: 'chaosMode' 
  };

  
  const effectsDivs = document.querySelectorAll('#ui .effect');
  effectsDivs.forEach((div, index)=>{
    const keyNum = parseInt(div.querySelector('.key').textContent);
    const span = div.querySelector('span');

    if(effectMap[keyNum]){
      const effectName = effectMap[keyNum];
      let active = effects[effectName] || (effectName==='chaosMode' && chaosMode);
      span.style.fontWeight = active ? 'bold' : 'normal';
    }
  });
}


// --------------------------------------------------
// INTERACTIONS
// --------------------------------------------------
function keyPressed(){
  if(!sound.isPlaying()) sound.loop();

  if(key==='1') effects.videoA=!effects.videoA;
  if(key==='2') effects.videoB=!effects.videoB;
  if(key==='3') effects.images=!effects.images;

  if(key==='4'){
    currentWord=(currentWord+1)%words.length;
    showWord=true;
    wordStartTime=millis();
  }

  if(key==='5') effects.negative=!effects.negative;
  if(key==='6') effects.threshold=!effects.threshold;
  if(key==='7') effects.carCrash3D = !effects.carCrash3D;
  if(key==='+') carRotationSpeed += 0.001;
if(key==='-') carRotationSpeed = max(0, carRotationSpeed - 0.001);

if(key == '8'){ 
  chaosMode = !chaosMode;

  if(chaosMode){
    // CHAOS TOTAL pr tout activer
    effects.videoA = true;
    effects.videoB = true;
    effects.images = true;
    effects.negative = true;
    effects.threshold = true;
    effects.carCrash3D = true;

    chaosMontagne = true; 
    chaosTimer = millis();
  } else {
    effects.videoA = false;
    effects.videoB = false;
    effects.images = false;
    effects.negative = false;
    effects.threshold = false;
    effects.carCrash3D = false;

    chaosMontagne = false; 
  }
}


  
}

// --------------------------------------------------
// RESIZE
// --------------------------------------------------
function windowResized(){
  resizeCanvas(window.innerWidth*0.8,window.innerHeight);
  sceneWidth=width;
  carScene.resizeCanvas(width,height);
asciiLayer3D.resizeCanvas(width,height);

  cols = floor(width / gridSize);
  rows = floor(height / gridSize);
}
