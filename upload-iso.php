<?php
// upload-iso.php
// Dieses Skript nimmt eine ISO-Datei entgegen und speichert sie im iVentoy ISO-Ordner

// Pfad zum iVentoy ISO-Ordner (bitte ggf. anpassen!)
$isoDir = '/path/to/iventoy/iso'; // <-- ANPASSEN!

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['iso']) || $_FILES['iso']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo 'Fehler beim Upload.';
        exit;
    }
    $file = $_FILES['iso'];
    $filename = basename($file['name']);
    if (strtolower(pathinfo($filename, PATHINFO_EXTENSION)) !== 'iso') {
        http_response_code(400);
        echo 'Nur ISO-Dateien erlaubt!';
        exit;
    }
    // Zielpfad
    $target = rtrim($isoDir, '/').'/'.$filename;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        http_response_code(500);
        echo 'Konnte Datei nicht speichern.';
        exit;
    }
    echo 'Upload erfolgreich!';
    exit;
}
http_response_code(405);
echo 'Nur POST erlaubt.';
