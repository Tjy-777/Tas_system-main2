<?php
// db.php
$host = 'localhost';
$dbname = 'tas_system'; // 作成したデータベース名
$user = 'root';     // MySQLのユーザー名 (XAMPPの初期値はroot)
$pass = '';         // MySQLのパスワード (XAMPPの初期値は空)

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo "データベース接続失敗: " . $e->getMessage();
    exit;
}
?>
