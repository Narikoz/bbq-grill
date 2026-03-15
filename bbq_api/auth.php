<?php
// auth.php — session check for PHP staff pages (non-API routes)
if (session_status() === PHP_SESSION_NONE) session_start();
if (empty($_SESSION['emp_id'])) {
    header('Location: /login.php');
    exit;
}
