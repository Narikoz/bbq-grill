<?php
$conn = new mysqli(getenv('DB_HOST'), getenv('DB_USER'), getenv('DB_PASSWORD'), getenv('DB_NAME'));
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$result = $conn->query("ALTER TABLE payments DROP INDEX queue_id");
if ($result) {
    echo "Successfully removed UNIQUE constraint from payments.queue_id\n";
} else {
    echo "Error: " . $conn->error . "\n";
}

$conn->close();
