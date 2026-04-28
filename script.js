
// --- Canvas ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Fondos ---
const bgDay = new Image(); bgDay.src = 'assets/bg/day.png';
const bgSunset = new Image(); bgSunset.src = 'assets/bg/sunset.png';
const groundImg = new Image(); groundImg.src = 'assets/bg/ground.png';

// --- Jugador ---
const player = { x:50, y:100, width:80, height:80, velocityY:0, jumping:false };
const gravity = 1500;
const groundY = canvas.height - 40;

// --- Sprites ---
const runFrames = [], jumpFrames = [];
const playerRunNames = ["run_01","run_02","run_03","run_04","run_05","run_06"];
const playerJumpNames = ["jump_01","jump_02"];
const obstacleSprites = [];
const obstacleNames = ["flores","ramas","serpiente"];
// --- Sprites con escudo ---
const shieldRunImg = new Image();
shieldRunImg.src = 'assets/player/shield_run.png';

const shieldJumpFrames = [];
const shieldJumpNames = ["shield_jump1", "shield_jump2"];

shieldJumpNames.forEach(n => {
    let img = new Image();
    img.src = `assets/player/${n}.png`;
    shieldJumpFrames.push(img);
});

// --- Obstáculos ---
const obstacles = [];
let obstacleTimer = 0, obstacleSpawnInterval = 1800;

// --- Animación ---
let frameIndex = 0, frameTimer = 0, frameInterval = 100;

// --- Juego ---
let lastTime = 0, gameOver = false, score=0, level=1, record=0;

let gameState = "menu"; 
// "menu" | "playing" | "gameover"

// --- Estadísticas ---
let partidasJugadas=0, choquesTotales=0, tiempoTotalJugado=0, partidasDuraderas=0;

// --- Sonidos ---
const sfxJump = new Audio('assets/sfx/jump.wav');
const sfxHit = new Audio('assets/sfx/hit.wav');
const sfxLevel = new Audio('assets/sfx/levelup.wav');
let soundOn = true;

// --- Botones ---
const soundBtnImg = document.getElementById('sound-btn');
const pauseBtn = document.getElementById('pause-btn');
const playBtnUI = document.getElementById('play-btn');
const restartBtn = document.getElementById('restart-btn');
const tutorialBtn = document.getElementById('tutorial-btn');
const tutorialModal = document.getElementById('tutorial-modal');
const closeTutorial = document.getElementById('close-tutorial');
let paused = false;

soundBtnImg.addEventListener('click',()=>{
soundOn = !soundOn;
soundBtnImg.src = soundOn ? 'assets/ui/sound_on.png' : 'assets/ui/sound_off.png';
});
pauseBtn.addEventListener('click', () => { paused = true; });
playBtnUI.addEventListener('click', () => { if(paused && !gameOver){ paused=false; lastTime=0; update(); } });
restartBtn.addEventListener('click',()=>{ resetGame(); });
tutorialBtn.addEventListener('click',()=>{ tutorialModal.style.display='block'; });
closeTutorial.addEventListener('click',()=>{ tutorialModal.style.display='none'; });

// --- Preload ---
function preloadPlayerSprites() {
playerRunNames.forEach(n=>{ let img=new Image(); img.src=`assets/player/${n}.png`; runFrames.push(img); });
playerJumpNames.forEach(n=>{ let img=new Image(); img.src=`assets/player/${n}.png`; jumpFrames.push(img); });
}
function preloadObstacleSprites() { obstacleNames.forEach(n=>{ let img=new Image(); img.src=`assets/obstacles/${n}.png`; obstacleSprites.push(img); }); }
preloadPlayerSprites(); preloadObstacleSprites();

