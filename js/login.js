// js/login.js 決定版
const btnLogin = document.getElementById('btn-login');
const empIdInput = document.getElementById('emp-id');
const empPassInput = document.getElementById('emp-pass');

const login = async () => {
    const id = empIdInput.value;
    const pass = empPassInput.value;

    if (!id || !pass) {
        alert("社員番号とパスワードを入力して下さい");
        return;
    }
    
    try {
        // ↓ここを 'php/api_products.php' に変更します
        const response = await fetch('php/api_login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({staff_id: id, password: pass })
        });

        // サーバーから返ってきた生データをテキストとして一度取得
        const responseText = await response.text();
        
        try {
            // テキストをJSONとして解析
            const result = JSON.parse(responseText);

            if (result.success) {
                localStorage.setItem('pos_clerk_id', id);
                localStorage.setItem('pos_clerk_name', result.staff_name);
                window.location.href = 'Tas.html';
            } else {
                alert(result.message);
            }
        } catch (jsonError) {
            // JSON解析に失敗した場合（PHPがエラー文を返している場合）
            console.error("サーバーからの応答が不正です:", responseText);
            alert("サーバー内部でエラーが起きています。F12キーのコンソールを確認してください。");
        }

    } catch (error) {
        console.error("通信エラーの詳細:", error);
        alert("サーバーに接続できませんでした。");
    }
};

if (btnLogin) btnLogin.addEventListener('click', login);
document.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });