<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$input = json_decode(file_get_contents('php://input'), true);
$msg = isset($input['message']) ? trim($input['message']) : '';
$history = $input['history'] ?? [];

$system = "You are MediCare AI health assistant. Give safe, general health info in simple words. Never diagnose or prescribe. Always advise to call 112 (India) or local emergency in emergencies. Be concise, helpful.";

$messages = array(array('role'=>'system','content'=>$system));
foreach ($history as $h) {
  if (isset($h['role'],$h['content'])) $messages[] = $h;
}
if ($msg) $messages[] = array('role'=>'user','content'=>$msg);

$apiKey = getenv('OPENAI_API_KEY');
if (!$apiKey) {
  http_response_code(500);
  echo json_encode(array('content'=>'Missing API key. Set OPENAI_API_KEY.'));
  exit;
}

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
  'Content-Type: application/json',
  'Authorization: Bearer '.$apiKey
));
$data = array(
  'model' => 'gpt-4o-mini',
  'messages' => $messages,
  'temperature' => 0.4,
  'max_tokens' => 250
);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$res = curl_exec($ch);
if (curl_errno($ch)) {
  http_response_code(500);
  echo json_encode(array('content'=>'API error.'));
  curl_close($ch);
  exit;
}
curl_close($ch);
$json = json_decode($res, true);
$reply = $json['choices'][0]['message']['content'] ?? 'Sorry, can you rephrase?';
echo json_encode(array('content'=>trim($reply)));
