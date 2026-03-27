<?php
$conn = new mysqli('db', 'bbq_user', 'bbq_pass_CHANGE_ME', 'bbq_queue_db');
if ($conn->connect_error) die('Connection failed: ' . $conn->connect_error);

$sql1 = "CREATE TABLE IF NOT EXISTS time_slots (
  slot_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slot_time TIME NOT NULL,
  max_capacity INT UNSIGNED NOT NULL DEFAULT 30,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (slot_id),
  UNIQUE KEY uk_slot_time (slot_time)
)";

$sql2 = "INSERT IGNORE INTO time_slots (slot_time,max_capacity) VALUES
  ('11:00',30),
  ('12:00',30),
  ('13:00',30),
  ('17:00',30),
  ('18:00',30),
  ('19:00',30),
  ('20:00',30)";

$sql3 = "ALTER TABLE queues ADD COLUMN IF NOT EXISTS slot_id INT UNSIGNED DEFAULT NULL AFTER pax_amount";

$conn->query($sql1);
echo "Table created\n";

$conn->query($sql2);
echo "Data inserted\n";

$conn->query($sql3);
echo "Column added\n";

$conn->close();
echo "Migration complete!\n";
