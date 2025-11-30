/* -----------------------------------
    AUTO HIDE LOADER
----------------------------------- */
window.addEventListener("load", () => {
    setTimeout(() => {
        const ld = document.getElementById("loader");
        ld.style.opacity = "0";
        setTimeout(() => ld.style.display = "none", 600);
    }, 900);
});


/* -----------------------------------
    GLOBALS
----------------------------------- */
let priceHistory = [];
let timeframe = 60;
let activeChain = "";
let activePair = "";
let feedTimer = null;


/* -----------------------------------
    SET TIMEFRAME
----------------------------------- */
function setTimeframe(tf) {
    timeframe = tf;
    drawCandles();
}


/* -----------------------------------
    MAIN SCAN
----------------------------------- */
async function scanToken() {
    const ca = document.getElementById("ca").value.trim();
    if (!ca) return;

    try {
        const url = `https://api.dexscreener.com/latest/dex/tokens/${ca}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.pairs || data.pairs.length === 0) {
            document.getElementById("result").innerHTML =
                "<h3 style='color:red'>❌ Token Not Found</h3>";
            return;
        }

        const t = data.pairs[0];

        activeChain = t.chain;       // FIXED
        activePair = t.pairAddress;  // FIXED

        const name = t.baseToken.name;
        const symbol = t.baseToken.symbol;

        document.getElementById("result").innerHTML = `
            <h2>${name} (${symbol})</h2>
            <img src="${t.info?.imageUrl || 'https://i.imgur.com/7YUyFyl.png'}"
                 width="80" style="border-radius:50%; margin:10px 0;">
            <p><b>Price:</b> $${t.priceUsd}</p>
            <p><b>Liquidity:</b> $${t.liquidity.usd}</p>
            <p><b>Market Cap:</b> $${t.fdv}</p>
            <p><b>24h Volume:</b> $${t.volume.h24}</p>
        `;

        // reset
        priceHistory = [];

        if (feedTimer) clearInterval(feedTimer);

        feedTimer = setInterval(fetchLivePrice, 2000);
    }
    catch (err) {
        console.log("SCAN ERROR:", err);
    }
}


/* -----------------------------------
    FETCH LIVE PRICE
----------------------------------- */
async function fetchLivePrice() {

    if (!activeChain || !activePair) return;

    try {
        const url = `https://api.dexscreener.com/latest/dex/pairs/${activeChain}/${activePair}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.pair || !data.pair.priceUsd) {
            console.log("NO PRICE YET");
            return;
        }

        const price = parseFloat(data.pair.priceUsd);

        priceHistory.push({
            t: Math.floor(Date.now() / 1000),
            p: price,
        });

        drawCandles();
    }
    catch (err) {
        console.log("FETCH PRICE ERROR:", err);
    }
}


/* -----------------------------------
    DRAW CANDLES
----------------------------------- */
function drawCandles() {

    const canvas = document.getElementById("candleCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (priceHistory.length < 3) return;

    let candles = [];

    let start = priceHistory[0].t;
    let end = priceHistory.at(-1).t;

    for (let t = start; t < end; t += timeframe) {

        const group = priceHistory.filter(
            x => x.t >= t && x.t < t + timeframe
        );

        if (group.length < 1) continue;

        candles.push({
            open: group[0].p,
            close: group.at(-1).p,
            high: Math.max(...group.map(e => e.p)),
            low: Math.min(...group.map(e => e.p)),
        });
    }

    if (candles.length < 1) return;

    let maxPrice = Math.max(...candles.map(c => c.high));
    let minPrice = Math.min(...candles.map(c => c.low));

    let width = canvas.width / candles.length;

    candles.forEach((c, i) => {

        let x = i * width + width * 0.2;

        let up = c.close >= c.open;
        let color = up ? "#00E8A2" : "#e74c3c";

        let yHigh  = scale(c.high,  maxPrice, minPrice, canvas.height);
        let yLow   = scale(c.low,   maxPrice, minPrice, canvas.height);
        let yOpen  = scale(c.open,  maxPrice, minPrice, canvas.height);
        let yClose = scale(c.close, maxPrice, minPrice, canvas.height);

        // WICK
        ctx.beginPath();
        ctx.moveTo(x + width/2, yHigh);
        ctx.lineTo(x + width/2, yLow);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // BODY
        ctx.fillStyle = color;
        ctx.fillRect(
            x,
            Math.min(yOpen, yClose),
            width * 0.6,
            Math.abs(yOpen - yClose)
        );
    });
}


/* -----------------------------------
    SCALE VALUE
----------------------------------- */
function scale(val, max, min, height) {
    return ((max - val) / (max - min)) * height;
}