// --- Estadísticas ---
function updateRecord(){ if(score>record){ record=score; localStorage.setItem('drakiRunnerRecord',record); } }
function loadStats(){
record=Number(localStorage.getItem('drakiRunnerRecord')||0);
partidasJugadas=Number(localStorage.getItem('drakiRunnerPartidas')||0);
choquesTotales=Number(localStorage.getItem('drakiRunnerChoques')||0);
tiempoTotalJugado=Number(localStorage.getItem('drakiRunnerTiempo')||0);
partidasDuraderas=Number(localStorage.getItem('drakiRunnerDuraderas')||0);
}
function saveStats(){
localStorage.setItem('drakiRunnerPartidas',partidasJugadas);
localStorage.setItem('drakiRunnerChoques',choquesTotales);
localStorage.setItem('drakiRunnerTiempo',tiempoTotalJugado);
localStorage.setItem('drakiRunnerDuraderas',partidasDuraderas);
}
function calcularP10(){ return partidasJugadas===0?0:((partidasDuraderas/partidasJugadas)*100).toFixed(1); }
function mostrarStats(){
document.getElementById('score').innerText=`Puntaje: ${score}`;
document.getElementById('level').innerText=`Nivel: ${level}`;
document.getElementById('record').innerText=`Récord: ${record}`;
document.getElementById('partidas').innerText=`Partidas Jugadas: ${partidasJugadas}`;
document.getElementById('choques').innerText=`Choques Totales: ${choquesTotales}`;
document.getElementById('tiempo').innerText=`Tiempo Total Jugado: ${(tiempoTotalJugado/1000).toFixed(1)}s`;
document.getElementById('p10').innerText=`P10: ${calcularP10()}%`;
}

// --- Obstáculos ---
class Obstacle{
constructor(x,w,h,speed,spriteIndex){
this.x=x; this.width=w; this.height=h; this.y=groundY-h; this.speed=speed; this.spriteIndex=spriteIndex;
}
update(dt){ this.x-=this.speed*dt; }
draw(){ const img=obstacleSprites[this.spriteIndex]; if(img.complete) ctx.drawImage(img,this.x,this.y,this.width,this.height); else{ ctx.fillStyle='red'; ctx.fillRect(this.x,this.y,this.width,this.height); } }
}
function createObstacle(speed){
const w=70,h=70,x=canvas.width+20,spriteIndex=Math.floor(Math.random()*obstacleSprites.length);
obstacles.push(new Obstacle(x,w,h,speed,spriteIndex));
}

