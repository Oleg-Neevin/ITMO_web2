const cv = document.getElementById('graph');
const ctx = cv.getContext('2d');
const M = 5.5;
let w, c, k;
let last = null;

const form = document.getElementById('point-form');
const xSel = document.getElementById('x-select');
const yInp = document.getElementById('y-input');
const xErr = document.getElementById('x-error');
const yErr = document.getElementById('y-error');
const rErr = document.getElementById('r-error');
const info = document.getElementById('info');

const sizeSel = document.getElementById('size-select');

let sv = {};
try { sv = JSON.parse(localStorage.getItem('pg')) || {}; } catch (e) {}
if ([...sizeSel.options].some(o => o.value === sv.size)) sizeSel.value = sv.size;

function save() {
    const o = {size: sizeSel.value};
    Object.keys(st).forEach(n => o[n] = st[n].page);
    try { localStorage.setItem('pg', JSON.stringify(o)); } catch (e) {}
}

const st = {};
document.querySelectorAll('.node').forEach(e => {
    const n = e.dataset.node;
    const s = {page: Number.isInteger(sv[n]) && sv[n] > 0 ? sv[n] : 1, pages: 1};
    s.tb = e.querySelector('tbody');
    s.num = e.querySelector('.num');
    s.msg = e.querySelector('.msg');
    s.prev = e.querySelector('.prev');
    s.next = e.querySelector('.next');
    s.prev.onclick = () => { s.page--; load(n); };
    s.go = e.querySelector('.go');
    s.go.onchange = () => {
        const v = s.go.value.trim();
        if (!/^\d+$/.test(v) || +v < 1 || +v > s.pages) {
            s.go.value = s.page;
            s.msg.textContent = 'Страница от 1 до ' + s.pages;
            return;
        }
        s.page = +v;
        load(n);
    };
    s.next.onclick = () => { s.page++; load(n); };
    st[n] = s;
});

const texts = {
    'bad x': 'Некорректное значение X',
    'bad y': 'Некорректное значение Y',
    'y out of range': 'Y должен быть в диапазоне от -3 до 5',
    'bad r': 'Некорректное значение R',
    'bad page': 'Некорректная страница',
    'bad size': 'Некорректный размер страницы',
    'down': 'Узел недоступен'
};

function getR() {
    const e = document.querySelector('input[name="r"]:checked');
    return e ? e.value : null;
}

function resize() {
    const s = cv.clientWidth;
    if (cv.width !== s) {
        cv.width = s;
        cv.height = s;
    }
    w = cv.width;
    c = w / 2;
    k = c / M;
    draw(parseFloat(getR()) || 0);
}

