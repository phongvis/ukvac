<!DOCTYPE html>
<meta charset="utf-8">

<?php
    $file = fopen($_POST['fileName'], 'w');
    fwrite($file, $_POST['data']);
    fclose($file);
?>