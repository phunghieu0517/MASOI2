(() => {
  'use strict';
  const roleDefs = [
    { id:'wolf', label:'MA SÓI', icon:'🐺', desc:'Thức dậy mỗi đêm, cùng phe Sói chọn một người để loại.', tip:'Bạn biết đồng đội Ma Sói. Cùng biểu quyết một nạn nhân mỗi đêm.' },
    { id:'seer', label:'TIÊN TRI', icon:'🔮', desc:'Mỗi đêm soi một người để biết họ có phải Sói.', tip:'Mỗi đêm bạn được soi một người. Kết quả chỉ bạn biết.' },
    { id:'witch', label:'PHÙ THỦY', icon:'🧪', desc:'Có một bình cứu và một bình độc cho cả ván.', tip:'Bạn có 1 bình cứu và 1 bình độc. Mỗi bình chỉ dùng một lần.' },
    { id:'guard', label:'BẢO VỆ', icon:'🛡️', desc:'Bảo vệ một người mỗi đêm, không liên tiếp cùng người.', tip:'Chọn người để bảo vệ. Không chọn cùng người hai đêm liên tiếp.' },
    { id:'hunter', label:'THỢ SĂN', icon:'🏹', desc:'Khi bị loại có quyền bắn hoặc bỏ qua một người.', tip:'Nếu bị loại, bạn được chọn một mục tiêu để bắn phát cuối.' },
    { id:'villager', label:'DÂN LÀNG', icon:'🏡', desc:'Trao đổi, suy luận và tìm Sói vào ban ngày.', tip:'Bạn không có kỹ năng ban đêm. Hãy dùng trí suy luận để tìm Sói.' }
  ];
  const roleMap = Object.fromEntries(roleDefs.map(x => [x.id, x]));
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const STORAGE = 'ma-soi-phien-choi';
  let session = readSession(), state = null, source = null, chatTab = 'public';
  let drafts = {}, toastTimer = null, busy = false, lastPhaseKey = null;
  let urlRoom = new URLSearchParams(location.search).get('room')?.replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,6) || '';

  function readSession() { try { return JSON.parse(localStorage.getItem(STORAGE)); } catch { return null; } }
  function storeSession(value) { session = value; if(value) localStorage.setItem(STORAGE, JSON.stringify(value)); else localStorage.removeItem(STORAGE); }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtTime(ts) { return new Date(ts).toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }); }
  const countDeck = (s) => Object.values(s.config).reduce((a,b) => a+b,0);
  const connectedCount = (s) => s.players.filter(p => p.connected).length;
  const canChat = (s) => chatTab === 'wolf' ? s.me.role === 'wolf' && s.me.alive && s.phase === 'night' : ['lobby','day','day_result'].includes(s.phase) && (s.phase === 'lobby' || s.me.alive);
  function notify(text, error=false) {
    toastEl.textContent = text;
    toastEl.className = error ? 'visible error':'visible';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {toastEl.className = '';},3200);
  }
  async function call(endpoint, body) {
    const res = await fetch('/api/'+endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const data = await res.json();
    if(!res.ok || !data.ok) throw new Error(data.error || 'Không thể kết nối máy chủ.');
    return data;
  }
  async function action(kind, payload={}) {
    if(!session) return;
    try {
      await call('action', {roomCode:session.roomCode, token:session.token, action:kind, payload});
    } catch (e) { notify(e.message,true); }
  }
  function saveDrafts() {
    let focused = document.activeElement, focusKey = focused?.dataset?.draftKey;
    for (const el of document.querySelectorAll('[data-draft-key]')) drafts[el.dataset.draftKey] = el.type === 'checkbox' ? el.checked : el.value;
    return focusKey;
  }
  function applyDrafts(focusKey) {
    for (const el of document.querySelectorAll('[data-draft-key]')) {
      if (Object.prototype.hasOwnProperty.call(drafts, el.dataset.draftKey)) {
        if (el.type === 'checkbox') el.checked = drafts[el.dataset.draftKey];
        else if (el.tagName === 'SELECT') { if([...el.options].some(o=>o.value === drafts[el.dataset.draftKey])) el.value = drafts[el.dataset.draftKey]; }
        else el.value = drafts[el.dataset.draftKey];
      }
      if(focusKey && focusKey === el.dataset.draftKey) el.focus({ preventScroll:true });
    }
    const box = document.querySelector('.chat-messages');
    if(box) box.scrollTop = box.scrollHeight;
  }
  function render() {
    const nextKey = state ? `${state.code}/${state.phase}/${state.nightNumber}` : 'home';
    const focusKey = lastPhaseKey === nextKey ? saveDrafts() : null;
    if (lastPhaseKey !== nextKey) { drafts = {}; lastPhaseKey = nextKey; }
    app.innerHTML = state ? renderRoom(state) : renderHome();
    applyDrafts(focusKey);
  }
  function brand() {
    return `<div class="brand"><div class="brand-mark">🐺</div><div><div class="brand-name">MA SÓI</div><div class="brand-meta">THE NIGHT HAS EYES</div></div></div>`;
  }
  function renderHome() {
    return `<div class="shell entry">
      <header class="topbar">${brand()}<div class="pill"><span class="dot status-pulse"></span> SẴN SÀNG VÀO LÀNG</div></header>
      <div class="entry-layout">
        <section class="entry-hero">
          <div class="hero-art" aria-hidden="true"></div>
          <div class="hero-topline"><span class="dash"></span><span class="eyebrow">TRÒ CHƠI SUY LUẬN • MULTIPLAYER</span></div>
          <h1 class="entry-title">ĐÊM XUỐNG,<span>AI LÀ SÓI?</span></h1>
          <p class="hero-lead">Một ngôi làng. Những thân phận bí mật. Bạn sẽ tìm ra Ma Sói, hay bị bóng đêm đánh lừa? Lập phòng, chọn bộ bài và cùng bạn bè bước vào cuộc săn.</p>
          <div class="features">
            <div class="feature"><b>30</b><span>người chơi tối đa</span></div>
            <div class="feature"><b>06</b><span>vai đặc biệt & cơ bản</span></div>
            <div class="feature"><b>LIVE</b><span>cập nhật thời gian thực</span></div>
          </div>
          <p class="entry-bottom">✦ Không cần tài khoản &nbsp; ✦ Dùng trên điện thoại / máy tính &nbsp; ✦ Chủ phòng chọn vai</p>
        </section>
        <div class="glass entry-box">
          <div class="box-top"><h2>Tập hợp dân làng</h2><span class="moon-mini">☾</span></div>
          <p>Tạo phòng mới hoặc nhập mã phòng từ bạn bè.</p>
          <section class="entry-section">
            <div class="section-label"><span class="step">01</span> TẠO PHÒNG MỚI</div>
            <form id="create-form">
              <label class="field"><span>Tên của bạn</span><input class="input" name="name" maxlength="24" minlength="2" autocomplete="nickname" required placeholder="Ví dụ: Sói đầu đàn" value="${esc(drafts.homeName || '')}" /></label>
              <button class="btn btn-primary btn-large" type="submit">✦ TẠO PHÒNG & LÀM CHỦ PHÒNG</button>
            </form>
          </section>
          <div class="entry-separator">HOẶC THAM GIA CÙNG BẠN BÈ</div>
          <section class="entry-section">
            <div class="section-label"><span class="step">02</span> VÀO PHÒNG CÓ SẴN</div>
            <form id="join-form">
              <label class="field"><span>Mã phòng 6 ký tự</span><input class="input" name="roomCode" maxlength="6" required placeholder="VD: AB3XYZ" style="letter-spacing:3px;text-transform:uppercase" value="${esc(urlRoom)}" /></label>
              <label class="field"><span>Tên hiển thị</span><input class="input" name="name" maxlength="24" minlength="2" required placeholder="Biệt danh của bạn" value="${esc(drafts.homeName || '')}" /></label>
              <button class="btn btn-ghost btn-large" type="submit">↗ THAM GIA NGÔI LÀNG</button>
            </form>
          </section>
          <p class="form-note">Bắt đầu từ 5 người • Tối đa 30 người mỗi phòng • Miễn phí</p>
        </div>
      </div>
    </div>`;
  }
  function renderTopbar(s) {
    return `<header class="topbar">${brand()}<div class="top-right">
      <span class="pill"><span class="dot"></span> ${s.players.length}/${s.maxPlayers} THÀNH VIÊN</span>
      <button class="btn btn-ghost btn-tiny" data-action="copy">🔗 CHIA SẺ</button>
      <button class="pill room-code" data-action="copy" title="Nhấn để sao chép mã phòng" style="cursor:pointer">${esc(s.code)} ⧉</button>
      <button class="btn btn-danger btn-tiny" data-action="leave">RỜI PHÒNG</button>
    </div></header>`;
  }
  function renderPlayers(s) {
    const players = s.players.map((p,i) => `<div class="player-row ${!p.alive?'player-eliminated':''}">
      <div class="avatar ${!p.alive?'dead':''}">${esc((p.name||'?').charAt(0).toUpperCase())}</div>
      <div class="player-info"><div class="player-name">${esc(p.name)} ${p.id===s.me.id?'<span class="tag">BẠN</span>':''} ${p.isHost?'<span class="tag tag-gold">👑</span>':''}</div>
        <div class="player-extra">${p.role ? `<span class="player-role">${roleMap[p.role]?.icon||''} ${esc(roleMap[p.role]?.label||'')}</span>` : `Người chơi #${String(i+1).padStart(2,'0')}`}</div></div>
      <span class="player-indicator ${!p.alive?'died':!p.connected?'off':''}" title="${!p.alive?'Đã bị loại':p.connected?'Trực tuyến':'Mất kết nối'}">${!p.alive?'✕':p.connected?'●':'○'}</span>
      ${s.me.isHost && s.phase==='lobby' && p.id!==s.me.id ? `<button class="btn btn-ghost btn-tiny" data-action="kick" data-id="${esc(p.id)}" title="Mời ra khỏi phòng">✕</button>`:''}
    </div>`).join('');
    return `<aside class="glass side-panel participants">
      <div class="panel-heading"><h2>👥 DANH SÁCH NGƯỜI CHƠI</h2><span class="tag">${s.players.length}/30</span></div>
      <div class="panel-summary"><div><b>${s.players.length}</b><span>Đã vào phòng</span></div><div><b>${s.phase==='lobby'?connectedCount(s):s.aliveCount}</b><span>${s.phase==='lobby'?'Trực tuyến':'Còn sống'}</span></div></div>
      <div class="players-list">${players}</div>
      ${s.phase==='lobby'?'<p class="footer-info">🔗 Chia sẻ mã hoặc đường dẫn phòng để mời thêm dân làng.</p>':'<p class="footer-info">🔒 Vai trò người chơi được giữ bí mật cho đến khi ván kết thúc.</p>'}
    </aside>`;
  }
  function renderPhase(s) {
    let title='',desc='',icon='☾',label='',klass='';
    switch(s.phase) {
      case 'lobby': title='NGÔI LÀNG ĐANG TẬP HỢP';desc='Mời mọi người vào phòng. Chủ phòng tùy chọn bộ bài rồi bắt đầu cuộc chơi.';icon='✦';label='PHÒNG CHỜ';break;
      case 'night': title='ĐÊM ĐÃ XUỐNG';desc='Các vai có chức năng ban đêm hãy âm thầm hành động. Cả làng đang chờ bình minh.';icon='☾';label=`ĐÊM THỨ ${s.nightNumber}`;break;
      case 'day':title='BÌNH MINH LÊN RỒI';desc='Cùng thảo luận, tìm ra kẻ khả nghi và bỏ phiếu để bảo vệ ngôi làng.';icon='☀';label=`NGÀY THỨ ${s.nightNumber}`;klass='day';break;
      case 'day_result':title='PHÁN QUYẾT CỦA LÀNG';desc='Kết quả bỏ phiếu đã được công bố. Đêm mới sẽ bắt đầu khi chủ phòng sẵn sàng.';icon='⚖';label=`KẾT THÚC NGÀY ${s.nightNumber}`;klass='day';break;
      case 'hunter':title='PHÁT SÚNG CUỐI';desc='Thợ Săn đã bị loại và đang quyết định có sử dụng mũi tên cuối cùng hay không.';icon='🏹';label='QUYỀN NĂNG THỢ SĂN';break;
      case 'ended':title=s.winner==='wolf'?'MA SÓI CHIẾN THẮNG':'DÂN LÀNG CHIẾN THẮNG';desc='Ván đấu đã kết thúc. Những chiếc mặt nạ được gỡ bỏ, mọi bí mật đã sáng tỏ.';icon=s.winner==='wolf'?'🐺':'🏆';label='KẾT THÚC VÁN CHƠI';klass='ended';break;
    }
    return `<section class="phase-card ${klass}"><div class="phase-decoration"></div><div class="phase-index">✧ ${label} ✧</div><div class="phase-moon">${icon}</div><h1 class="${s.phase==='ended'?'winner-title':''}">${title}</h1><p>${desc}</p></section>`;
  }
  function secretCard(s) {
    if(!s.me.role || s.phase==='lobby') return '';
    const r = roleMap[s.me.role] || roleMap.villager;
    return `<section class="role-private ${esc(s.me.role)}"><div class="role-icon">${r.icon}</div><div><div class="role-secret">🔒 LÁ BÀI BÍ MẬT CỦA BẠN ${s.me.alive?'':' • ĐÃ BỊ LOẠI'}</div><div class="role-name">${r.label}</div><p>${r.tip}</p></div></section>`;
  }
  function renderDeck(s) {
    const total = countDeck(s), full = total === s.players.length;
    const canStart = s.players.length>=5 && full && s.config.wolf>0 && s.config.wolf<s.players.length/2 && connectedCount(s)===s.players.length;
    const grid = roleDefs.map(r => `<div class="deck-role"><div class="deck-role-top"><span class="deck-emoji">${r.icon}</span><span class="deck-role-name">${r.label}</span></div>
      <div class="deck-role-desc">${r.desc}</div>
      <div class="role-stepper"><button class="step-btn" data-action="role-count" data-role="${r.id}" data-change="-1" aria-label="Giảm ${r.label}" ${s.config[r.id]===0?'disabled':''}>−</button><span class="stepper-number">${s.config[r.id]}</span><button class="step-btn" data-action="role-count" data-role="${r.id}" data-change="1" aria-label="Tăng ${r.label}" ${total>=30?'disabled':''}>+</button></div></div>`).join('');
    return `<section class="glass content-card"><div class="deck-header"><div><div class="eyebrow">THIẾT LẬP TRẬN ĐẤU</div><h2>🎴 Bộ bài ra trận</h2><p class="desc">Chủ phòng tự chọn số lượng từng vai, có thể đổi bất kỳ lúc nào trước khi bắt đầu.</p></div><span class="tag tag-gold">HOST</span></div>
      <div class="preset-bar"><button class="preset-btn" data-action="preset" data-mode="balanced">✦ Cân bằng</button><button class="preset-btn" data-action="preset" data-mode="simple">🏡 Cơ bản</button><button class="preset-btn" data-action="preset" data-mode="mystic">🔮 Nhiều phép thuật</button></div>
      <div class="deck-grid">${grid}</div>
      <div class="deck-summary"><span>${full?'✅ Đủ lá bài để chia':'⚠️ Số bài phải bằng số người chơi'}</span><strong>${total} / ${s.players.length}</strong></div>
      <div class="progress"><div class="progress-fill" style="width:${Math.min(100,Math.round(total/Math.max(s.players.length,1)*100))}%"></div></div>
      ${s.players.length<5?'<div class="notice warning">Cần tối thiểu 5 người tham gia để bắt đầu.</div>':''}
      ${s.config.wolf>=s.players.length/2?'<div class="notice warning">Số Sói phải ít hơn một nửa người chơi.</div>':''}
      ${connectedCount(s)!==s.players.length?'<div class="notice">Một vài người đang mất kết nối. Hãy đợi họ trở lại phòng.</div>':''}
      <div style="margin-top:19px"><button class="btn btn-gold btn-large" data-action="start" ${canStart?'':'disabled'}>✧ CHIA BÀI & BẮT ĐẦU VÁN CHƠI</button></div>
    </section>`;
  }
  function renderGuestLobby(s) {
    const cards = roleDefs.filter(r=>s.config[r.id]>0).map(r => `<div class="readonly-role"><div class="icon">${r.icon}</div><b>${s.config[r.id]}</b><small>${r.label}</small></div>`).join('');
    return `<section class="glass content-card"><div class="eyebrow">CHỜ CHỦ PHÒNG</div><h2>🎴 Bộ bài dự kiến</h2><p class="desc">Chủ phòng đang điều chỉnh các lá bài. Mỗi người sẽ chỉ nhìn thấy vai trò của mình sau khi bắt đầu.</p><div class="preset-readonly">${cards||'<p>Đang chọn bài...</p>'}</div><div class="notice">☾ Bạn đã vào phòng thành công. Hãy gửi mã <b>${esc(s.code)}</b> cho bạn bè và chờ chủ phòng bắt đầu.</div></section>`;
  }
  function targetSelect(s, key, {excludeMe=true, excludeWolves=false, exclude=null, allowAbstain=false, placeholder='Chọn một người...'}={}) {
    const options = s.players.filter(p=>p.alive && (!excludeMe||p.id!==s.me.id) && (!excludeWolves || p.role!=='wolf') && p.id!==exclude);
    return `<select class="select" data-draft-key="${esc(key)}" id="${esc(key)}"><option value="">${placeholder}</option>${allowAbstain?'<option value="abstain">⭕ Bỏ phiếu trắng</option>':''}${options.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select>`;
  }
  function actionBlock(title, hint, inner) { return `<section class="action-block"><h3>${title}</h3><p class="hint">${hint}</p>${inner}</section>`; }
  function renderNight(s) {
    let body = '';
    if(!s.me.alive) body = '<div class="notice danger-box">Bạn đã bị loại. Bạn có thể theo dõi trận đấu nhưng không được sử dụng chức năng hoặc trò chuyện với người sống.</div>';
    else if(s.me.role === 'wolf') {
      const mates = s.players.filter(p=>p.role==='wolf'&&p.id!==s.me.id).map(p=>esc(p.name)).join(', ') || 'Không có';
      const votes = Object.entries(s.wolfVotes || {}).map(([id,name])=>`<div>🐺 ${esc(s.players.find(p=>p.id===id)?.name)} đã chọn <b>${esc(name)}</b></div>`).join('');
      body = actionBlock('🐺 Ma Sói chọn nạn nhân',`Đồng đội: ${mates}. Nếu các mục tiêu cao phiếu nhất hòa nhau thì không ai bị Sói hạ.`,
        `<div class="action-line">${targetSelect(s,'wolf-target',{excludeWolves:true})}<button class="btn btn-primary" data-action="wolf-vote">XÁC NHẬN</button></div>
         ${s.myWolfVote?`<div class="notice success-box">Đã chọn: <b>${esc(s.players.find(p=>p.id===s.myWolfVote)?.name)}</b>. Có thể đổi đến khi hết đêm.</div>`:''}
         <div class="night-vote-list">${votes || 'Chưa có lượt chọn nào từ phe Sói.'}</div>`);
    } else if(s.me.role === 'seer') {
      const seen = s.seerResult;
      body = actionBlock('🔮 Tiên Tri soi thân phận','Chọn một người để biết họ có thuộc phe Ma Sói hay không. Mỗi đêm được soi 1 lần.',
        seen ? `<div class="notice ${seen.isWolf?'danger-box':'success-box'}">${seen.isWolf?'🐺':'✨'} <b>${esc(s.players.find(p=>p.id===seen.targetId)?.name)}</b> ${seen.isWolf?'LÀ MA SÓI':'KHÔNG PHẢI MA SÓI'}. Đây là kết quả bí mật của bạn.</div>` :
        `<div class="action-line">${targetSelect(s,'seer-target')}<button class="btn btn-primary" data-action="seer-check">SOI NGAY</button></div>`);
    } else if(s.me.role === 'guard') {
      const current = s.guardChoice && s.players.find(p=>p.id===s.guardChoice)?.name;
      body = actionBlock('🛡️ Bảo Vệ che chở', 'Chọn một người để che chở khỏi đòn của Sói. Không thể bảo vệ cùng người hai đêm liên tiếp.',
        `<div class="action-line">${targetSelect(s,'guard-target',{excludeMe:false,exclude:s.previousGuard})}<button class="btn btn-primary" data-action="guard-save">BẢO VỆ</button></div>
         ${current?`<div class="notice success-box">Đang bảo vệ: <b>${esc(current)}</b></div>`:''}`);
    } else if(s.me.role === 'witch') {
      const potions = s.witchPotions || {heal:0, poison:0};
      const wolfVictim = s.currentWolfTarget && s.players.find(p=>p.id===s.currentWolfTarget)?.name;
      body = actionBlock('🧪 Phù Thủy điều chế thuốc','Bình cứu và bình độc mỗi loại chỉ sử dụng một lần trong cả ván. Lựa chọn chỉ được tính khi chủ phòng kết thúc đêm.',
        `<div class="notice">${wolfVictim?`🔎 Sói hiện đang nhắm vào <b>${esc(wolfVictim)}</b>.`:'🔎 Chưa có nạn nhân Sói rõ ràng (hoặc phiếu Sói đang hòa).'}</div>
        <p class="small muted">💚 Bình cứu: <b>${potions.heal?'Còn 1':'Đã dùng'}</b> &nbsp; • &nbsp; 🩸 Bình độc: <b>${potions.poison?'Còn 1':'Đã dùng'}</b></p>
        <label class="checkbox-row"><input type="checkbox" data-draft-key="witch-save" id="witch-save" ${!potions.heal||!wolfVictim?'disabled':''} ${s.witchChoice?.save?'checked':''} /> 💚 Dùng thuốc cứu nạn nhân của Sói</label>
        <label class="field"><span>🩸 Dùng thuốc độc (không bắt buộc)</span>${potions.poison?targetSelect(s,'witch-poison',{excludeMe:false,placeholder:'Không dùng bình độc'}):'<div class="muted small">Bình độc đã sử dụng.</div>'}</label>
        <button class="btn btn-primary wide" data-action="witch-potions">XÁC NHẬN LỰA CHỌN</button>
        ${s.witchChoice?'<div class="notice success-box">Lựa chọn đã được ghi nhận. Bạn có thể điều chỉnh trước khi trời sáng.</div>':''}`);
    } else if(s.me.role === 'hunter') {
      body = '<div class="notice">🏹 Thợ Săn không hành động trong đêm. Nếu bị loại, bạn sẽ có cơ hội sử dụng phát súng cuối cùng.</div>';
    } else body = '<div class="notice">🏡 Dân Làng hãy ngủ yên. Khi trời sáng, bạn sẽ có quyền thảo luận và bỏ phiếu tìm Sói.</div>';
    const hostAction = s.me.isHost ? `<div class="line"></div><button class="btn btn-gold btn-large" data-action="finish-night">☀️ KẾT THÚC ĐÊM • TRỜI SÁNG</button><p class="tiny muted" style="text-align:center">Đã nhận ${s.wolfVoteCount}/${s.wolfCount || '?'} lượt chọn từ Ma Sói. Chủ phòng tự quyết định thời điểm kết thúc đêm.</p>` : '';
    return `<section class="glass content-card"><div class="eyebrow">HÀNH ĐỘNG ĐÊM ${s.nightNumber}</div><h2>${s.me.alive?'Vai trò của bạn':'Theo dõi màn đêm'}</h2><p class="desc">Mọi lựa chọn đều được gửi riêng về máy chủ, người chơi khác không nhìn thấy.</p>${body}${hostAction}</section>`;
  }
  function renderDay(s) {
    const deaths = s.nightResult && s.nightResult.number===s.nightNumber ? s.nightResult.dead : [];
    const deathInfo = deaths.length ? `Người bị loại đêm qua: <b>${deaths.map(d=>esc(d.name)).join(', ')}</b>.`:'Đêm qua bình an, không ai bị loại.';
    const live = s.players.filter(p=>p.alive);
    const voteRows = live.map(p=>{
      const votes = s.dayVotes[p.id]||0, pct=s.dayVoters?Math.round(votes/s.dayVoters*100):0;
      return `<div class="vote-line"><div><span class="semi">${esc(p.name)}</span><div class="mini-progress"><span style="width:${pct}%"></span></div></div><b>${votes} phiếu</b></div>`;
    }).join('');
    const selected = s.myDayVote && s.myDayVote!=='abstain' ? s.players.find(p=>p.id===s.myDayVote)?.name : s.myDayVote==='abstain'?'Bỏ phiếu trắng':null;
    return `<section class="glass content-card"><div class="eyebrow">THẢO LUẬN & BIỂU QUYẾT</div><h2>🗳️ Ai là Ma Sói?</h2><div class="notice ${deaths.length?'danger-box':'success-box'}">${deathInfo}</div><p class="desc" style="margin-top:16px">Hãy trao đổi trong khung chat. Mỗi người còn sống có một lá phiếu, có thể thay đổi trước khi chủ phòng đóng biểu quyết.</p>
      ${s.me.alive ? actionBlock('Lá phiếu của bạn', 'Chọn người bạn nghi ngờ hoặc bỏ phiếu trắng.',
        `<div class="action-line">${targetSelect(s,'day-target',{allowAbstain:true})}<button class="btn btn-primary" data-action="day-vote">BỎ PHIẾU</button></div>${selected?`<div class="notice success-box">Lá phiếu hiện tại: <b>${esc(selected)}</b>.</div>`:''}`) : '<div class="notice danger-box">Bạn đã bị loại và không thể bỏ phiếu hoặc thảo luận.</div>'}
      <h3 class="small upper">KẾT QUẢ TẠM THỜI • ${s.dayVoters}/${s.aliveCount} ĐÃ BỎ PHIẾU</h3><div class="progress"><div class="progress-fill" style="width:${Math.round(s.dayVoters/Math.max(1,s.aliveCount)*100)}%"></div></div>
      <div style="margin-top:13px">${voteRows}</div>
      ${s.me.isHost?'<div class="line"></div><button class="btn btn-gold btn-large" data-action="finish-day">⚖ CÔNG BỐ KẾT QUẢ BIỂU QUYẾT</button>':''}
    </section>`;
  }
  function renderDayResult(s) {
    return `<section class="glass content-card"><div class="eyebrow">KẾT QUẢ NGÀY ${s.nightNumber}</div><h2>⚖ Phán quyết đã được đưa ra</h2>
      <div class="result-big">${s.dayResult?.name?`<p>Người bị dân làng bỏ phiếu loại:</p><h3>${esc(s.dayResult.name)}</h3>`:'<h3>KHÔNG AI BỊ LOẠI</h3><p>Phiếu hòa hoặc không có người nhận đủ phiếu vượt trội.</p>'}</div>
      ${s.me.isHost?'<button class="btn btn-gold btn-large" data-action="continue">☾ BẮT ĐẦU ĐÊM TIẾP THEO</button>':'<div class="notice">Chờ chủ phòng bắt đầu đêm tiếp theo...</div>'}
    </section>`;
  }
  function renderHunter(s) {
    const onTurn = s.hunterTurn===s.me.id;
    const missingHunter = s.players.find(p=>p.id===s.hunterTurn)?.connected === false;
    return `<section class="glass content-card"><div class="eyebrow">THỜI KHẮC QUYẾT ĐỊNH</div><h2>🏹 Mũi tên cuối cùng</h2>
      ${onTurn ? actionBlock('Bạn là Thợ Săn!','Bạn đã bị loại. Hãy chọn một người đang sống để bắn hoặc bỏ qua lượt.',
        `<div class="action-line">${targetSelect(s,'hunter-target',{excludeMe:false,allowAbstain:false})}<button class="btn btn-danger" data-action="hunter-shot">BẮN MỤC TIÊU</button></div><button class="btn btn-ghost wide" style="margin-top:9px" data-action="hunter-pass">BỎ QUA PHÁT SÚNG</button>`) : '<div class="notice warning">🏹 Thợ Săn đang chọn mục tiêu. Cả làng vui lòng chờ...</div>'}
      ${s.me.isHost && missingHunter ? '<button class="btn btn-ghost wide" data-action="hunter-skip" style="margin-top:12px">BỎ QUA LƯỢT THỢ SĂN MẤT KẾT NỐI</button>' : ''}
    </section>`;
  }
  function renderEnded(s) {
    const people = s.players.map(p=>`<div class="reveal-person">${esc(p.name)} <b>${roleMap[p.role]?.icon||''} ${roleMap[p.role]?.label||''}</b></div>`).join('');
    return `<section class="glass content-card"><div class="eyebrow">BÍ MẬT ĐÃ ĐƯỢC HÉ LỘ</div><h2>🏆 Tổng kết trận đấu</h2><p class="desc">Phe ${s.winner==='wolf'?'Ma Sói':'Dân Làng'} đã chiến thắng. Danh tính của tất cả người chơi:</p><div class="reveal-list">${people}</div>
    ${s.me.isHost?'<div class="line"></div><button class="btn btn-gold btn-large" data-action="restart">↻ CHƠI VÁN MỚI VỚI PHÒNG NÀY</button>':''}</section>`;
  }
  function renderEvents(s) {
    const events = s.events.slice().reverse().map(e=>`<div class="event-row"><span class="event-dot ${esc(e.kind)}"></span><div style="flex:1">${esc(e.text)}</div><time class="event-time">${fmtTime(e.at)}</time></div>`).join('');
    return `<section class="glass content-card"><div class="panel-heading"><h2>✧ NHẬT KÝ NGÔI LÀNG</h2><span class="sub">Cập nhật trực tiếp</span></div><div class="events">${events||'<div class="empty">Chưa có hoạt động.</div>'}</div></section>`;
  }
  function renderChat(s) {
    const wolfChat = s.me.role==='wolf';
    const channel = chatTab==='wolf' && wolfChat ? 'wolf':'public';
    const messages = channel==='wolf' ? s.wolfMessages : s.messages;
    const bubbleHtml = messages.map(m=>`<div class="chat-bubble ${m.from===s.me.id?'mine':''}"><div class="chat-who">${esc(m.name)} · ${fmtTime(m.at)}</div><div class="chat-text">${esc(m.text)}</div></div>`).join('');
    const allowed = canChat(s);
    return `<aside class="glass chat-panel"><div class="chat-head"><div class="panel-heading" style="margin:0"><h2>💬 TRÒ CHUYỆN</h2><span class="tag tag-green">● LIVE</span></div>
      ${wolfChat?`<div class="chat-tabs"><button class="chat-tab ${channel==='public'?'selected':''}" data-action="chat-tab" data-tab="public">🏡 Chat ngôi làng</button><button class="chat-tab ${channel==='wolf'?'selected':''}" data-action="chat-tab" data-tab="wolf">🐺 Chat phe Sói</button></div>`:''}</div>
      <div class="chat-messages">${bubbleHtml||`<div class="empty">${channel==='wolf'?'Kênh bí mật chỉ dành cho Ma Sói.':'Hãy mở lời để cuộc chơi bắt đầu...'}<br/>✦</div>`}</div>
      ${allowed?`<form class="chat-compose" id="chat-form"><input aria-label="Nhập tin nhắn" name="message" data-draft-key="chat-message" autocomplete="off" maxlength="320" placeholder="Nhập tin nhắn..." required/><button class="btn btn-primary" type="submit">GỬI ↗</button></form>`:`<div class="chat-disabled">${channel==='wolf'?'🐺 Chat Sói chỉ mở ban đêm khi bạn còn sống.':s.phase==='night'?'☾ Mọi người đang ngủ. Chat làng tạm khóa.':!s.me.alive?'🔒 Người bị loại không thể gửi tin nhắn.':'💬 Chat chưa khả dụng ở giai đoạn này.'}</div>`}
      <div class="chat-tip">${channel==='wolf'?'🔒 Chỉ Ma Sói thấy được tin nhắn này.':'⚠️ Đừng tiết lộ lá bài của mình một cách vô ý nhé!'}</div>
    </aside>`;
  }
  function renderRoom(s) {
    let content;
    switch(s.phase) {
      case 'lobby':content=s.me.isHost?renderDeck(s):renderGuestLobby(s);break;
      case 'night':content=renderNight(s);break;
      case 'day':content=renderDay(s);break;
      case 'day_result':content=renderDayResult(s);break;
      case 'hunter':content=renderHunter(s);break;
      default:content=renderEnded(s);
    }
    return `<div class="shell">${renderTopbar(s)}<main class="room-layout">
      ${renderPlayers(s)}
      <div class="game-center">${renderPhase(s)}${secretCard(s)}${content}${renderEvents(s)}</div>
      ${renderChat(s)}</main><footer class="room-footer">✧ MA SÓI ONLINE • VAI TRÒ BÍ MẬT • 5–30 NGƯỜI CHƠI ✧</footer></div>`;
  }

  async function connect() {
    if(!session) return;
    source?.close();
    state = null;
    render();
    try {
      const res = await fetch(`/api/state?room=${encodeURIComponent(session.roomCode)}&token=${encodeURIComponent(session.token)}`);
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Không thể nối lại phòng chơi.');
      state = data.state;
      render();
      source = new EventSource(`/api/events?room=${encodeURIComponent(session.roomCode)}&token=${encodeURIComponent(session.token)}`);
      source.addEventListener('state', ev=> { try { state = JSON.parse(ev.data);render(); } catch(e){ console.error(e); } });
      source.addEventListener('removed', () => { resetSession();notify('Bạn đã rời phòng chơi.'); });
    } catch(e) { resetSession();notify(e.message,true); }
  }
  function resetSession() {
    source?.close();source=null;state=null;chatTab='public';drafts={};storeSession(null);
    history.replaceState(null,'',location.pathname);
    urlRoom='';render();
  }
  async function beginRoom(type, data) {
    if(busy) return;
    busy=true;
    try {
      const result = await call(type, data);
      storeSession({roomCode:result.roomCode,token:result.token});
      history.replaceState(null,'',`?room=${result.roomCode}`);
      urlRoom=result.roomCode;
      chatTab='public';drafts={};
      await connect();
      notify(type==='create'?'Đã tạo phòng! Mời bạn bè cùng tham gia.':'Chào mừng bạn đến ngôi làng!');
    } catch(e) {notify(e.message,true);} finally {busy=false;}
  }

  document.addEventListener('submit', async e => {
    const form = e.target;
    if(!(form instanceof HTMLFormElement)) return;
    e.preventDefault();
    if(form.id==='create-form') {
      const name=form.elements.name.value.trim();drafts.homeName=name;
      await beginRoom('create',{name});
    } else if(form.id==='join-form') {
      const name=form.elements.name.value.trim(),roomCode=form.elements.roomCode.value.trim().toUpperCase();
      drafts.homeName=name;await beginRoom('join',{name,roomCode});
    } else if(form.id==='chat-form') {
      const input=form.elements.message;
      const text=input.value.trim();
      if(!text)return;
      const channel = chatTab==='wolf'?'wolf':'public';
      input.value='';drafts['chat-message']='';
      await action('chat',{text,channel});
      input.focus();
    }
  });
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-action]');if(!el)return;
    const which = el.dataset.action;
    if(which==='copy') {
      const link=location.origin+'/?room='+state.code;
      try {await navigator.clipboard.writeText(link);notify('Đã sao chép đường dẫn mời vào phòng!');}
      catch {window.prompt('Sao chép đường dẫn này:',link);}
      return;
    }
    if(which==='chat-tab') {chatTab=el.dataset.tab;delete drafts['chat-message'];render();return;}
    if(which==='leave') {
      if(!confirm('Bạn muốn rời phòng? Nếu đang chơi, nhân vật của bạn vẫn ở trong ván và có thể quay lại bằng phiên đã lưu.'))return;
      await action('leave');resetSession();return;
    }
    if(['finish-night','finish-day','restart'].includes(which)) {
      if(!confirm(which==='finish-night'?'Kết thúc đêm và xử lý các hành động đã nhận?':which==='finish-day'?'Khóa biểu quyết và công bố kết quả?':'Bắt đầu chuẩn bị ván mới?'))return;
    }
    if(which==='role-count') return action(which,{role:el.dataset.role,change:Number(el.dataset.change)});
    if(which==='preset') return action(which,{mode:el.dataset.mode});
    if(which==='kick') {if(confirm('Mời người chơi này ra khỏi phòng?'))await action(which,{targetId:el.dataset.id});return;}
    if(['start','finish-night','finish-day','continue','restart'].includes(which)) return action(which);
    const targets = {
      'wolf-vote':'wolf-target','seer-check':'seer-target','guard-save':'guard-target','day-vote':'day-target','hunter-shot':'hunter-target'
    };
    if(targets[which]) {
      const targetId=document.getElementById(targets[which])?.value;
      if(!targetId){notify('Hãy chọn một người trước.',true);return;}
      return action(which,{targetId});
    }
    if(which==='hunter-pass') return action('hunter-shot',{targetId:'pass'});
    if(which==='hunter-skip') { if(confirm('Thợ Săn đã mất kết nối. Bỏ qua lượt bắn để tiếp tục ván?')) return action('hunter-skip'); return; }
    if(which==='witch-potions') return action(which,{
      save:!!document.getElementById('witch-save')?.checked,
      poisonTargetId:document.getElementById('witch-poison')?.value||null
    });
  });
  if(session && (!urlRoom || session.roomCode===urlRoom)) connect();
  else {if(session&&urlRoom&&session.roomCode!==urlRoom) storeSession(null);render();}
})();
