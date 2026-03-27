<?php
$conn = new mysqli(getenv('DB_HOST'), getenv('DB_USER'), getenv('DB_PASSWORD'), getenv('DB_NAME'));
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$result = $conn->query("ALTER TABLE queues ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD' AFTER pax_amount");
if ($result) {
    echo "Successfully added tier column to queues table\n";
} else {
    echo "Error: " . $conn->error . "\n";
}

$conn->close();
