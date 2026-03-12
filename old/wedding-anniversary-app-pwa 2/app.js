
(function(){
  const cfg = window.APP_CONFIG || {};
  const el = (id) => document.getElementById(id);

  // i18n auto (FR by default)
  const userLang = (navigator.language || 'fr').toLowerCase();
  const isFrench = userLang.startsWith('fr');
  const fr = { invited:"Vous êtes invités !", rsvp:"RSVP", fullName:"Nom et prénom", email:"Email", attendingQ:"Serez-vous des nôtres ?", yes:"Oui", no:"Non", maybe:"Peut-être", guests:"Nombre de personnes (vous inclus)", diet:"Régimes / allergies (optionnel)", message:"Message aux hôtes (optionnel)", send:"Envoyer l'RSVP", addToCal:"Ajouter au calendrier", gcal:"Google Calendar", ics:"Télécharger .ics", worksOn:"Compatible iPhone et Android (calendrier natif)", location:"Lieu", viewMap:"Ouvrir dans Google Maps", thanks:"Merci ! Votre RSVP a bien été envoyé.", error:"Désolé, un problème est survenu. Réessayez ou contactez-nous.", sending:"Envoi en cours…", youAreInvited:"Vous êtes invités !", rsvpBy:"RSVP avant" };
  const en = { invited:"You're invited!", rsvp:"RSVP", fullName:"Full name", email:"Email", attendingQ:"Will you attend?", yes:"Yes", no:"No", maybe:"Maybe", guests:"Number of guests (including you)", diet:"Dietary requirements (optional)", message:"Message to the hosts (optional)", send:"Send RSVP", addToCal:"Add to Calendar", gcal:"Google Calendar", ics:"Download .ics", worksOn:"Works with iPhone and Android default calendars.", location:"Location", viewMap:"Open in Google Maps", thanks:"Thanks! Your RSVP has been received.", error:"Sorry, something went wrong. Please try again or contact the hosts.", sending:"Sending…", youAreInvited:"You're invited!", rsvpBy:"RSVP by" };
  const t = (k)=> (isFrench?fr[k]:en[k]) || k;

  function formatDateRange(startIso, endIso, tz){
    const opts = {weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', timeZone: tz};
    const s = new Date(startIso); const e = new Date(endIso);
    const sStr = s.toLocaleString(undefined, opts);
    const eStr = e.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit', timeZone: tz});
    return `${sStr} – ${eStr}`;
  }

  function toGoogleCalendarUrl({title, details, location, startIso, endIso}){
    function fmt(d){ const dt=new Date(d),p=n=>String(n).padStart(2,'0'); return `${dt.getUTCFullYear()}${p(dt.getUTCMonth()+1)}${p(dt.getUTCDate())}T${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}${p(dt.getUTCSeconds())}Z`; }
    const params = new URLSearchParams({ action:'TEMPLATE', text:title, details, location, dates:`${fmt(startIso)}/${fmt(endIso)}` });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  function downloadICS({title, details, location, startIso, endIso}){
    const uid = `${Date.now()}@anniversary.local`;
    const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.[0-9]{3}Z$/, 'Z');
    const fmtUtc = (d)=>{ const dt=new Date(d),p=n=>String(n).padStart(2,'0'); return `${dt.getUTCFullYear()}${p(dt.getUTCMonth()+1)}${p(dt.getUTCDate())}T${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}${p(dt.getUTCSeconds())}Z`; };
    const ics = [ 'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Anniversary RSVP//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${stamp}`,`DTSTART:${fmtUtc(startIso)}`,`DTEND:${fmtUtc(endIso)}`,`SUMMARY:${title.replace(/\n/g,' ')}`,`DESCRIPTION:${(details||'').replace(/\n/g,' ')}`,`LOCATION:${(location||'').replace(/\n/g,' ')}`,'END:VEVENT','END:VCALENDAR' ].join('\r\n');
    const blob = new Blob([ics], {type:'text/calendar;charset=utf-8'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='evenement.ics'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(url); a.remove();},100);
  }

  function setText(){
    el('couple').textContent = cfg.coupleNames || '';
    el('title').textContent = cfg.eventTitle || '';
    el('details').textContent = cfg.details || '';
    el('deadline').textContent = cfg.rsvpDeadline || '';
    el('whenWhere').textContent = `${formatDateRange(cfg.startDateTime, cfg.endDateTime, cfg.timeZone)} • ${cfg.locationName}`;
    el('locName').textContent = cfg.locationName || '';
    el('locAddr').textContent = cfg.locationAddress || '';
    const gmaps = el('gmaps'); gmaps.href = cfg.googleMapsLink || '#'; gmaps.textContent = t('viewMap');
    document.querySelector('[data-i18n="invited"]').textContent = t('youAreInvited');
    document.querySelector('[data-i18n="rsvp"]').textContent = t('rsvp');
    document.querySelector('[data-i18n="rsvpBy"]').textContent = t('rsvpBy');
    document.querySelector('#sendBtn').textContent = t('send');
    document.querySelector('[data-i18n="addToCal"]').textContent = t('addToCal');
    document.querySelector('#googleCalBtn').textContent = t('gcal');
    document.querySelector('#icsBtn').textContent = t('ics');
    document.querySelector('[data-i18n="worksOn"]').textContent = t('worksOn');
    document.querySelector('[data-i18n="location"]').textContent = t('location');
    el('year').textContent = new Date().getFullYear();
  }

  function initCalendar(){
    const url = toGoogleCalendarUrl({ title: cfg.eventTitle, details: cfg.details, location: `${cfg.locationName}, ${cfg.locationAddress}`, startIso: cfg.startDateTime, endIso: cfg.endDateTime });
    document.getElementById('googleCalBtn').href = url;
    document.getElementById('icsBtn').addEventListener('click', ()=> downloadICS({ title: cfg.eventTitle, details: cfg.details, location: `${cfg.locationName}, ${cfg.locationAddress}`, startIso: cfg.startDateTime, endIso: cfg.endDateTime }));
  }

  async function submitRSVP(data){
    const mode = (cfg.rsvp && cfg.rsvp.mode) || 'none';
    if(mode === 'googleAppsScript'){
      const url = cfg.rsvp.googleAppsScriptUrl; if(!url) throw new Error('Apps Script URL manquant');
      await fetch(url,{method:'POST',mode:'no-cors',body:JSON.stringify(data)}); return true;
    } else if(mode === 'firebase'){
      const conf = cfg.rsvp.firebaseConfig||{}; if(!conf.databaseURL) throw new Error('Firebase databaseURL manquant');
      const url = conf.databaseURL.replace(/\/$/,'') + '/rsvps.json';
      const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); if(!res.ok) throw new Error('Erreur Firebase'); return true;
    } else {
      const params = new URLSearchParams({subject:`RSVP: ${cfg.eventTitle}`, body:`Nom: ${data.name}\nEmail: ${data.email}\nPrésence: ${data.attending}\nInvités: ${data.guests}\nRégime: ${data.diet}\nMessage: ${data.message}`});
      window.location.href = `mailto:?${params.toString()}`; return true;
    }
  }

  function initForm(){
    const form = document.getElementById('rsvpForm'); const status = document.getElementById('rsvpStatus');
    form.addEventListener('submit', async (e)=>{ e.preventDefault(); status.textContent = t('sending'); const data = Object.fromEntries(new FormData(form).entries()); data.timestamp=new Date().toISOString(); data.eventTitle=cfg.eventTitle; try{ await submitRSVP(data); status.textContent=t('thanks'); form.reset(); } catch(err){ console.error(err); status.textContent=t('error'); } });
  }

  setText(); initCalendar(); initForm();
})();
