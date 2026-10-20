// Sayfa boyanmadan önce <head> içinde çalışır: kayıtlı tema tercihini (light | dark | system) okuyup
// <html data-theme> değerini ayarlar. "system" seçiliyken işletim sistemi teması değişince kendini günceller.
export const THEME_STORAGE_KEY = "theme";

export const THEME_SCRIPT = `(function(){
var k=${JSON.stringify(THEME_STORAGE_KEY)},q=window.matchMedia("(prefers-color-scheme: dark)");
function pref(){try{return localStorage.getItem(k)||"system"}catch(e){return "system"}}
function apply(){var p=pref(),d=p==="dark"||(p!=="light"&&q.matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}
apply();window.__applyTheme=apply;q.addEventListener("change",apply);
})()`;