function draw(r) {
    ctx.clearRect(0, 0, w, w);

    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let v = -5; v <= 5; v++) {
        if (v === 0) continue;
        ctx.moveTo(c + v * k, 0);
        ctx.lineTo(c + v * k, w);
        ctx.moveTo(0, c + v * k);
        ctx.lineTo(w, c + v * k);
    }
    ctx.stroke();

    if (r > 0) {
        ctx.fillStyle = '#3498db80';

        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(c + r * k, c);
        ctx.lineTo(c, c - r / 2 * k);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.arc(c, c, r / 2 * k, Math.PI / 2, Math.PI);
        ctx.closePath();
        ctx.fill();

        ctx.fillRect(c, c, r * k, r * k);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.moveTo(15, c);
    ctx.lineTo(w - 15, c);
    ctx.lineTo(w - 25, c - 6);
    ctx.moveTo(w - 15, c);
    ctx.lineTo(w - 25, c + 6);
    ctx.moveTo(c, w - 15);
    ctx.lineTo(c, 15);
    ctx.lineTo(c - 6, 25);
    ctx.moveTo(c, 15);
    ctx.lineTo(c + 6, 25);
    ctx.stroke();

    ctx.fillStyle = '#2c3e50';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('x', w - 10, c - 10);
    ctx.fillText('y', c + 12, 12);

    for (let v = -5; v <= 5; v++) {
        if (v === 0) continue;
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.moveTo(c + v * k, c - 5);
        ctx.lineTo(c + v * k, c + 5);
        ctx.moveTo(c - 5, c - v * k);
        ctx.lineTo(c + 5, c - v * k);
        ctx.stroke();
        ctx.fillText(v, c + v * k, c + 18);
        ctx.fillText(v, c - 16, c - v * k + 4);
    }

    if (last) {
        ctx.beginPath();
        ctx.arc(c + last.x * k, c - last.y * k, 6, 0, 2 * Math.PI);
        ctx.fillStyle = last.hit ? '#2ecc71' : '#e74c3c';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function checkY(s) {
    s = s.trim().replace(',', '.');
    if (s === '') return 'Введите число для Y!';
    if (!/^-?\d+(\.\d+)?$/.test(s)) return 'Значение Y должно быть числом!';
    const d = s.split('.')[1];
    if (d && d.length > 5) return 'Не более 5 знаков после запятой!';
    const y = parseFloat(s);
    if (y < -3 || y > 5) return 'Значение Y должно быть в диапазоне от -3 до 5!';
    return '';
}

async function ask(path, q) {
    let res, d;
    try {
        res = await fetch('/fcgi-bin/' + path + '?' + q);
        d = await res.json();
    } catch (e) {
        throw new Error(texts.down);
    }
    if (!res.ok) throw new Error(texts[d.error] || d.error);
    return d;
}

function tick(d) {
    info.textContent = 'Текущее время: ' + new Date(d.now).toLocaleString('ru-RU') +
        ', время работы скрипта: ' + d.micros + ' мкс';
}

async function load(n) {
    const s = st[n];
    try {
        const d = await ask(n + '/', new URLSearchParams({page: s.page, size: sizeSel.value}));
        s.page = d.page;
        s.pages = d.pages;
        s.msg.textContent = '';
        s.tb.innerHTML = '';
        d.items.forEach(e => {
            const tr = document.createElement('tr');
            [e.x, e.y, e.r, e.hit ? 'Попадание' : 'Промах',
                new Date(e.time).toLocaleString('ru-RU')].forEach((v, j) => {
                const td = document.createElement('td');
                td.textContent = v;
                if (j === 3) td.className = e.hit ? 'hit' : 'miss';
                tr.appendChild(td);
            });
            s.tb.appendChild(tr);
        });
        s.go.value = d.page;
        s.num.textContent = d.pages;
        save();
        s.prev.disabled = d.page <= 1;
        s.next.disabled = d.page >= d.pages;
        tick(d);
    } catch (err) {
        if (s.page > 1 && err.message === texts['bad page']) {
            s.page = 1;
            return load(n);
        }
        s.msg.textContent = err.message;
    }
}

document.querySelectorAll('input[name="r"]').forEach(e => {
    e.addEventListener('change', () => {
        last = null;
        draw(parseFloat(e.value));
    });
});

form.addEventListener('submit', async e => {
    e.preventDefault();
    xErr.textContent = '';
    rErr.textContent = '';
    yErr.textContent = checkY(yInp.value);

    const r = getR();
    if (r === null) rErr.textContent = 'Выберите R!';
    if (yErr.textContent || rErr.textContent) return;

    const q = new URLSearchParams({x: xSel.value, y: yInp.value.trim(), r: r});
    try {
        const d = await ask('', q);
        const p = d.point;
        last = {x: p.x, y: p.y, hit: p.hit};
        draw(parseFloat(r));
        tick(d);
        st[d.node].page = 1;
        load(d.node);
    } catch (err) {
        yErr.textContent = err.message;
    }
});

window.addEventListener('resize', resize);
resize();
sizeSel.addEventListener('change', () => {
    Object.keys(st).forEach(n => { st[n].page = 1; load(n); });
});
Object.keys(st).forEach(load);