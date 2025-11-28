const replay = document.getElementById('replay');
document.addEventListener("DOMContentLoaded", function () {
    console.log("ready");
    load();

    replay.addEventListener('click', function (event) {
        event.stopPropagation(); // 阻止冒泡
        start(); // 重新播放动画
    });
});

//page 1
let seconds = 60;
let typesOfTrash = 3;
let waveTimer, timeTimer;

function start() {
    if (loaded) {
        const setting = document.getElementById("setting");
        setting.classList.add('hidden');

        seconds = document.getElementById('duration').value;
        typesOfTrash = document.getElementById('trash-type').value;

        const canvas = document.getElementById("canvas");
        canvas.classList.remove('hidden');

        console.log("seconds=", seconds, "typesOfTrash", typesOfTrash);

        startGame();
    }
    else {
        console.log("please wait");
    }
}

function wireframe() {
    window.open("assets/wireFrame/wireFrame task 2.pdf", "_blank");
}

function storyboards() {
    window.open("assets/storyBoard/Storyboard task 2.pdf", "_blank");
}


//page 2
let myCanvas;
let ctx;
let balls = [];
let tipBalls = [];
let scoreTips = [];
let totalScore = 0;
let pickedBalls = 0;
//background img
let waveUp = true;
const bg1 = new Image();
const bg2 = new Image();
const musicBg = new Audio("./assets/audio/bg-music.mp3");
const musicNo = new Audio("./assets/audio/no.mp3");
const musicBubble = new Audio("./assets/audio/bubble.mp3");
const musicGoodjob = new Audio("./assets/audio/goodjob.mp3");
const musicPeep = new Audio("./assets/audio/peep.mp3");
const countdown = 5;
const characterSpriteSheet = new Image();
let bg;
// game objects
let character;
let animationId;
// set this to the number of elements you want to load before initalising
const awaitLoadCount = 9;
let loadCount = 0;
// time tracking
let lastTimeStamp = 0;
let tick = 0;
//load result
let Loaded = false;    
const volumeSlider = document.getElementById("volumeControl");

function setVolume(vulume){
    musicBg.volume = parseFloat(vulume);
    musicNo.volume = parseFloat(vulume);
    musicBubble.volume = parseFloat(vulume);
    musicGoodjob.volume = parseFloat(vulume);
    musicPeep.volume = parseFloat(vulume);
}

volumeSlider.addEventListener("input", function () {
    setVolume(this.value);
});

// call this function after each loadable element has finished loading.
// Once all elements are loaded, loadCount threshold will be met to init.
function load() {
    loadCount++;
    console.log("load " + loadCount);
    if (loadCount >= awaitLoadCount) {
        loaded = true;
    }
}

loadGame();

function startGame() {
    initGame();

    waveTimer = setInterval(updateWave, 400);
    timeTimer = setInterval(decreaseTime, 1000);

    startSpawning();

    musicBg.play();
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class ScorePopup {
  constructor(x, y, score) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.opacity = 1;
    this.lifetime = 60; // 显示 60 帧（约 1 秒）
  }

  update() {
    this.y -= 0.5; // 向上漂浮
    this.opacity -= 1 / this.lifetime;
    this.lifetime--;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = "red";
    ctx.font = "20px Arial";
    ctx.fillText(`+${this.score}`, this.x, this.y);
    ctx.restore();
  }

  isExpired() {
    return this.lifetime <= 0;
  }
}

class Hemisphere {
    constructor() {
        this.radius = 20;
        this.x = parseInt(myCanvas.style.width);
        this.y = getRandomInt(310, parseInt(myCanvas.style.height) - this.radius);
        this.type = getRandomInt(1, typesOfTrash);
        this.speed = this.getSpeed();
        this.color = this.getRandomHexColor();
        this.score =  this.getScore();
    }

    update() {
        this.x -= this.speed;
    }

    getSpeed() {
         switch (this.type) {
            case 1:
                return 0.5;
            case 2:
                return 0.8;
            case 3:
                return 1;
            default:
                return 1;
        }
    }

    getScore() {
        switch (this.type) {
            case 1:
                return 10;
            case 2:
                return 20;
            case 3:
                return 30;
            default:
                return 10;
        }
    }

    getRandomHexColor() {
        const hex = Math.floor(Math.random() * 0xffffff).toString(16);
        return "#" + hex.padStart(6, "0");
    }

