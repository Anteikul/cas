
/* ===== Common utilities, wallet, seeded RNG (HMAC-SHA256 minimal) ===== */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmt = n => new Intl.NumberFormat(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}).format(n);

/* Local storage helpers */
const Store = {
  get(k, v=null){ try{ return JSON.parse(localStorage.getItem(k)) ?? v }catch{ return v } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};

// Wallet
const Wallet = {
  key: "wallet.balance",
  get(){ return Number(Store.get(this.key, 1000)); },
  set(v){ Store.set(this.key, Math.max(0, Number(v)||0)); Wallet.render(); },
  add(v){ this.set(this.get()+Number(v||0)); },
  sub(v){ this.set(this.get()-Number(v||0)); },
  render(){
    $$(".balance-amount").forEach(el => el.textContent = fmt(this.get()));
  }
};

// Minimal SHA-256 + HMAC (tiny implementation adapted for demo; not optimized)
/* eslint-disable */
function sha256(ascii) {
  function rightRotate(value, amount) { return (value>>>amount) | (value<<(32 - amount)); }
  var mathPow = Math.pow; var maxWord = mathPow(2, 32); var lengthProperty = 'length'
  var i, j; var result = ''
  var words = []; var asciiBitLength = ascii[lengthProperty]*8
  var hash = sha256.h = sha256.h || []
  var k = sha256.k = sha256.k || []
  var primeCounter = k[lengthProperty]
  var isComposite = {}
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) { isComposite[i] = candidate }
      hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0
      k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0
    }
  }
  ascii += '\x80'
  while (ascii[lengthProperty]%64 - 56) ascii += '\x00'
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i)
    if (j>>8) return
    words[i>>2] |= j << ((3 - i)%4)*8
  }
  words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0)
  words[words[lengthProperty]] = (asciiBitLength)
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16)
    var oldHash = hash
    hash = hash.slice(0, 8)
    for (i = 0; i < 64; i++) {
      var i2 = i + j
      var w15 = w[i - 15], w2 = w[i - 2]
      var a = hash[0], e = hash[4]
      var temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e&hash[5])^((~e)&hash[6])) 
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) | 0
          )
        )
      var temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22))
        + ((hash[0]&hash[1])^(hash[0]&hash[2])^(hash[1]&hash[2]))
      hash = [(temp1 + temp2)|0].concat(hash) 
      hash[4] = (hash[4] + temp1)|0
    }
    for (i = 0; i < 8; i++) { hash[i] = (hash[i] + oldHash[i])|0 }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j*8)) & 255
      result += ((b < 16) ? 0 : '') + b.toString(16)
    }
  }
  return result
}
function toAscii(str){ return unescape(encodeURIComponent(str)) }
function hmacSha256(key, msg){
  const blocksize = 64;
  key = toAscii(key);
  msg = toAscii(msg);
  if (key.length > blocksize) {
    key = (function(hex){
      let out=''; for(let i=0;i<hex.length;i+=2){ out += String.fromCharCode(parseInt(hex.substr(i,2),16)); }
      return out;
    })(sha256(key));
  }
  if (key.length < blocksize) key += '\x00'.repeat(blocksize - key.length);
  const oKeyPad = String.fromCharCode(...key.split('').map(c => c.charCodeAt(0) ^ 0x5c));
  const iKeyPad = String.fromCharCode(...key.split('').map(c => c.charCodeAt(0) ^ 0x36));
  const inner = sha256(iKeyPad + msg);
  return sha256(oKeyPad + (function(hex){
    let out=''; for(let i=0;i<hex.length;i+=2){ out += String.fromCharCode(parseInt(hex.substr(i,2),16)); }
    return out;
  })(inner));
}
function rngFromSeed(serverSeed, clientSeed, nonce, i=0){
  const hash = hmacSha256(serverSeed, `${clientSeed}:${nonce}:${i}`);
  // convert first 13 hex to int -> [0,1)
  const slice = hash.slice(0,13);
  const num = parseInt(slice,16);
  return (num / 0x1fffffffffffff);
}

