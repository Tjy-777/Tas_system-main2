document.addEventListener('DOMContentLoaded', async () => {
    const receiptList = document.getElementById('checkout-receipt-list');
    const totalAmountEl = document.getElementById('checkout-total-amount');
    const headerTotalEl = document.getElementById('header-total');
    const displayMessageEl = document.querySelector('.display-message');
    const clerkLabel = document.getElementById('clerk-label-checkout');

    const clerkId = localStorage.getItem('pos_clerk_id') || sessionStorage.getItem('pos_clerk_id') || '1001';
    if (clerkLabel) clerkLabel.textContent = `担当: ${clerkId}`;

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

    let productsMaster = {};
    try {
        let res = await fetch('php/api_products.php');
        if (res.ok) {
            productsMaster = await res.json();
        }
    } catch (e) {
        console.error("商品マスタの読み込みに失敗:", e);
    }

    if (receiptList) {
        receiptList.innerHTML = '';
        
        cart.forEach(item => {
            const barcode = item.barcode || item.item_id || item.code || item.id || "";
            const master = productsMaster[barcode] || {};
            const itemName = item.item_name || item.name || master.name || master.item_name || "商品名不明";
            
            let itemPrice = 0;
            if (item.selling_price !== undefined) itemPrice = Number(item.selling_price);
            else if (item.price !== undefined) itemPrice = Number(item.price);
            else if (master.price !== undefined) itemPrice = Number(master.price);

            const quantity = Number(item.quantity || item.qty || 1);
            const subtotal = itemPrice * quantity;
            total += subtotal;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'receipt-item';
            itemDiv.innerHTML = `
                <div class="top">
                    <span>${itemName}</span>
                    <span>¥${subtotal.toLocaleString()}</span>
                </div>
                <div class="bottom">
                    <span>¥${itemPrice.toLocaleString()} × ${quantity}</span>
                </div>
            `;
            receiptList.appendChild(itemDiv);
        });
    }

    const totalStr = `¥${total.toLocaleString()}`;
    if (totalAmountEl) totalAmountEl.textContent = totalStr;
    if (headerTotalEl) headerTotalEl.textContent = totalStr;

    if (displayMessageEl) displayMessageEl.textContent = "ｵｼﾊﾗｲﾎｳﾎｳ ｦ ｾﾝﾀｸ"; 

    let isProcessing = false;
    const payBtns = {
        '現金': document.getElementById('btn-pay-cash'),
        'クレジットカード': document.getElementById('btn-pay-credit'),
        'バーコード決済': document.getElementById('btn-pay-barcode'),
        '電子マネー': document.getElementById('btn-pay-e-money'),
    };

    for (const [method, btn] of Object.entries(payBtns)) {
        if (!btn) continue;
        
        btn.addEventListener('click', async () => {
            if (isProcessing) return;
            
            const methodNames = { 'cash': '現金', 'credit': 'クレジット', 'qr': 'QR決済' };
            if (!confirm(`${methodNames[method]} でお会計を確定しますか？`)) {
                return;
            }

            isProcessing = true;
            if (displayMessageEl) displayMessageEl.textContent = "ｹｯｻｲ ｼｮﾘﾁｭｳ...";

            try {
                const payload = {
                    payment_method: method,
                    total_amount: total,
                    cart: cart.map(item => {
                        const barcode = item.barcode || item.item_id || item.code || item.id || "";
                        const master = productsMaster[barcode] || {};
                        const itemPrice = item.selling_price || item.price || master.price || 0;
                        const quantity = item.quantity || item.qty || 1;
                        return {
                            barcode: barcode,
                            qty: Number(quantity),   // ★ここをPHPの要求通り `qty` に修正！
                            price: Number(itemPrice) // ★ここをPHPの要求通り `price` に修正！
                        };
                    })
                };

                // ★PHPファイルがある「php/」フォルダを指定
                const response = await fetch('php/record_sale.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // ★エラー原因特定のため、JSONではなく一度生テキストとして受け取る
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
                    
                    alert("お会計が完了しました！");
                    window.location.href = 'Tas.html';
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
