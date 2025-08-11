const wallet = (() => {
  const STORAGE_KEY = 'wallet_balance_cents';
  let balance = parseInt(localStorage.getItem(STORAGE_KEY) || '100000', 10);
  const listeners = new Set();
  function get(){
    return balance;
  }
  function set(value){
    balance = value;
    localStorage.setItem(STORAGE_KEY, String(balance));
    listeners.forEach(fn => fn(balance));
  }
  function add(amount){
    set(balance + amount);
  }
  function onChange(fn){
    listeners.add(fn);
  }
  function reset(){
    set(100000);
  }
  return { get, set, add, onChange, reset };
})();