    getContrastColor(hex) {
        // 去掉 # 号
        hex = hex.replace("#", "");

        // 解析 RGB 分量
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // 计算亮度（YIQ公式）
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;

        // 返回黑或白
        return yiq >= 128 ? "#000000" : "#ffffff";
    }

    draw() {
        const drawY = waveUp ? this.y - 5 : this.y;
        const drawRadius = waveUp ? this.radius - 5 : this.radius;

        ctx.beginPath();
        ctx.arc(this.x, drawY, drawRadius, Math.PI, 0);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        ctx.font = "12px Arial";
        ctx.fillStyle = this.getContrastColor(this.color);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const letter = String.fromCharCode(64 + this.type);
        ctx.fillText(letter, this.x, drawY - drawRadius / 2);
    }
}

function stopGame() {
    //stop animation
    clearInterval(waveTimer);
    clearInterval(timeTimer);
    
    cancelAnimationFrame(animationId);

    musicBg.pause();

    volumeSlider.disabled = true;

    // 灰色半透明遮罩
    ctx.fillStyle = "rgba(128, 128, 128, 0.5)";
    ctx.fillRect(0, 0, parseInt(ctx.canvas.width), parseInt(ctx.canvas.height));

    // 保存当前状态
    ctx.save();

    // 设置文字样式
    ctx.font = "38px Arial Bold";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    // 绘制文字
    const message = `Good effort! You picked ${pickedBalls} trashes and got ${totalScore} points`;
    ctx.fillText(message, parseInt(myCanvas.style.width) / 2, parseInt(myCanvas.style.height) / 2 - 100);

    // 显示按钮
    replay.classList.remove('hidden');

    // 恢复状态（可选）
    ctx.restore();

    musicGoodjob.currentTime = 0; // rewind
    musicGoodjob.play();

    console.log("game over");
}

function startSpawning() {
    function scheduleNextSpawn() {
        const delay = Math.random() * 1000 + 1000; // 1000ms–2000ms
        setTimeout(() => {
            createBall();
            scheduleNextSpawn();
        }, delay);
    }

    createBall();
    scheduleNextSpawn();
}

function createBall() {
    const ball = new Hemisphere();
    balls.push(ball);

    console.log("new ball");
}

function playPeep() {
    if (seconds - 1 <= countdown) {
        musicPeep.currentTime = 0; // rewind
        musicPeep.play();
    }
}

function decreaseTime()
{
    if (seconds <= 0) {
       stopGame();
    }
    else {
        playPeep();
    }

    seconds -= 1;
}

function updateWave()
{
    waveUp = !waveUp;
}

function loadGame()
{
    characterSpriteSheet.src = "./assets/img/character.png";
    characterSpriteSheet.onload = load;

    // Background image
    bg1.src = "./assets/img/background1.png";
    bg1.onload = load;
    bg2.src = "./assets/img/background2.png"; 
    bg2.onload = load;

    musicBg.loop = true;
    musicBg.addEventListener("canplaythrough", function () {
        console.log("background music ok");
        load(); // 你的初始化函数
    });

    musicNo.addEventListener("canplaythrough", function () {
        console.log("No music ok");
        load(); // 你的初始化函数
    });

    musicBubble.addEventListener("canplaythrough", function () {
        console.log("bubble music ok");
        load(); // 你的初始化函数
    });

    musicGoodjob.addEventListener("canplaythrough", function () {
        console.log("good job music ok");
        load(); // 你的初始化函数
    });

    musicPeep.addEventListener("canplaythrough", function () {
        console.log("peep music ok");
        load(); // 你的初始化函数
    });

    setVolume(0.5);
}

