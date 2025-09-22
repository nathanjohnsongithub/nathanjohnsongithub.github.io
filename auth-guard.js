(function(){
  const has = document.cookie.split(';').some(c=>c.trim().startsWith('mem_auth_mark='));
  if (!has) {
    const ret = encodeURIComponent(location.pathname + location.search);
    location.replace(`/login.html?return=${ret}`);
  }
})();
