// Main game logic for Aetherion 2.0
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width, H = canvas.height;

let state = {
    playing: false,
    wave: 0,
    enemies: [],
    bullets: [],
    powerups: [],
    player: null,
    tick: 0,
    choosing: false
};

const keys = {};
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function rand(a,b){return Math.random()*(b-a)+a}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function createPlayer(){
    return {x: W/2, y: H/2, vx: 0, vy: 0, hp: 100, maxHp: 100, speed: 2.4, fireRate: 20, fireTimer: 0, damage: 10, range: 400, level: 0, score: 0, weapon: 'basic', charge: 0, class: null};
}

function createEnemy(){
    const typeRand = Math.random();
    let type='chaser', hp=25, spd=1.2, atk=8, color='#ff7b7b';
    if(typeRand>0.7){type='tank'; hp=80; spd=0.6; atk=15; color='#ffa44d';}
    else if(typeRand>0.4){type='runner'; hp=15; spd=2.3; atk=6; color='#b97bff';}
    else if(typeRand>0.9){type='shooter'; hp=30; spd=1.0; atk=8; color='#7bff9e';}
    hp += state.wave*5; spd += state.wave*0.05; atk += state.wave*0.5;
    return {x: rand(0,W), y: rand(0,H), hp, spd, atk, type, color, cd: rand(60,120)};
}

function shoot(x,y,dx,dy,spd,damage,pierce=false){
    state.bullets.push({x,y,dx,dy,spd,damage,life:60,pierce});
}

function spawnWave(){
    state.wave++;
    let count = 6 + state.wave*3;
    for(let i=0;i<count;i++) state.enemies.push(createEnemy());
}

function update(dt){
    if(!state.playing) return;
    state.tick++;
    const p = state.player;
    let mx=(keys['a']?-1:0)+(keys['d']?1:0);
    let my=(keys['w']?-1:0)+(keys['s']?1:0);
    const mlen=Math.hypot(mx,my)||1;
    p.x += mx/mlen*p.speed*dt*60;
    p.y += my/mlen*p.speed*dt*60;
    p.x = clamp(p.x,10,W-10);
    p.y = clamp(p.y,10,H-10);
    p.fireTimer--;
    if(p.fireTimer<=0){p.fireTimer = p.fireRate; autoShoot(p);}

    for(let i=state.bullets.length-1;i>=0;i--){
        const b=state.bullets[i];
        b.life--; b.x += b.dx*b.spd*dt*60; b.y += b.dy*b.spd*dt*60;
        if(b.life<=0){state.bullets.splice(i,1); continue;}
        for(let j=state.enemies.length-1;j>=0;j--){
            const e=state.enemies[j];
            if(dist(b,e)<10){
                e.hp -= b.damage;
                if(!b.pierce) state.bullets.splice(i,1);
                if(e.hp<=0){state.enemies.splice(j,1); p.score+=10;}
                break;
            }
        }
    }

    for(const e of state.enemies){
        const dx=p.x-e.x, dy=p.y-e.y, d=Math.hypot(dx,dy);
        if(e.type==='shooter'){
            e.cd--; if(e.cd<=0){e.cd=120;
                const sdx=dx/d,sdy=dy/d;
                shoot(e.x,e.y,sdx,sdy,4,e.atk*0.8,false);
            }
        } else {
            e.x += dx/d*e.spd*dt*60*0.5;
            e.y += dy/d*e.spd*dt*60*0.5;
        }
        if(d<12){p.hp -= e.atk*dt;}
    }

    if(p.hp<=0){endGame(); return;}
    if(state.enemies.length===0 && !state.choosing){showPowerupChoices();}
}

function autoShoot(p){
    let nearest = state.enemies[0], nd=1e9;
    for(const e of state.enemies){const d=dist(p,e); if(d<nd){nd=d; nearest=e;}}
    if(!nearest || nd>p.range) return;
    const dx=(nearest.x-p.x)/nd, dy=(nearest.y-p.y)/nd;
    if(p.weapon==='basic'){shoot(p.x,p.y,dx,dy,6,p.damage);}
    else if(p.weapon==='shotgun'){for(let i=-2;i<=2;i++){const ang=Math.atan2(dy,dx)+i*0.15; shoot(p.x,p.y,Math.cos(ang),Math.sin(ang),5,p.damage*0.6);}}
    else if(p.weapon==='laser'){shoot(p.x,p.y,dx,dy,10,p.damage*4,true);}
}

function draw(){
    ctx.clearRect(0,0,W,H);
    const p=state.player; if(!p) return;
    ctx.beginPath(); ctx.fillStyle='#8be9fd'; ctx.arc(p.x,p.y,12,0,Math.PI*2); ctx.fill();
    for(const b of state.bullets){ctx.beginPath(); ctx.fillStyle=b.pierce?'#00ffaa':'#ffd776'; ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();}
    for(const e of state.enemies){ctx.beginPath(); ctx.fillStyle=e.color; ctx.arc(e.x,e.y,10,0,Math.PI*2); ctx.fill();}
    ctx.fillStyle='#fff'; ctx.fillText(`HP: ${Math.round(p.hp)} / ${p.maxHp}   Score: ${p.score}   Wave: ${state.wave}`,10,20);
    if(p.weapon!=='basic') ctx.fillText(`Weapon: ${p.weapon}`,10,40);
}

function loop(){const dt=0.016; update(dt); draw(); requestAnimationFrame(loop);}
requestAnimationFrame(loop);

function startGame(){document.getElementById('menu').style.display='none'; state.playing=true; state.wave=0; state.enemies=[]; state.bullets=[]; state.player=createPlayer(); spawnWave();}
function endGame(){state.playing=false; document.getElementById('menu').style.display='flex';}

function showPowerupChoices(){state.choosing=true; const ui=document.getElementById('cards'); ui.innerHTML=''; ui.style.display='flex';}

document.getElementById('startBtn').onclick = startGame;