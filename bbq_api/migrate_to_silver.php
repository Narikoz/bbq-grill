<?php
$c = new mysqli(getenv('DB_HOST'), getenv('DB_USER'), getenv('DB_PASSWORD'), getenv('DB_NAME'));
if ($c->connect_error) die('Connect error: ' . $c->connect_error);
$c->query("ALTER TABLE queues MODIFY COLUMN tier VARCHAR(20) NOT NULL DEFAULT 'SILVER'");
$c->query("UPDATE queues SET tier='SILVER' WHERE tier NOT IN ('SILVER','GOLD','PLATINUM')");
echo 'Migrated ' . $c->affected_rows . ' rows. Error: ' . ($c->error ?: 'none') . "\n";
$c->close();
