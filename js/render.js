// render.js

/**
 * 画面描画担当
 */
export const Renderer = {
    // 【重要】データベースの連想配列形式に対応したグリッド生成
    initGrid(products, onAdd) {
        const grid = document.getElementById('item-grid');
        if (!grid) return;

        // PHPから届く products は { "コード": {商品情報}, ... } の形なので Object.keys を使う
        grid.innerHTML = Object.keys(products).map(code => {
            const p = products[code];
            return `<div class="grid-item" data-code="${code}" data-category="${p.category}">${p.name}</div>`;
        }).join('');

        // クリックイベントの設定
        grid.onclick = (e) => {
            const item = e.target.closest('.grid-item');
            if (item) onAdd(item.dataset.code);
        };
    },

    // レシート一覧の更新
    renderReceipt(cart, total) {
        const list = document.getElementById('receipt-list');
        if (!list) return;

        list.innerHTML = cart.map(item => `
            <div class="receipt-item">
                <div class="top"><span>${item.name}</span><span>¥${(item.price * item.qty).toLocaleString()}</span></div>
                <div class="bottom">
                    <span>¥${item.price.toLocaleString()}</span>
                    <div>
                        <button class="qty-btn" data-id="${item.id}" data-delta="-1">-</button>
                        ${item.qty}
                        <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('total-price').textContent = total.toLocaleString();
    },

    updateDisplay(item, msg = "") {
        document.getElementById('target-item-name').textContent = item ? (item.kana || item.name) : msg;
        document.getElementById('target-item-price').textContent = item ? `￥${item.price.toLocaleString()}` : "";
    },

    updateCalc(input) {
        const display = document.getElementById('calc-display');
        if (display) display.textContent = input;
    }
};