// --- Jugador ---
function drawPlayer(){

    // --- SI TIENE ESCUDO ---
    if(hasShield){

        if(player.jumping){
            let img = shieldJumpFrames[frameIndex % shieldJumpFrames.length];
            if(img && img.complete){
                ctx.drawImage(
                    img,
                    player.x - 15,
                    player.y - 15,
                    player.width + 30,
                    player.height + 30
                );
            }
        }else{
            if(shieldRunImg.complete){
                ctx.drawImage(
                    shieldRunImg,
                    player.x - 30,
                    player.y - 30,
                    player.width + 60,
                    player.height + 60
                );
            }
        }

        return;
    }

    // --- SIN ESCUDO ---
    let imgToDraw = player.jumping
        ? jumpFrames[frameIndex % jumpFrames.length]
        : runFrames[frameIndex % runFrames.length];

    if(imgToDraw && imgToDraw.complete){
        ctx.drawImage(imgToDraw, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle='green';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

// --- Colisiones ---
function checkCollision(r1,r2){ 
    return r1.x<r2.x+r2.width && 
           r1.x+r1.width>r2.x && 
           r1.y<r2.y+r2.height && 
           r1.y+r1.height>r2.y; 
}

function getHitbox(entity){
    return {
        x: entity.x + 15,
        y: entity.y + 15,
        width: entity.width - 30,
        height: entity.height - 30
    };
}
// --- Reset ---
function resetGame(){ 
    player.y = groundY - player.height;
    player.velocityY = 0;
    player.jumping = false;

    obstacles.length = 0;
    score = 0;
    level = 1;
    gameOver = false;
    obstacleSpawnInterval = 1800;
    partidasJugadas++;

    hasShield = false;
    shield.visible = false;
    firstShieldSpawned = false; // 👈 IMPORTANTE

    saveStats();
    mostrarStats(); 
}

// --- Mensaje Nivel UP ---
let levelUpTimer=0, levelUpText='';
function showLevelUpMessage(){ levelUpText=`¡Nivel ${level} UP!`; levelUpTimer=2000; }
function drawLevelUpMessage(deltaTime){ if(levelUpTimer>0){ ctx.fillStyle='yellow'; ctx.font='36px Fredoka One, sans-serif'; ctx.textAlign='center'; ctx.fillText(levelUpText,canvas.width/2,100); levelUpTimer-=deltaTime*1000; } }

// --- Power-up Escudo ---
const shieldImg = new Image();
shieldImg.src = 'assets/ui/shield.png';

let shield = { 
    x:0, 
    y:0, 
    width:80, 
    height:80, 
    visible:false 
};

let hasShield = false;
let firstShieldSpawned = false;

function spawnShield(){

    // Escudo garantizado al inicio
    if(!firstShieldSpawned){
        shield.x = canvas.width + 100;
        shield.y = groundY - shield.height;
        shield.visible = true;
        firstShieldSpawned = true;
        return;
    }

    // Luego aparece raro
    if(!shield.visible && !hasShield && Math.random() < 0.0008){
        shield.x = canvas.width + 20;
        shield.y = groundY - shield.height - Math.random()*50;
        shield.visible = true;
    }
}

function updateShield(dt){

    if(!shield.visible) return;

    shield.x -= 300 * dt;

    // Si sale de pantalla
    if(shield.x + shield.width < 0){
        shield.visible = false;
    }

    // Si el jugador lo toca
    if(checkCollision(player, shield)){
        shield.visible = false;
        hasShield = true;
        if(soundOn) sfxLevel.play();
    }

    // Dibujar escudo
    if(shieldImg.complete){
        ctx.drawImage(shieldImg, shield.x, shield.y, shield.width, shield.height);
    }
}
// --- Game Loop ---
function update(timestamp=0){
if(paused) return;
if(!lastTime) lastTime=timestamp;
const dt=(timestamp-lastTime)/1000;
lastTime=timestamp;

// --- Fondo ---
ctx.clearRect(0,0,canvas.width,canvas.height);
ctx.drawImage(level>=5?bgSunset:bgDay,0,0,canvas.width,canvas.height);

if(!gameOver){
tiempoTotalJugado+=dt*1000;
player.velocityY+=gravity*dt;
player.y+=player.velocityY*dt;
if(player.y+player.height>groundY){ player.y=groundY-player.height; player.velocityY=0; player.jumping=false; }

obstacleTimer+=dt*1000;
if(obstacleTimer>obstacleSpawnInterval){ createObstacle(300+(level-1)*40); obstacleTimer=0; obstacleSpawnInterval=Math.max(800,1800-(level-1)*100); }

spawnShield();
updateShield(dt);

obstacles.forEach((obs,i)=>{
    obs.update(dt);

    // Si sale de pantalla suma punto
    if(obs.x + obs.width < 0){
        obstacles.splice(i,1);
        score++;
        updateRecord();
        return;
    }

    // --- COLISIÓN ---
    if(checkCollision(getHitbox(player), getHitbox(obs)) && !gameOver){

        // Si tiene escudo, lo pierde y destruye el obstáculo
        if(hasShield){
            hasShield = false;
            obstacles.splice(i,1);
        }
        else{
            gameOver = true;
            choquesTotales++;
            partidasDuraderas += (tiempoTotalJugado >= 10000 ? 1 : 0);
            saveStats();
            if(soundOn) sfxHit.play();
        }
    }
});

if(score>=level*10 && level<10){ level++; if(soundOn)sfxLevel.play(); showLevelUpMessage(); }

if(level>=10){ obstacleSpawnInterval=800; obstacles.forEach(obs=>obs.speed=700); }

frameTimer+=dt*1000;
if(frameTimer>frameInterval){ frameIndex=(frameIndex+1)%runFrames.length; frameTimer=0; }
}

// --- Piso ---

ctx.drawImage(groundImg, 0, canvas.height - 165, canvas.width, 180);

drawPlayer(); obstacles.forEach(o=>o.draw());
drawLevelUpMessage(dt);

if(gameOver){ 
ctx.fillStyle='black'; 
ctx.font='48px serif'; 
ctx.textAlign='center'; 
ctx.fillText('GAME OVER',canvas.width/2,canvas.height/2-20); 
ctx.font='24px serif'; 
ctx.fillText('Presiona R para reiniciar',canvas.width/2,canvas.height/2+20); 
}

mostrarStats();
requestAnimationFrame(update);
}

// --- Controles ---
window.addEventListener('keydown', e=>{
if((e.code==='Space'||e.key===' ')&&!player.jumping&&!gameOver){ player.velocityY=-700; player.jumping=true; if(soundOn)sfxJump.play(); }
if(e.key.toLowerCase()==='r'&&gameOver) resetGame();
});
canvas.addEventListener('mousedown',()=>{ if(!player.jumping&&!gameOver){ player.velocityY=-700; player.jumping=true; if(soundOn)sfxJump.play(); } });

window.addEventListener('load',()=>{ loadStats(); resetGame(); update(); });