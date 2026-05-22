// js/checkout.js

const checkoutCart = JSON.parse(sessionStorage.getItem('current_cart') || "[]");
let cashInput = ""; 
let totalAmount = 0;
let changeAmount = 0; 

const init = () => {
    const clerk = localStorage.getItem('pos_clerk_id') || "----";
    const label = document.getElementById('clerk-label-checkout');
    if (label) label.textContent = `担当: ${clerk}`;
    updateCheckoutUI();
};

const updateCheckoutUI = () => {
    const list = document.getElementById('checkout-list');
    const totalDisp = document.getElementById('checkout-total-val');
    if (!list || !totalDisp) return;

    list.innerHTML = "";
    totalAmount = 0;

    checkoutCart.forEach((item) => {
        const sub = item.price * item.qty;
        totalAmount += sub;
        const row = document.createElement('div');
        row.className = 'receipt-item';
        row.innerHTML = `
            <div class="top"><span>${item.name}</span><span>¥${sub.toLocaleString()}</span></div>
            <div class="bottom"><span>@${item.price.toLocaleString()} x ${item.qty}個</span></div>`;
        list.appendChild(row);
    });
    totalDisp.textContent = totalAmount.toLocaleString();
    document.getElementById('display-total-val').textContent = totalAmount.toLocaleString();
};

/**
 * ★共通機能：売上をDBに送信する
 */
const saveSaleToDB = async (methodName) => {
    const payload = {
        payment_method: methodName,
        total_amount: totalAmount,
        cart: checkoutCart
    };

    try {
        const response = await fetch('php/record_sale.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        return result.success;
    } catch (e) {
        console.error("DB保存エラー:", e);
        return false;
    }
};

/**
 * 現金以外の決済 (DB保存を追加)
 */
window.finishPayment = async (methodName) => {
    const success = await saveSaleToDB(methodName);
    if (success) {
        alert(`${methodName}でお会計が完了しました。`);
        sessionStorage.removeItem('current_cart');
        location.href = 'Tas.html';
    } else {
        alert("売上データの保存に失敗しました。");
    }
};

/**
 * 現金決済完了 (DB保存を追加)
 */
window.finishCashPayment = async () => {
    const success = await saveSaleToDB('現金');
    if (success) {
        alert(`お会計完了\nお預かり：¥${Number(cashInput).toLocaleString()}\nお釣り：¥${changeAmount.toLocaleString()}`);
        sessionStorage.removeItem('current_cart');
        location.href = 'Tas.html';
    } else {
        alert("売上データの保存に失敗しました。");
    }
};

// テンキー入力などの関数
window.pressNum = (num) => {
    if (cashInput.length >= 8) return;
    cashInput += num;
    updateCashDisplay();
};

window.pressClear = () => {
    cashInput = "";
    updateCashDisplay();
};

const updateCashDisplay = () => {
    const paidDisp = document.getElementById('cash-val');
    const changeDisp = document.getElementById('change-val');
    const finishBtn = document.getElementById('btn-finish-cash');

    if (paidDisp) {
        paidDisp.textContent = cashInput === "" ? "0" : Number(cashInput).toLocaleString();
    }

    const paidNum = Number(cashInput);
    changeAmount = paidNum - totalAmount;

    if (changeDisp) {
        changeDisp.textContent = changeAmount.toLocaleString();
        if (changeAmount >= 0 && cashInput !== "") {
            changeDisp.style.color = "#1e293b";
            if (finishBtn) {
                finishBtn.disabled = false;
                finishBtn.classList.remove('disabled');
            }
        } else {
            changeDisp.style.color = "red";
            if (finishBtn) {
                finishBtn.disabled = true;
                finishBtn.classList.add('disabled');
            }
        }
    }
};

window.startCashPayment = () => {
    const mainPane = document.querySelector('.payment-methods-pane:not(#cash-payment-pane)');
    const cashPane = document.getElementById('cash-payment-pane');
    if (mainPane) mainPane.classList.add('hidden');
    if (cashPane) cashPane.classList.remove('hidden');
    window.pressClear();
};

window.showMethods = () => {
    const cashPane = document.getElementById('cash-payment-pane');
    const mainPane = document.querySelector('.payment-methods-pane:not(#cash-payment-pane)');
    if (cashPane) cashPane.classList.add('hidden');
    if (mainPane) mainPane.classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', init);