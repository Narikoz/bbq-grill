<?php
// db.php — reads from Docker environment variables
// Falls back gracefully for local XAMPP dev

$host = getenv('DB_HOST')     ?: '127.0.0.1';
$port = (int)(getenv('DB_PORT') ?: 3306);
$name = getenv('DB_NAME')     ?: 'bbq_queue_db';
$user = getenv('DB_USER')     ?: 'bbq_user';
$pass = getenv('DB_PASSWORD') ?: 'bbq_pass';

$conn = new mysqli($host, $user, $pass, $name, $port);

if ($conn->connect_error) {
    http_response_code(503);
    header('Content-Type: application/json');
    die(json_encode([
        'error'  => 'DB connection failed',
        'detail' => $conn->connect_error,
    ]));
}

$conn->set_charset('utf8mb4');
$conn->query("SET time_zone = '+07:00'");
