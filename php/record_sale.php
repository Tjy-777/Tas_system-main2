<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'データが送信されませんでした']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. salesテーブルに保存
    $stmt1 = $pdo->prepare("INSERT INTO sales (payment_method, total_amount) VALUES (?, ?)");
    $stmt1->execute([
        $data['payment_method'],
        $data['total_amount']
    ]);

    $sale_id = $pdo->lastInsertId();

    // 2. sale_detailsテーブルに保存
    // まずバーコードから「本当のitem_id」を見つけるための準備
    $findItem = $pdo->prepare("SELECT item_id FROM items WHERE barcode = ?");
    $stmt2 = $pdo->prepare("INSERT INTO sale_details (sale_id, item_id, quantity, selling_price) VALUES (?, ?, ?, ?)");
    
    foreach ($data['cart'] as $item) {
        // バーコードから本来の数値IDを取得
        $findItem->execute([$item['barcode']]);
        $row = $findItem->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            // もしDBにないバーコードだったらエラーを出す
            throw new Exception("バーコード {$item['barcode']} の商品がitemsテーブルに見つかりません。");
        }

        $real_item_id = $row['item_id']; // これが 1 や 2 などの数値ID

        $stmt2->execute([
            $sale_id,
            $real_item_id, 
            $item['qty'],
            $item['price']
        ]);
    }

    $pdo->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'DBエラー: ' . $e->getMessage()]);
}