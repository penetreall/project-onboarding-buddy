<?php
// Ultra-simple test version
$DEBUG = isset($_GET['debug']);

if ($DEBUG) {
    $log = date('Y-m-d H:i:s') . " - Test started\n";
    file_put_contents('test.log', $log, FILE_APPEND);
}

header('Location: https://www.google.com');
exit;
