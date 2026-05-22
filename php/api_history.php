<?php
// php/api_history.php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

try {
    // 🌟 FROMのテーブル名を実際の「sale_details」（単数形）に変更しました！
    // 🌟 これで sales と sale_details の両方を参照します
    $stmt = $pdo->query("
        SELECT 
            sd.sale_id,
            s.created_at,
            i.item_name,
            sd.quantity,
            sd.selling_price,
            (sd.quantity * sd.selling_price) AS subtotal,
            s.payment_method
        FROM sale_details sd
        INNER JOIN sales s ON sd.sale_id = s.sale_id
        INNER JOIN items i ON sd.item_id = i.item_id
        ORDER BY sd.sale_id ASC
        LIMIT 50
    ");
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'history' => $history], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'SQLエラー: ' . $e->getMessage()]);
}
?>
