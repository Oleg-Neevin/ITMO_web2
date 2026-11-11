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
const body = document.querySelector('#results-table tbody');
const info = document.getElementById('info');

const texts = {
    'bad x': 'Некорректное значение X',
    'bad y': 'Некорректное значение Y',
    'y out of range': 'Y должен быть в диапазоне от -3 до 5',
    'bad r': 'Некорректное значение R'
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

async function ask(q) {
    const res = await fetch('/fcgi-bin/?' + q);
    const d = await res.json();
    if (!res.ok) throw new Error(texts[d.error] || d.error);
    return d;
}

function show(d) {
    body.innerHTML = '';
    for (let i = d.history.length - 1; i >= 0; i--) {
        const e = d.history[i];
        const tr = document.createElement('tr');
        const cells = [e.x, e.y, e.r, e.hit ? 'Попадание' : 'Промах',
            new Date(e.time).toLocaleString('ru-RU')];
        cells.forEach((v, j) => {
            const td = document.createElement('td');
            td.textContent = v;
            if (j === 3) td.className = e.hit ? 'hit' : 'miss';
            tr.appendChild(td);
        });
        body.appendChild(tr);
    }
    info.textContent = 'Текущее время: ' + new Date(d.now).toLocaleString('ru-RU') +
        ', время работы скрипта: ' + d.micros + ' мкс';
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
        const d = await ask(q);
        const p = d.history[d.history.length - 1];
        last = {x: p.x, y: p.y, hit: p.hit};
        draw(parseFloat(r));
        show(d);
    } catch (err) {
        yErr.textContent = err.message;
    }
});

window.addEventListener('resize', resize);
resize();
ask('').then(show).catch(() => {
    info.textContent = 'Сервер недоступен';
});