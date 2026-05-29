// ==========================================
// 🌟 ブラウザの「戻る」ボタン（ブラウザバック）を禁止する処理
// ==========================================
history.pushState(null, null, location.href);

window.addEventListener('popstate', () => {
    history.pushState(null, null, location.href);
});

// お会計画面でもブラウザの「戻る」を禁止したい場合は、ここに以下の3行を入れます
history.pushState(null, null, location.href);
window.addEventListener('popstate', () => { history.pushState(null, null, location.href); });

document.addEventListener('DOMContentLoaded', async () => {
    const receiptList = document.getElementById('checkout-receipt-list');
    const totalAmountEl = document.getElementById('checkout-total-amount');
    const headerTotalEl = document.getElementById('header-total');
    const displayMessageEl = document.querySelector('.display-message');
    const clerkLabel = document.getElementById('clerk-label-checkout');

    // 担当者IDの取得
    const clerkId = localStorage.getItem('pos_clerk_id') || sessionStorage.getItem('pos_clerk_id') || '1001';
    if (clerkLabel) clerkLabel.textContent = `担当: ${clerkId}`;

    // 🌟 main.jsが保存する「current_cart」を最優先で読み込むように修正（NaN対策）
    const cartData = sessionStorage.getItem('current_cart') 
                  || localStorage.getItem('pos_current_cart') 
                  || localStorage.getItem('current_cart')
                  || sessionStorage.getItem('pos_current_cart');
                  
    let cart = cartData ? JSON.parse(cartData) : [];
    let total = 0;

    if (!cart || cart.length === 0) {
        alert("カートが空です。レジ画面に戻ります。");
        window.location.href = 'Tas.html';
        return;
    }

    // 商品マスタの読み込み
    let productsMaster = {};
    try {
        let res = await fetch('php/api_products.php');
        if (res.ok) {
            productsMaster = await res.json();
        }
    } catch (e) {
        console.error("商品マスタの読み込みに失敗:", e);
    }

    // レシートエリアに描画
    if (receiptList) {
        receiptList.innerHTML = '';
        
        cart.forEach(item => {
            const barcode = item.barcode || item.item_id || item.code || item.id || "";
            const master = productsMaster[barcode] || {};
            const itemName = item.item_name || item.name || master.name || master.item_name || "商品名不明";
            
            // 🌟 名前のズレ（selling_price か price か）を自動で吸収する（NaN対策）
            let itemPrice = 0;
            if (item.selling_price !== undefined) itemPrice = Number(item.selling_price);
            else if (item.price !== undefined) itemPrice = Number(item.price);
            else if (master.price !== undefined) itemPrice = Number(master.price);

            // 🌟 数量の名前のズレ（quantity か qty か）を自動で吸収する（undefined対策）
            const quantity = Number(item.quantity || item.qty || 1);
            const subtotal = itemPrice * quantity;
            total += subtotal;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'receipt-item';
            itemDiv.innerHTML = `
                <div class="top" style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold; margin-bottom: 5px;">
                    <span>${itemName}</span>
                    <span>¥${subtotal.toLocaleString()}</span>
                </div>
                <div class="bottom" style="text-align: right; color: #64748b; font-size: 1rem;">
                    <span>¥${itemPrice.toLocaleString()} × ${quantity}</span>
                </div>
            `;
            receiptList.appendChild(itemDiv);
        });
    }

    // 合計金額の反映
    const totalStr = `¥${total.toLocaleString()}`;
    if (totalAmountEl) totalAmountEl.textContent = totalStr;
    if (headerTotalEl) headerTotalEl.textContent = totalStr;

    if (displayMessageEl) displayMessageEl.textContent = "ｵｼﾊﾗｲﾎｳﾎｳ ｦ ｾﾝﾀｸ"; 

    // 🌟 お客様ディスプレイへの連動送信
    localStorage.setItem('customer_cart', JSON.stringify(cart));
    localStorage.setItem('customer_display_message', JSON.stringify({
        topText: "ｵｶｲｹｲ",
        bottomText: totalStr
    }));

    // --- 決済ボタンのクリック処理 ---
    let isProcessing = false;
    
    // 🌟 どんなID名でHTMLに書かれていても反応できるように候補をすべて指定
    const payBtns = {
        'cash': document.getElementById('btn-pay-cash'),
        'credit': document.getElementById('btn-pay-credit'),
        // バーコード決済（qr だったり barcode だったり code だったりしてもOK）
        'qr': document.getElementById('btn-pay-qr') || document.getElementById('btn-pay-barcode') || document.getElementById('btn-pay-code'),
        // 電子マネー（emoney だったり electronic だったり money だったりしてもOK）
        'emoney': document.getElementById('btn-pay-emoney') || document.getElementById('btn-pay-electronic') || document.getElementById('btn-pay-money')
    };

    for (const [method, btn] of Object.entries(payBtns)) {
        // ボタンが見つからなくてもスキップせず、ログに出して確認できるようにする
        if (!btn) {
            console.log(`ボタンが見つかりません: ${method}`);
            continue;
        }
        
        btn.addEventListener('click', async () => {
            if (isProcessing) return;
            
            // 🌟 ポップアップに表示する日本語名
            const methodNames = { 
                'cash': '現金', 
                'credit': 'クレジット', 
                'qr': 'バーコード決済', 
                'emoney': '電子マネー' 
            };
            
            if (!confirm(`${methodNames[method]} でお会計を確定しますか？`)) {
                return;
            }

            isProcessing = true;
            if (displayMessageEl) displayMessageEl.textContent = "ｹｯｻｲ ｼｮﾘﾁｭｳ...";

            try {
                const payload = {
                    payment_method: method, // PHP側には 'cash', 'credit', 'qr', 'emoney' が送られます
                    total_amount: total,
                    cart: cart.map(item => {
                        const barcode = item.barcode || item.item_id || item.code || item.id || "";
                        const master = productsMaster[barcode] || {};
                        const itemPrice = item.selling_price || item.price || master.price || 0;
                        const quantity = item.quantity || item.qty || 1;
                        return {
                            barcode: barcode,
                            qty: Number(quantity),
                            price: Number(itemPrice)
                        };
                    })
                };

                // PHPに売上データを送信
                const response = await fetch('php/record_sale.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const rawText = await response.text();

                if (!response.ok) {
                    throw new Error(`サーバーエラー (Status: ${response.status})\\n詳細: ${rawText}`);
                }

                let result;
                try {
                    result = JSON.parse(rawText);
                } catch (e) {
                    throw new Error(`PHPから不正なデータが返されました。PHPのエラー文:\\n${rawText}`);
                }

                if (result.success) {
                    if (displayMessageEl) displayMessageEl.textContent = "ｱﾘｶﾞﾄｳ ｺﾞｻﾞｲﾏｼﾀ!";
                    
                    sessionStorage.removeItem('current_cart');
                    localStorage.removeItem('pos_current_cart');
                    localStorage.setItem('customer_cart', JSON.stringify([]));
                    
                    alert("お会計が完了しました！");
                    window.location.replace('Tas.html');
                } else {
                    alert("決済エラー: " + result.message);
                    if (displayMessageEl) displayMessageEl.textContent = "ｹｯｻｲ ｴﾗｰ";
                    isProcessing = false;
                }

            } catch (error) {
                console.error("通信エラー詳細:", error);
                alert("エラーが発生しました。以下のメッセージを確認してください:\\n\\n" + error.message);
                if (displayMessageEl) displayMessageEl.textContent = "ﾂｳｼﾝ ｴﾗｰ";
                isProcessing = false;
            }
        });
    }
});
