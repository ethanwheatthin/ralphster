// Minimal core logic for 2048 (F001)
const SIZE = 4;
let grid;
let score = 0;
let hasWon = false;
let animating = false; // placeholder for future animation locking

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const msgEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');

function makeEmptyGrid(){
  return Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>0));
}

function init(){
  grid = makeEmptyGrid();
  score = 0;
  hasWon = false;
  renderBoard();
  spawnRandom();
  spawnRandom();
  updateScore();
  msgEl.textContent = '';
}

function renderBoard(){
  boardEl.innerHTML = '';
  // draw background cells
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      boardEl.appendChild(cell);
    }
  }
  // draw tiles
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const v = grid[r][c];
      if(v===0) continue;
      const tile = document.createElement('div');
      tile.className = 'tile num-'+v;
      tile.textContent = v;
      // position absolute: compute left/top based on grid position
      const cellSize = boardEl.clientWidth/4 - 12; // rough computation to center      
      const gap = 12;
      const sizePx = (boardEl.clientWidth - gap*3)/4;
      tile.style.width = sizePx + 'px';
      tile.style.height = sizePx + 'px';
      tile.style.left = (c*(sizePx+gap)) + 'px';
      tile.style.top = (r*(sizePx+gap)) + 'px';
      tile.style.lineHeight = sizePx + 'px';
      boardEl.appendChild(tile);
    }
  }
}

function spawnRandom(){
  const empties = [];
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(grid[r][c]===0) empties.push([r,c]);
  if(empties.length===0) return false;
  const [r,c] = empties[Math.floor(Math.random()*empties.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function updateScore(){
  scoreEl.textContent = score;
  const hs = Number(localStorage.getItem('2048-high')||0);
  if(score>hs){
    localStorage.setItem('2048-high',score);
  }
  highEl.textContent = localStorage.getItem('2048-high')||0;
}

function move(direction){
  if(animating) return false; // placeholder for animation lock  
  let moved = false;
  const mergedFlag = Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>false));
  const vector = {
    left: [0,-1],
    right: [0,1],
    up: [-1,0],
    down: [1,0]
  }[direction];
  const [dr,dc]=vector;
  const traverseOrder = [];
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      traverseOrder.push([r,c]);
    }
  }
  // adjust order based on direction so we move from the edge towards motion  
  if(direction==='right') traverseOrder.sort((a,b)=>b[1]-a[1]);
  if(direction==='down') traverseOrder.sort((a,b)=>b[0]-a[0]);
  if(direction==='left') traverseOrder.sort((a,b)=>a[1]-b[1]);
  if(direction==='up') traverseOrder.sort((a,b)=>a[0]-b[0]);

  for(const [r,c] of traverseOrder){
    let v = grid[r][c];
    if(v===0) continue;
    let nr=r, nc=c;
    while(true){
      const nextR = nr+dr, nextC = nc+dc;
      if(nextR<0||nextR>=SIZE||nextC<0||nextC>=SIZE) break;
      const nextV = grid[nextR][nextC];
      if(nextV===0){
        // slide
        grid[nextR][nextC]=grid[nr][nc];
        grid[nr][nc]=0;
        nr=nextR; nc=nextC;
        moved = true;
        continue;
      }
      if(nextV===grid[nr][nc] && !mergedFlag[nextR][nextC] && !mergedFlag[nr][nc]){
        // merge into next cell
        grid[nextR][nextC]=nextV+grid[nr][nc];
        grid[nr][nc]=0;
        mergedFlag[nextR][nextC]=true;
        score += grid[nextR][nextC];
        moved = true;
        if(grid[nextR][nextC]===2048) hasWon=true;
      }
      break;
    }
  }
  if(moved){
    spawnRandom();
    updateScore();
    renderBoard();
    if(hasWon){
      msgEl.textContent = 'You reached 2048! You may continue.';
    }
    if(!movesAvailable()){
      msgEl.textContent = 'Game Over — no moves available.';
    }
  }
  return moved;
}

function movesAvailable(){
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      if(grid[r][c]===0) return true;
      const v = grid[r][c];
      if(r+1<SIZE && grid[r+1][c]===v) return true;
      if(c+1<SIZE && grid[r][c+1]===v) return true;
    }
  }
  return false;
}

window.addEventListener('keydown',e=>{
  const key = e.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){
    e.preventDefault();
    const map = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
    move(map[key]);
  }
});

restartBtn.addEventListener('click',()=>init());

// start
init();
