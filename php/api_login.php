<?php
// api_products.php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// JSON入力を受け取る
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// JS側から送られてくる名前に合わせる（ここでデータを受け取れています！）
$input_id = $data['staff_id'] ?? '';
$input_pass = $data['password'] ?? '';

try {
    // データベースからユーザーを検索
    $stmt = $pdo->prepare("SELECT * FROM staff WHERE staff_number = ?"); 
    $stmt->execute([$input_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // ユーザーが存在し、パスワードが一致するか検証
    if ($user && password_verify($input_pass, $user['password_hash'])) {
        echo json_encode([
            'success' => true, 
            'staff_name' => $user['staff_name']
        ]);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => '社員番号またはパスワードが正しくありません'
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DBエラーが発生しました']);
}