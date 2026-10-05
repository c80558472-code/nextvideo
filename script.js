const menu=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});
document.querySelector('.theme')?.addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('nv-theme',document.body.classList.contains('dark')?'dark':'light')});
if(localStorage.getItem('nv-theme')==='dark')document.body.classList.add('dark');
document.querySelector('#detectBtn')?.addEventListener('click',()=>{const input=document.querySelector('#urlInput'),msg=document.querySelector('#detectMsg');if(!input.value.trim()){msg.textContent='Please paste a video URL first.';return}try{new URL(input.value);msg.textContent='URL received. The production downloader will validate supported public/authorized media before processing.'}catch{msg.textContent='Please enter a valid URL.'}});