function initGame() {
    console.log("init");

    totalScore = 0;
    pickedBalls = 0;
    balls = [];
    scoreTips = [];
    waveUp = true;
    lastTimeStamp = 0;
    tick = 0;
    replay.classList.add('hidden');
    volumeSlider.disabled = false;
    
    myCanvas = document.getElementById('myCanvas');
    ctx = myCanvas.getContext('2d');
    const scale = window.devicePixelRatio;
    myCanvas.width = 1000 * scale;
    myCanvas.height = 666 * scale;
    myCanvas.style.width = "1000px";
    myCanvas.style.height = "666px";
    ctx.scale(scale, scale);

    character = Character(
        characterSpriteSheet,
        [64, 64],

        [ // main character set
            [ // walk up track
                [0, 65], [64, 65], [128, 65] 
            ],
            [ // walk down track 
                [0, 0], [64, 0], [128, 0]
            ],
            [ // walk left track
                [0, 129], [64, 129], [128, 129]
            ],
            [ // walk right track 
                [0, 193], [64, 193], [128, 193]
            ],
            [//up pick
                [192, 65], [256, 65]
            ],
            [//down pick
                [192, 0], [256, 0]
            ],
            [//left pick
                [192, 129], [256, 129]
            ],
            [//right pick
                [192, 193], [256, 193]
            ],
        ],
        scale // Sprite scaling factor
    );
    character.init();

    //tip of trash
    if(tipBalls.length === 0)
    {
        let ballA = new Hemisphere();
        ballA.x = 890 + ballA.radius;
        ballA.y = 10 + ballA.radius;
        ballA.type = 1;
        ballA.score = ballA.getScore(ballA.type);
        tipBalls.push(ballA);

        let ballB = new Hemisphere();
        ballB.x = 890 + ballA.radius;
        ballB.y = 40 + ballA.radius;
        ballB.type = 2;
        ballB.score = ballB.getScore(ballB.type);
        tipBalls.push(ballB);

        let ballC = new Hemisphere();
        ballC.x = 890 + ballA.radius;
        ballC.y = 70 + ballA.radius;
        ballC.type = 3;
        ballC.score = ballC.getScore(ballC.type);
        tipBalls.push(ballC);
    }

    // Event listeners
    document.addEventListener('keydown', doKeyDown);
    document.addEventListener('keyup', doKeyUp);

    window.requestAnimationFrame(run);
}

// Game loop function
function run(timeStamp) {
    tick = (timeStamp - lastTimeStamp);
    lastTimeStamp = timeStamp;

    updateElements(tick);
    drawCanvas();

    animationId = window.requestAnimationFrame(run);
}

function updateBalls()
{
     for (let i = balls.length - 1; i >= 0; i--) {
        if (balls[i].x <= 0) {
            balls.splice(i, 1); // 删除当前元素
            console.log("Delete ball");
        } else {
            balls[i].update();  // 更新其状态
        }
    }
}

function updateScoreTips()
{
     for (let i = scoreTips.length - 1; i >= 0; i--) {
        if (scoreTips[i].isExpired()) {
            scoreTips.splice(i, 1); // 删除当前元素
            console.log("Delete tip");
        } else {
            scoreTips[i].update();  // 更新其状态
        }
    }
}

function updateElements(tick) {
    character.update(tick);
    updateBalls();
    updateScoreTips();
}

function drawTips()
{
    ctx.font = "18px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "left";

    ctx.fillText("Time: " + seconds, 10, 20);
    ctx.fillText("Score: " + totalScore, 10, 40);
}

function drawTypesOfTrash()
{
    for(let i = 0; i < tipBalls.length; i++)
    {
        if(typesOfTrash > i) tipBalls[i].draw();
    }
    
    ctx.font = "18px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "left";

    ctx.fillText(": 10", 940, 20);
    if(typesOfTrash > 1) ctx.fillText(": 20", 940, 50);
    if(typesOfTrash > 2) ctx.fillText(": 30", 940, 80);
}

function drawBackground() {
    bg = waveUp ? bg2 : bg1;

  // 用逻辑宽高（CSS 宽高）
  const logicalWidth = parseInt(myCanvas.style.width);
  const logicalHeight = parseInt(myCanvas.style.height);

  // 计算缩放比例（基于逻辑坐标系）
  const scaleX = logicalWidth / bg.width;
  const scaleY = logicalHeight / bg.height;
  const scale = Math.min(scaleX, scaleY);

  const newWidth = bg.width * scale;
  const newHeight = bg.height * scale;

  const offsetX = (logicalWidth - newWidth) / 2;
  const offsetY = (logicalHeight - newHeight) / 2;

  ctx.drawImage(bg, offsetX, offsetY, newWidth, newHeight);
}

function drawBalls() {
    for (let i = 0; i < balls.length; i++) {
        balls[i].draw();
    }
}

function drawScoreTips() {
    for (let i = 0; i < scoreTips.length; i++) {
        scoreTips[i].draw();
    }
}

function drawCountDown() {
    if (seconds <= countdown) {
        ctx.font = "150px Arial";
        ctx.fillStyle = "red";
        ctx.textAlign = "center";

        ctx.fillText(seconds, parseInt(myCanvas.style.width) / 2, 120);
    }
}

