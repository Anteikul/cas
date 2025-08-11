
(function(){
  const { $, $$, Seeds, rngFromSeed, placeBet, payout, pushNotify } = Common;
  let size=5, mines=3, state="idle", revealed=0, total=25, mineSet=new Set(), mult=1;

  function multinext(k){
    // product over safe picks: mult = Π i=0..k-1 (total)/(total - mines - i)
    let m=1;
    for(let i=0;i<k;i++){ m *= (total)/(total - mines - i); }
    return m;
  }

  function renderBoard(){
    const board = $("#board");
    total = size*size;
    board.style.gridTemplateColumns = `repeat(${size}, 58px)`;
    board.innerHTML = "";
    revealed = 0; mult = 1; $("#mult").textContent = "1.00×";
    $("#left-safe b").textContent = (total - mines);
    $("#safe-progress").style.width = "0%";
    mineSet = new Set();
    // Generate mines deterministically
    const nonce = Seeds.nextNonce();
    let i=0;
    while(mineSet.size < mines){
      const r = Math.floor(rngFromSeed(Seeds.get().server, Seeds.get().client, nonce, i++) * total);
      mineSet.add(r);
    }
    for(let idx=0; idx<total; idx++){
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.dataset.idx = idx;
      btn.addEventListener("click", ()=> clickCell(btn, idx));
      board.appendChild(btn);
    }
  }

  function updateUI(){
    $("#left-safe b").textContent = (total - mines - revealed);
    const pct = Math.max(0, Math.min(100, revealed/(total - mines)*100));
    $("#safe-progress").firstElementChild?.style?.setProperty("width", pct+"%");
  }

  function clickCell(btn, idx){
    if(state!=="running") return;
    if(btn.classList.contains("revealed")) return;
    btn.classList.add("revealed");
    if(mineSet.has(idx)){
      btn.classList.add("mine");
      btn.innerHTML = "💥";
      state="finished";
      $("#play-btn").classList.remove("hidden");
      $("#cashout-btn").classList.add("hidden");
      pushNotify("Mines: Prohra.");
      // reveal all
      $$(".cell").forEach((b,i)=>{
        if(!b.classList.contains("revealed")){
          b.classList.add("revealed");
          if(mineSet.has(i)){ b.classList.add("mine"); b.textContent="💣"; }
          else { b.classList.add("safe"); b.textContent="💎"; }
        }
      });
    } else {
      btn.classList.add("safe");
      btn.innerHTML = "<span class='tip'>"+mult.toFixed(2)+"×</span>💎";
      revealed++;
      mult = multinext(revealed);
      $("#mult").textContent = mult.toFixed(2)+"×";
      updateUI();
      if(revealed >= (total - mines)){
        // auto win
        cashout();
      }
    }
  }

  function start(){
    if(!placeBet()) return;
    size = Number($("#size").value);
    mines = Number($("#mines-count").value);
    state="running";
    $("#play-btn").classList.add("hidden");
    $("#cashout-btn").classList.remove("hidden");
    renderBoard();
  }

  function cashout(){
    if(state!=="running") return;
    state="finished";
    $("#play-btn").classList.remove("hidden");
    $("#cashout-btn").classList.add("hidden");
    payout(mult);
    // reveal all nice
    $$(".cell").forEach((b,i)=>{
      if(!b.classList.contains("revealed")){
        b.classList.add("revealed");
        if(mineSet.has(i)){ b.classList.add("mine"); b.textContent="💣"; }
        else { b.classList.add("safe"); b.textContent="💎"; }
      }
    });
  }

  $("#play-btn").addEventListener("click", start);
  $("#cashout-btn").addEventListener("click", cashout);
  $("#size").addEventListener("change", ()=> renderBoard());
  renderBoard();
})();