// Provably fair seed store
const Seeds = {
  get(){ return Store.get("pf.seeds", {server:"SERVER_SEED_DEMO", client:"client-seed", nonce:0}); },
  set(v){ Store.set("pf.seeds", v); },
  rotate(){
    const s = this.get();
    s.server = "SERVER_"+Math.random().toString(36).slice(2);
    s.client = "client_"+Math.random().toString(36).slice(2);
    s.nonce = 0;
    this.set(s);
  },
  nextNonce(){ const s=this.get(); s.nonce += 1; this.set(s); return s.nonce; }
};

// Notifications
function pushNotify(text){
  const list = $(".notify-list"); if(!list) return;
  const el = document.createElement("div");
  el.className = "notify-item";
  const t = new Date();
  el.innerHTML = `<span class="badge-dot"></span><span>${text}</span><span class="time">${t.toLocaleTimeString()}</span>`;
  list.prepend(el);
}

// Header shrink on scroll
(function(){
  const header = document.querySelector("header.site");
  let lastY = window.scrollY;
  window.addEventListener("scroll", ()=>{
    const y = window.scrollY;
    header.classList.toggle("compact", y > 10 && y >= lastY);
    lastY = y;
  });
})();

// Wallet modal & actions
function bindWallet(){
  Wallet.render();
  const openers = $$(".wallet-open");
  const modal = $("#wallet-modal");
  const overlay = modal?.querySelector(".overlay");
  const closeBtn = modal?.querySelector(".close");
  openers.forEach(b=>b.addEventListener("click", ()=> modal.classList.add("open")));
  overlay?.addEventListener("click", ()=> modal.classList.remove("open"));
  closeBtn?.addEventListener("click", ()=> modal.classList.remove("open"));

  // Deposit/Withdraw handlers
  const depInput = $("#dep-amount");
  const wdrInput = $("#wdr-amount");
  $$(".dep-add").forEach(btn => btn.addEventListener("click", ()=>{
    depInput.value = Number(depInput.value||0) + Number(btn.dataset.v);
  }));
  $$(".wdr-add").forEach(btn => btn.addEventListener("click", ()=>{
    wdrInput.value = Number(wdrInput.value||0) + Number(btn.dataset.v);
  }));
  $("#do-deposit")?.addEventListener("click", ()=>{
    const v = Number(depInput.value||0);
    if(v>0){ Wallet.add(v); pushNotify(`Deposit +${fmt(v)}`); depInput.value=''; }
  });
  $("#do-withdraw")?.addEventListener("click", ()=>{
    const v = Number(wdrInput.value||0);
    if(v>0 && v<=Wallet.get()){ Wallet.sub(v); pushNotify(`Withdrawal -${fmt(v)}`); wdrInput.value=''; }
  });
}

// Provably fair modal
function bindProvablyFair(){
  const modal = $("#pf-modal");
  if(!modal) return;
  const update = () => {
    const s = Seeds.get();
    $("#pf-server").textContent = s.server;
    $("#pf-client").textContent = s.client;
    $("#pf-nonce").textContent = s.nonce;
  };
  $("#pf-open")?.addEventListener("click", ()=>{ update(); modal.classList.add("open"); });
  modal.querySelector(".overlay")?.addEventListener("click", ()=> modal.classList.remove("open"));
  modal.querySelector(".close")?.addEventListener("click", ()=> modal.classList.remove("open"));
  update();
}

// Bet helpers
function getBet(){ return Number($("#bet-amount")?.value||0); }
function setBet(v){ const el=$("#bet-amount"); if(el){ el.value = Math.max(0, Number(v)||0); } }
function placeBet(){
  const b = getBet();
  if(b<=0){ alert("Enter a bet."); return false; }
  if(Wallet.get()<b){ alert("Insufficient balance."); return false; }
  Wallet.sub(b);
  return true;
}
function payout(mult){
  const b = getBet();
  const won = Number((b*mult).toFixed(2));
  if(won>0) Wallet.add(won);
  pushNotify(`Win ${fmt(won)} (${mult.toFixed(2)}×)`);
  return won;
}

// Export global
window.Common = { $, $$, fmt, Store, Wallet, Seeds, rngFromSeed, pushNotify, bindWallet, bindProvablyFair, getBet, setBet, placeBet, payout };
document.addEventListener("DOMContentLoaded", ()=>{ bindWallet(); bindProvablyFair(); });