function drawCanvas() {
    ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);

    drawBackground();
    drawTips();
    drawTypesOfTrash();
    drawBalls();
    drawScoreTips();
    drawCountDown();

    character.draw(ctx);
}


//handle keys
function doKeyDown(e) {
    e.preventDefault();
    if (character != undefined) {
        character.doKeyInput(e.key, true);
    }
}

function doKeyUp(e) {
    e.preventDefault();
    if (character != undefined) {
        character.doKeyInput(e.key, false);
    }
}


// Create and return a new Character object.
// Param: spritesheet = Image object
// Param: spriteSize = Array of 2 numbers [width, height]
// Param: spriteFrames = 3D array[Tracks[Frames[Frame X, Y]]]
// Param: spriteScale = Number to scale sprite size -> canvas size
function Character(spritesheet, spriteSize, spriteFrames, spriteScale) {
    return {
        spriteSheet: spritesheet,       // image containing the sprites
        spriteFrameSize: spriteSize,    // dimensions of the sprites in the spritesheet
        spriteFrames: spriteFrames,     // 3d array. X = animation track, Y = animation frame, Z = X & Y of frame
        spriteScale: spriteScale,       // amount to scale sprites by (numbers except 1 will be linearly interpolated)
        spriteCanvasSize: spriteSize,   // Calculated size after scale. temp value set, overwritten in init

        animationTrack: 3,              // current animation frame set to use
        animationFrame: 0,              // current frame in animation to draw
        frameTime: 125,                 // milliseconds to wait between animation frame updates
        timeSinceLastFrame: 0,          // track time since the last frame update was performed
        lastAction: "",                 // Last user input action performed
        lastDirection: "moveRight",     // last direction

        position: [450, 400],            // position of the character (X, Y)
        direction: [0, 0],               // X and Y axis movement amount
        velocity: 0.1,                   // rate of position change for each axis

        // Initialise variables that cannot be calculated during
        // object creation.
        init() {
            console.log("character init");
            // Apply scale multiplier to sprite frame dimensions
            this.spriteCanvasSize = [
                this.spriteFrameSize[0] * this.spriteScale,
                this.spriteFrameSize[1] * this.spriteScale
            ];
        },

        getPickTrack() {
            let track = 7;
            switch (this.lastDirection) {
                case "moveLeft":
                    track = 6;
                    break;
                case "moveRight":
                    track = 7;
                    break;
                case "moveUp":
                    track = 4;
                    break;
                case "moveDown":
                    track = 5;
                    break;
                default:
                    track = 7;
                    break;
            }

            return track;
        },

        isColliding(rect1, rect2) {
            return (
                rect1.x < rect2.x + rect2.width &&
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y
            );
        },

        collection() {
            //in order to collect easily, expand the rectangle
            const rc = { x: this.position[0], y: this.position[1], width: this.spriteCanvasSize[0] + 10, height: this.spriteCanvasSize[1] + 10 };

            let pickSuccess = false;
            for (let i = balls.length - 1; i >= 0; i--) {
                const rcBall = {
                    x: balls[i].x - balls[i].radius,
                    y: balls[i].y - balls[i].radius,
                    width: balls[i].radius * 2,
                    height: balls[i].radius,
                };

                if (this.isColliding(rc, rcBall)) {
                    totalScore += balls[i].getScore();
                    pickedBalls++;
                    scoreTips.push(new ScorePopup(balls[i].x, balls[i].y - 80, balls[i].score));
                    balls.splice(i, 1); // 删除当前元素
                    console.log("pick ball");
                    pickSuccess = true;
                    break;
                }
            }

            if (pickSuccess) {
                musicBubble.currentTime = 0; // rewind
                musicBubble.play();
            }
            else {
                musicNo.currentTime = 0; // rewind
                musicNo.play();
            }

            return pickSuccess;
        },

        // Handle actions for the character to perform.
        // param: action = string of action name.
        action(action) {
            console.log(`action: ${action}. Animation Frame ${this.animationFrame}`);

            if (action === this.lastAction) {
                return;
            }

            switch (action) {
                case "moveLeft":
                    this.animationTrack = 2;
                    this.animationFrame = 0;
                    this.direction[0] = - this.velocity;
                    this.lastDirection = "moveLeft";
                    break;
                case "moveRight":
                    this.animationTrack = 3;
                    this.animationFrame = 0;
                    this.direction[0] = this.velocity;
                    this.lastDirection = "moveRight";
                    break;
                case "moveUp":
                    this.animationTrack = 0;
                    this.animationFrame = 0;
                    this.direction[1] = - this.velocity;
                    this.lastDirection = "moveUp";
                    break;
                case "moveDown":
                    this.animationTrack = 1;
                    this.animationFrame = 0;
                    this.direction[1] = this.velocity;
                    this.lastDirection = "moveDown";
                    break;
                case "noMoveHorizontal":
                    this.direction[0] = 0;
                    this.animationFrame = 0;
                    break;
                case "noMoveVertical":
                    this.direction[1] = 0;
                    this.animationFrame = 0;
                    break;
                case "pick":
                    this.animationTrack = this.getPickTrack(); 
                    this.animationFrame = 0;
                    this.direction = [0, 0]; // 采集时角色静止
                    break;
                case "noPick":
                    if(this.collection()) this.animationFrame = 1;
                    else this.animationTrack = this.getPickTrack() - 4; 
                    break;
                case "doSprite":
                    this.animationTrack = this.animationTrack >= 4 ? this.animationTrack : this.animationTrack + 4;
                    this.animationFrame = 1;
                    this.direction = [0, 0]; 
                    break;
                case "overSprite":
                    this.animationTrack -= 4;
                    this.animationFrame = 0;
                    break;
                default:
                    this.direction = [0, 0];
                    break;
            }

            this.lastAction = action;
        },

        update(tick) {
            // increase time keeper by last update delta
            this.timeSinceLastFrame += tick;
            // check if time since last frame meets threshold for new frame
            if (this.timeSinceLastFrame >= this.frameTime) {
                // reset frame time keeper
                this.timeSinceLastFrame = 0;

                // update frame to next frame on the track. 
                // Modulo wraps the frames from last frame to first.
                if (this.direction[0] != 0 || this.direction[1] != 0) {
                    this.animationFrame = (this.animationFrame + 1) % this.spriteFrames[this.animationTrack].length;
                }
            }

            // Calculate how much movement to perform based on how long
            // it has been since the last position update.
            const bottom = parseInt(myCanvas.style.height) - this.spriteFrameSize[1] * this.spriteScale;
            const right = parseInt(myCanvas.style.width) - this.spriteFrameSize[0] * this.spriteScale;
            this.position[0] += this.direction[0] * tick;
            if(this.position[0] <= 0) this.position[0] = 0;
            if(this.position[0] >= right) this.position[0] = right;
            this.position[1] += this.direction[1] * tick;
            if(this.position[1] <= 200) this.position[1] = 200;
            if(this.position[1] >= bottom) this.position[1] = bottom;
        },

        // Draw character elements using the passed context (canvas).
        // Param: context = canvas 2D context.
        draw(context) {
            context.drawImage(
                this.spriteSheet,
                this.spriteFrames[this.animationTrack][this.animationFrame][0],
                this.spriteFrames[this.animationTrack][this.animationFrame][1],
                this.spriteFrameSize[0],
                this.spriteFrameSize[1],
                this.position[0],
                this.position[1],
                this.spriteCanvasSize[0],
                this.spriteCanvasSize[1]
            );
        },

        // Handle input from keyboard for the character.
        // Param: e = event key string.
        // Param: isKeyDown = boolean, true = key pressed, false = key released
        doKeyInput(e, isKeydown = true) {
            switch (e) {
                case "w":
                case "ArrowUp":
                    if (isKeydown) this.action("moveUp");
                    else this.action("noMoveVertical");
                    break;
                case "a":
                case "ArrowLeft":
                    if (isKeydown) this.action("moveLeft");
                    else this.action("noMoveHorizontal");
                    break;
                case "s":
                case "ArrowDown":
                    if (isKeydown) this.action("moveDown");
                    else this.action("noMoveVertical");
                    break;
                case "d":
                case "ArrowRight":
                    if (isKeydown) this.action("moveRight");
                    else this.action("noMoveHorizontal");
                    break;
                case ' ':
                    if (isKeydown) this.action("pick");
                    else this.action("noPick");
                    break;
                case "Control":
                    if (isKeydown) this.action("doSprite");
                    else this.action("overSprite");
                    break;
                default:
                    if (!isKeydown) this.action("stop");
                    break;
            }
        }
    };
}
