import { API } from './api.js';
import { CartStore } from './store.js';
import { Renderer } from './render.js';

const store = new CartStore();
let calcInput = "";

// ==========================================
// 🌟 ブラウザの「戻る」ボタン（ブラウザバック）を禁止する処理
// ==========================================
// 現在の画面の状態を履歴にダミーとして追加する
history.pushState(null, null, location.href);

// ユーザーが「戻る」を押した瞬間をキャッチして、進むのをブロックする
window.addEventListener('popstate', () => {
    history.pushState(null, null, location.href);
    // 必要であれば「レジ操作中は戻れません」などの警告を出すことも可能です
    // alert("レジ画面からは戻れません。"); 
});

async function init() {
    try {
        const data = await API.fetchProducts();
        store.setProducts(data);

        // 商品ボタンの生成とクリックイベントの設定
        Renderer.initGrid(data, (code) => handleAddToCart(code));

        // 担当者表示
        const clerk = localStorage.getItem('pos_clerk_id') || "----";
        const label = document.getElementById('clerk-label');
        if (label) label.textContent = `担当: ${clerk}`;

        setupEventListeners();
    } catch (e) {
        console.error("初期化失敗:", e);
    }
}

// 商品をカートに追加する共通処理
function handleAddToCart(code) {
    const p = store.add(code);
    if (p) {
        Renderer.renderReceipt(store.cart, store.getTotal());
        Renderer.updateDisplay(p);
    } else {
        alert("その商品は登録されていません");
    }
}

function setupEventListeners() {
    // --- カテゴリ切り替え ---
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.category;
            document.querySelectorAll('.grid-item').forEach(item => {
                item.style.display = (target === "すべて" || item.dataset.category === target) ? '' : 'none';
            });
        };
    });

    // --- モード切替（単品/コード入力） ---
    const btnSingle = document.getElementById('btn-mode-single');
    const btnCode = document.getElementById('btn-mode-code');
    const viewSingle = document.getElementById('view-single');
    const viewCode = document.getElementById('view-code');

    if (btnSingle && btnCode) {
        btnSingle.onclick = () => {
            btnSingle.classList.add('active'); btnCode.classList.remove('active');
            viewSingle.classList.remove('hidden'); viewCode.classList.add('hidden');
        };
        btnCode.onclick = () => {
            btnCode.classList.add('active'); btnSingle.classList.remove('active');
            viewCode.classList.remove('hidden'); viewSingle.classList.add('hidden');
            calcInput = "";
            Renderer.updateCalc("");
        };
    }

    // --- レシート内の数量変更ボタン (＋ / －) ---
    // --- レシート内の数量変更ボタン (＋ / －) ---
    document.getElementById('receipt-list').onclick = (e) => {
        const btn = e.target.closest('.qty-btn');
        if (btn) {
            const { id, delta } = btn.dataset;
            store.changeQty(id, parseInt(delta));
            Renderer.renderReceipt(store.cart, store.getTotal());

            // 🌟 追加：お客様ディスプレイの表示も更新する
            if (store.cart.length === 0) {
                // もしマイナスを押してカートが空っぽになったら初期画面に戻す
                Renderer.updateDisplay(null, "ｲﾗｯｼｬｲﾏｾ");
            } else {
                // まだ商品が残っている場合、操作した商品（またはカートの最後の商品）を表示して合計金額を更新
                const updatedItem = store.cart.find(item => item.item_id == id);
                if (updatedItem) {
                    Renderer.updateDisplay(updatedItem);
                } else {
                    Renderer.updateDisplay(store.cart[store.cart.length - 1]);
                }
            }
        }
    };

    // --- 電卓ボタン ---
    document.querySelectorAll('.num').forEach(btn => {
        btn.onclick = () => {
            if (calcInput.length < 13) {
                calcInput += btn.textContent;
                Renderer.updateCalc(calcInput);
            }
        };
    });

    // 削除ボタン
    document.getElementById('btn-calc-del').onclick = () => {
        calcInput = calcInput.slice(0, -1);
        Renderer.updateCalc(calcInput);
    };

    // 確定ボタン
    document.getElementById('btn-calc-enter').onclick = () => {
        if (calcInput) handleAddToCart(calcInput);
        calcInput = "";
        Renderer.updateCalc("");
    };

    // --- 全消去ボタン ---
    document.getElementById('btn-clear-all').onclick = () => {
        if (confirm("レシートをすべて消去しますか？")) {
            store.clear();
            Renderer.renderReceipt([], 0);
            Renderer.updateDisplay(null, "ｲﾗｯｼｬｲﾏｾ");
        }
    };

        // --- お会計ボタン ---
    document.getElementById('btn-checkout').onclick = () => {
        if (store.cart.length === 0) {
            alert("カートが空です");
            return;
        }

        // 1. カートの内容を一時保存（決済画面で読み取るため）
        sessionStorage.setItem('current_cart', JSON.stringify(store.cart));

        // 2. 決済画面へ移動
        location.href = 'checkout.html';
    };

        window.handleLogout = () => {
        // 確認ダイアログを出す
        const confirmLogout = confirm("レジを終了してログイン画面に戻りますか？");
        
        if (confirmLogout) {
            // カートの中身を空にする（任意）
            sessionStorage.removeItem('current_cart');
            
            // 担当者情報をクリアする（次にログインする人のために）
            localStorage.removeItem('pos_clerk_id');
            
            // ログイン画面へ戻る
            location.href = 'index.html';
        }
    };
// 🌟 会計履歴ポップアップの制御ロジック（スタイル分離版）
const historyModal = document.getElementById('history-modal');
const historyList = document.getElementById('history-list');

document.getElementById('btn-history').onclick = async () => {
    try {
        const response = await fetch('php/api_history.php');
        const result = await response.json();

        if (result.success) {
            historyList.innerHTML = ""; // テーブルをクリア

            result.history.forEach(detail => {
                const tr = document.createElement('tr');
                
                // 日時のフォーマット
                const date = new Date(detail.created_at);
                const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                
                // 決済方法の日本語化
                let methodText = detail.payment_method === 'cash' ? '現金' : detail.payment_method;

                // インラインstyleを排除し、CSSで定義したclass名を割り当てます
                tr.innerHTML = `
                    <td class="cell-id">#${detail.sale_id}</td>
                    <td class="cell-date">${dateStr}</td>
                    <td class="cell-name">${detail.item_name}</td>
                    <td class="cell-qty">${detail.quantity}個 × ¥${Number(detail.selling_price).toLocaleString()}</td>
                    <td class="cell-subtotal">¥${Number(detail.subtotal).toLocaleString()}</td>
                    <td class="cell-method">
                        <span class="history-badge">${methodText}</span>
                    </td>
                `;
                historyList.appendChild(tr);
            });

            // モーダルを表示
            historyModal.classList.remove('hidden');
        } else {
            alert(result.message);
        }
    } catch (e) {
        alert("通信に失敗しました。");
    }
};

// モーダルを閉じる
document.getElementById('btn-close-history').onclick = () => {
    historyModal.classList.add('hidden');
};
}

init();
